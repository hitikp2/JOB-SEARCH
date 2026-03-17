import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// ── AUTO-CREATE TABLE ──
let tableReady = false;
async function ensureTable() {
  if (tableReady) return true;
  const { error } = await supabase.from('saved_jobs').select('id').limit(1);
  if (!error) { tableReady = true; return true; }
  if (error.message?.includes('does not exist') || error.code === '42P01') {
    console.log('[Tracker] saved_jobs table not found - attempting auto-create...');
    const createSQL = `
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'saved',
        notes TEXT,
        applied_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id, status, created_at DESC);
    `;
    const { error: rpcErr } = await supabase.rpc('exec_sql', { query: createSQL }).catch(e => ({ error: e }));
    if (rpcErr) {
      console.log('[Tracker] Auto-create via RPC failed, trying raw query...');
      // Try using the REST endpoint
      try {
        const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: createSQL })
        });
      } catch (e) {
        console.log('[Tracker] Please run sql/migrate_add_saved_jobs.sql in Supabase SQL Editor');
      }
    }
    // Recheck
    const { error: err2 } = await supabase.from('saved_jobs').select('id').limit(1);
    if (!err2) { tableReady = true; return true; }
    console.log('[Tracker] Table still not available. Run: sql/migrate_add_saved_jobs.sql');
    return false;
  }
  return true;
}
ensureTable();

// ── GET TRACKER STATS (must be before /:id) ──
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('status')
      .eq('user_id', req.userId);

    if (error) {
      // Table might not exist yet - return empty stats
      if (error.message?.includes('does not exist')) {
        return res.json({ saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0 });
      }
      throw error;
    }

    const counts = { saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0 };
    (data || []).forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });

    res.json(counts);
  } catch (err) {
    console.error('Tracker stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET ALL SAVED/TRACKED JOBS ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('saved_jobs')
      .select(`
        id, status, notes, applied_date, created_at, updated_at,
        jobs:job_id (id, title, company, location, salary, url, description, posted_date)
      `)
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(100);
    if (error) {
      if (error.message?.includes('does not exist')) return res.json({ saved_jobs: [] });
      throw error;
    }
    res.json({ saved_jobs: data || [] });
  } catch (err) {
    console.error('Tracker fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch tracked jobs' });
  }
});

// ── SAVE/FAVORITE A JOB ──
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { job_id, status = 'saved', notes } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id required' });

    const { data, error } = await supabase
      .from('saved_jobs')
      .upsert({
        user_id: req.userId,
        job_id,
        status,
        notes: notes || null,
        applied_date: status === 'applied' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,job_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ saved_job: data });
  } catch (err) {
    console.error('Tracker save error:', err);
    res.status(500).json({ error: 'Failed to save job' });
  }
});

// ── SUBMIT A USER JOB (link, manual, or photo) ──
router.post('/submit-job', authMiddleware, async (req, res) => {
  try {
    const { title, company, location, salary, description, url, source = 'user_added' } = req.body;

    if (!title) return res.status(400).json({ error: 'Job title is required' });

    // Insert into jobs table
    const jobUrl = url && url.trim() ? url.trim() : `user-added-${Date.now()}`;
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        title,
        company: company || '',
        location: location || '',
        salary: salary || null,
        description: (description || '').slice(0, 600),
        url: jobUrl,
        source,
        posted_date: new Date().toISOString()
      })
      .select()
      .single();

    if (jobErr) throw jobErr;

    // Auto-save to tracker
    const { data: saved, error: saveErr } = await supabase
      .from('saved_jobs')
      .upsert({
        user_id: req.userId,
        job_id: job.id,
        status: 'saved',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,job_id' })
      .select()
      .single();

    if (saveErr) throw saveErr;

    res.json({ job, saved_job: saved });
  } catch (err) {
    console.error('Job submit error:', err);
    res.status(500).json({ error: 'Failed to submit job' });
  }
});

// ── EXTRACT JOB FROM PHOTO ──
router.post('/extract-photo', authMiddleware, async (req, res) => {
  try {
    const { extractTextFromImage } = await import('../services/ai.js');
    const { image_data, mime_type } = req.body;
    if (!image_data) return res.status(400).json({ error: 'image_data required' });

    const text = await extractTextFromImage(image_data, mime_type || 'image/jpeg');

    let jobData = { title: '', company: '', location: '', salary: '', description: text.slice(0, 600), url: '' };
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) jobData.title = lines[0].slice(0, 100);
    if (lines.length > 1) jobData.company = lines[1].slice(0, 100);

    res.json({ extracted: jobData, raw_text: text.slice(0, 1000) });
  } catch (err) {
    console.error('Photo extract error:', err);
    res.status(500).json({ error: 'Failed to extract from photo' });
  }
});

// ── UPDATE TRACKER STATUS ──
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (status) {
      updates.status = status;
      if (status === 'applied' && !req.body.applied_date) {
        updates.applied_date = new Date().toISOString();
      }
    }
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('saved_jobs')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ saved_job: data });
  } catch (err) {
    console.error('Tracker update error:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// ── DELETE FROM TRACKER ──
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove' });
  }
});

export default router;
