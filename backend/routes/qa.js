import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';
import { answerApplicationQuestions } from '../services/ai.js';

const router = Router();

// ── ANSWER JOB APPLICATION QUESTIONS ──
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { questions, job_description } = req.body;

    if (!questions || questions.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide application questions (min 10 characters)' });
    }

    // Get user's saved resume
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('resume_text, primary_roles, skills, seniority_level, years_experience, industries, salary_expectation')
      .eq('id', req.userId)
      .single();

    if (userError) throw userError;

    if (!user.resume_text || user.resume_text.length < 50) {
      return res.status(400).json({ error: 'No resume found. Please upload your resume first.' });
    }

    console.log(`[QA] Answering questions for user ${req.userId}`);
    const answers = await answerApplicationQuestions(user.resume_text, questions, job_description || '');

    // Save Q&A to history
    await supabase.from('qa_history').insert({
      user_id: req.userId,
      questions: questions.slice(0, 5000),
      job_description: (job_description || '').slice(0, 3000),
      answers: answers.slice(0, 10000),
    }).catch(err => console.error('[QA] Failed to save history:', err.message));

    res.json({ answers });
  } catch (err) {
    console.error('[QA] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate answers. Please try again.' });
  }
});

// ── GET Q&A HISTORY ──
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('qa_history')
      .select('id, questions, job_description, answers, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ history: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
