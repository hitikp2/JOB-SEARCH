import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

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
    if (error) throw error;
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

// ── SUBMIT A USER JOB (link, manual, or photo) ──
router.post('/submit-job', authMiddleware, async (req, res) => {
  try {
    const { title, company, location, salary, description, url, source = 'user_added' } = req.body;

    if (!title) return res.status(400).json({ error: 'Job title is required' });

    // Insert into jobs table
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .upsert({
        title,
        company: company || '',
        location: location || '',
        salary: salary || null,
        description: (description || '').slice(0, 600),
        url: url || `user-added-${Date.now()}`,
        source,
        posted_date: new Date().toISOString()
      }, { onConflict: 'url', ignoreDuplicates: false })
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

// ── GET TRACKER STATS ──
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('status')
      .eq('user_id', req.userId);

    if (error) throw error;

    const counts = { saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0 };
    (data || []).forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });

    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
