import supabase from '../utils/supabase.js';
import { fetchAllJobs, generateSampleJobs } from '../services/jobSearch.js';
import { matchJobsToUser } from '../services/matching.js';
import { summarizeJobs } from '../services/ai.js';
import { sendNotification } from '../services/notifications.js';
import dotenv from 'dotenv';
dotenv.config();

const USE_SAMPLE_JOBS = process.env.NODE_ENV !== 'production' || !process.env.RAPIDAPI_KEY;

/**
 * Main worker pipeline:
 * 1. Fetch new jobs
 * 2. Store in database
 * 3. Match jobs to each user
 * 4. AI summarize top matches
 * 5. Send notifications
 */
export async function runJobWorker() {
  const startTime = Date.now();
  console.log('[Worker] ──────────── Starting pipeline ────────────');

  // ── Step 1: Fetch jobs ──
  console.log('[Worker] Step 1: Fetching jobs...');
  const jobs = USE_SAMPLE_JOBS ? generateSampleJobs() : await fetchAllJobs();
  console.log(`[Worker] Fetched ${jobs.length} jobs`);

  if (jobs.length === 0) {
    console.log('[Worker] No jobs found. Exiting.');
    return { jobs: 0, users: 0, notifications: 0 };
  }

  // ── Step 2: Store jobs ──
  console.log('[Worker] Step 2: Storing jobs...');
  let storedCount = 0;
  for (const job of jobs) {
    const { error } = await supabase.from('jobs').upsert(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        description: job.description,
        url: job.url,
        source: job.source,
        posted_date: job.posted_date
      },
      { onConflict: 'url', ignoreDuplicates: true }
    );
    if (!error) storedCount++;
  }
  console.log(`[Worker] Stored ${storedCount} new jobs`);

  // ── Step 3: Get all users with complete profiles ──
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('*')
    .eq('profile_complete', true);

  if (usersErr || !users || users.length === 0) {
    console.log('[Worker] No users with complete profiles. Exiting.');
    return { jobs: storedCount, users: 0, notifications: 0 };
  }
  console.log(`[Worker] Processing ${users.length} users`);

  // ── Step 4: Fetch recent jobs from DB for matching ──
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentJobs } = await supabase
    .from('jobs')
    .select('*')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(200);

  const jobPool = recentJobs || [];
  console.log(`[Worker] ${jobPool.length} recent jobs in pool`);

  // ── Step 5: Match & Notify each user ──
  let notificationCount = 0;

  for (const user of users) {
    try {
      console.log(`[Worker] Matching for user: ${user.email}`);

      // Match using algorithm (no AI)
      const matches = matchJobsToUser(user, jobPool);
      console.log(`[Worker]   → ${matches.length} matches (score ≥ 70)`);

      if (matches.length === 0) continue;

      // Check if we already notified about these jobs today
      const jobIds = matches.map(m => m.job.id);
      const { data: existing } = await supabase
        .from('matches')
        .select('job_id')
        .eq('user_id', user.id)
        .in('job_id', jobIds)
        .eq('sent', true);

      const alreadySent = new Set((existing || []).map(e => e.job_id));
      const newMatches = matches.filter(m => !alreadySent.has(m.job.id));

      if (newMatches.length === 0) {
        console.log(`[Worker]   → All matches already sent. Skipping.`);
        continue;
      }

      // AI summarization (only for new matches, 3-5 jobs max)
      console.log(`[Worker]   → Summarizing ${newMatches.length} jobs with AI...`);
      const topJobs = newMatches.map(m => m.job);
      const { jobs: summaries } = await summarizeJobs(topJobs);

      // Store matches in DB
      for (let i = 0; i < newMatches.length; i++) {
        await supabase.from('matches').upsert({
          user_id: user.id,
          job_id: newMatches[i].job.id,
          score: newMatches[i].score,
          ai_summary: summaries[i]?.summary || '',
          sent: true
        }, { onConflict: 'user_id,job_id' });
      }

      // Send notification
      console.log(`[Worker]   → Sending notification...`);
      const result = await sendNotification(user, summaries);

      // Log notification
      await supabase.from('notification_log').insert({
        user_id: user.id,
        method: user.notification_method || 'email',
        match_count: summaries.length,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null
      });

      if (result.success) notificationCount++;

    } catch (err) {
      console.error(`[Worker] Error for user ${user.email}:`, err.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Worker] ──────────── Complete ────────────`);
  console.log(`[Worker] Jobs: ${storedCount} | Users: ${users.length} | Sent: ${notificationCount} | Time: ${elapsed}s`);

  return {
    jobs: storedCount,
    users: users.length,
    notifications: notificationCount,
    elapsed: `${elapsed}s`
  };
}

// Allow direct execution: node workers/jobWorker.js
if (process.argv[1]?.endsWith('jobWorker.js')) {
  runJobWorker()
    .then(r => { console.log('Result:', r); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
