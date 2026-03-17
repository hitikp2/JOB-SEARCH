import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';
import { generateInsights } from '../services/ai.js';

const router = Router();

// ── LOG USER EXPERIENCE / FEEDBACK ──
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { match_id, action, rating, feedback_text, metadata } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const validActions = ['view', 'apply_click', 'dismiss', 'feedback', 'test_run'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Use: ${validActions.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('user_experience')
      .insert({
        user_id: req.userId,
        match_id: match_id || null,
        action,
        rating: rating || null,
        feedback_text: feedback_text || null,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Experience logged', experience: data });
  } catch (err) {
    console.error('Experience log error:', err);
    res.status(500).json({ error: 'Failed to log experience' });
  }
});

// ── GET USER EXPERIENCE HISTORY ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error, count } = await supabase
      .from('user_experience')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    res.json({ experiences: data || [], total: count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch experience data' });
  }
});

// ── GET AI INSIGHTS ──
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    // Check for cached recent insights (within last 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', req.userId)
      .gte('created_at', sixHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return res.json({ insights: cached.insights, cached: true, created_at: cached.created_at });
    }

    // Fetch user profile + recent matches + experience data for context
    const [profileRes, matchesRes, experienceRes] = await Promise.all([
      supabase.from('users')
        .select('primary_roles, skills, seniority_level, years_experience, industries, preferred_locations, remote_preference, salary_expectation')
        .eq('id', req.userId).single(),
      supabase.from('matches')
        .select('score, ai_summary, created_at, jobs(title, company, location, salary)')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('user_experience')
        .select('action, rating, feedback_text, created_at')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    const profile = profileRes.data;
    const matches = matchesRes.data || [];
    const experiences = experienceRes.data || [];

    const insights = await generateInsights(profile, matches, experiences);

    // Cache insights
    await supabase.from('ai_insights').insert({
      user_id: req.userId,
      insights
    });

    res.json({ insights, cached: false, created_at: new Date().toISOString() });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
