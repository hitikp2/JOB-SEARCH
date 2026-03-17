import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// ── GET USER'S MATCHES ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const { data, error } = await supabase
      .from('matches')
      .select(`
        id, score, ai_summary, sent, created_at,
        jobs:job_id (id, title, company, location, salary, url, posted_date)
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ matches: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ── GET MATCH STATS ──
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Total matches
    const { count: totalMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    // Today's matches
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .gte('created_at', today.toISOString());

    // Notifications sent
    const { count: notifications } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('status', 'sent');

    // Average match score
    const { data: scores } = await supabase
      .from('matches')
      .select('score')
      .eq('user_id', req.userId)
      .limit(50);

    const avgScore = scores && scores.length > 0
      ? Math.round(scores.reduce((s, m) => s + m.score, 0) / scores.length)
      : 0;

    res.json({
      total_matches: totalMatches || 0,
      today_matches: todayMatches || 0,
      notifications_sent: notifications || 0,
      avg_score: avgScore
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
