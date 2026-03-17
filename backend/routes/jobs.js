import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// ── GET RECENT JOBS ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { data, error, count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ jobs: data, total: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ── SEARCH JOBS ──
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, location, remote } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (q) {
      query = query.or(`title.ilike.%${q}%,company.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (remote === 'true') {
      query = query.ilike('location', '%remote%');
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ jobs: data });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── GET JOB BY ID ──
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

export default router;
