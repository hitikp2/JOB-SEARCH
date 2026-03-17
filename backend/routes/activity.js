import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// ── LOG USER ACTIVITY ──
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { action, metadata = {} } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const { error } = await supabase.from('user_activity').insert({
      user_id: req.userId,
      action,
      metadata,
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Activity] Error:', err.message);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// ── GET USER ACTIVITY HISTORY ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const { data, error } = await supabase
      .from('user_activity')
      .select('id, action, metadata, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ activity: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ── GET USER EXPERIENCE SUMMARY ──
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('action, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const activities = data || [];
    const summary = {
      total_actions: activities.length,
      first_seen: activities.length > 0 ? activities[activities.length - 1].created_at : null,
      last_seen: activities.length > 0 ? activities[0].created_at : null,
      actions_breakdown: {},
    };

    for (const a of activities) {
      summary.actions_breakdown[a.action] = (summary.actions_breakdown[a.action] || 0) + 1;
    }

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

export default router;
