import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import jobRoutes from './routes/jobs.js';
import matchRoutes from './routes/matches.js';
import { runJobWorker } from './workers/jobWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matches', matchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Manual worker trigger (admin only, protect in production)
app.post('/api/admin/run-worker', async (req, res) => {
  try {
    await runJobWorker();
    res.json({ success: true, message: 'Worker completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CRON SCHEDULE: 3x daily at 08:00, 13:00, 18:00 UTC
// ============================================
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
  console.log(`Job Agent API running on port ${PORT}`);
  console.log(`Cron scheduled: 08:00, 13:00, 18:00 UTC`);
});

export default app;
