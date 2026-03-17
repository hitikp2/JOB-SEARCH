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
import { runJobWorker } from './workers/jobWorker.js';

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/admin/run-worker', async (req, res) => {
  try {
    const result = await runJobWorker();
    res.json({ success: true, message: 'Worker completed', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
