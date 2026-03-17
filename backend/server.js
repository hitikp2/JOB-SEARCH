import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import jobRoutes from './routes/jobs.js';
import matchRoutes from './routes/matches.js';
import experienceRoutes from './routes/experience.js';
import trackerRoutes from './routes/tracker.js';
import { runJobWorker, runQuickScan, runAIAnalysis } from './workers/jobWorker.js';
import { sendNotification } from './services/notifications.js';
import { extractResumeProfile, extractTextFromImage } from './services/ai.js';
import supabase from './utils/supabase.js';
import { authMiddleware } from './utils/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.up.railway.app')) return callback(null, true);
    if (origin.includes('localhost')) return callback(null, true);
    callback(null, true); // Allow all since frontend is same server
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/tracker', trackerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/admin/run-worker', async (req, res) => {
  try {
    const mode = req.body?.mode || 'full';
    let result;
    if (mode === 'quick') {
      result = await runQuickScan();
    } else if (mode === 'ai') {
      result = await runAIAnalysis();
    } else {
      result = await runJobWorker();
    }
    res.json({ success: true, message: 'Worker completed', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SMS TEST ──
app.post('/api/admin/test-sms', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', req.userId).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    if (!user.phone) return res.status(400).json({ error: 'No phone number on file. Update your profile first.' });

    const testSummaries = [{
      title: 'Test Job Alert',
      company: 'Job Agent',
      location: 'Your Phone',
      salary: 'N/A',
      summary: 'This is a test notification from Job Agent. If you received this, SMS alerts are working!'
    }];
    const result = await sendNotification({ ...user, notification_method: 'sms' }, testSummaries);
    if (result.success) {
      res.json({ success: true, message: `Test SMS sent to ${user.phone}` });
    } else {
      res.status(500).json({ error: result.error || 'SMS failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXTRACT JOB FROM PHOTO ──
app.post('/api/tracker/extract-photo', authMiddleware, async (req, res) => {
  try {
    const { image_data, mime_type } = req.body;
    if (!image_data) return res.status(400).json({ error: 'image_data required' });

    const text = await extractTextFromImage(image_data, mime_type || 'image/jpeg');

    const { callAI } = await import('./services/ai.js');
    const systemPrompt = `Extract job posting details from this text. Return ONLY valid JSON:
{"title":"","company":"","location":"","salary":"","description":"","url":""}
If a field is not found, use empty string. For description, summarize in 1-2 sentences.`;

    let jobData;
    try {
      const aiModule = await import('./services/ai.js');
      // Use the AI to parse the extracted text
      jobData = { title: '', company: '', location: '', salary: '', description: text.slice(0, 600), url: '' };
      // Try to extract structured data from the text
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 0) jobData.title = lines[0].slice(0, 100);
      if (lines.length > 1) jobData.company = lines[1].slice(0, 100);
    } catch (e) {
      jobData = { title: 'Extracted Job', company: '', location: '', salary: '', description: text.slice(0, 600), url: '' };
    }

    res.json({ extracted: jobData, raw_text: text.slice(0, 1000) });
  } catch (err) {
    console.error('Photo extract error:', err);
    res.status(500).json({ error: 'Failed to extract from photo' });
  }
});

// ── Serve Frontend (static files from public/) ──
app.use(express.static(path.join(__dirname, 'public')));

// Any non-API route serves the frontend
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── CRON ──
cron.schedule('0 8,13,18 * * *', async () => {
  console.log(`[CRON] Starting job worker at ${new Date().toISOString()}`);
  try {
    await runJobWorker();
    console.log('[CRON] Worker completed successfully');
  } catch (err) {
    console.error('[CRON] Worker failed:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Job Agent running on port ${PORT}`);
  console.log(`API: /api/*  |  Frontend: /*`);
  console.log(`Cron scheduled: 08:00, 13:00, 18:00 UTC`);
});

export default app;
