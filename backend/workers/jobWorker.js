import supabase from '../utils/supabase.js';
import { fetchAllJobs, generateSampleJobs } from '../services/jobSearch.js';
import { matchJobsToUser } from '../services/matching.js';
import { summarizeJobs } from '../services/ai.js';
import { sendNotification } from '../services/notifications.js';
import dotenv from 'dotenv';
dotenv.config();

const USE_SAMPLE_JOBS = process.env.NODE_ENV !== 'production' || !process.env.RAPIDAPI_KEY;

export async function runJobWorker() {
  const startTime = Date.now();
  console.log('[Worker] ──────────── Starting pipeline ────────────');

  // ── Step 1: Fetch jobs ──
  console.log('[Worker] Step 1: Fetching jobs...');
  let jobs;
  try {
    jobs = USE_SAMPLE_JOBS ? generateSampleJobs() : await fetchAllJobs();
  } catch (err) {
    console.error('[Worker] Failed to fetch jobs:', err.message);
    jobs = generateSampleJobs(); // Fallback to sample
  }
  console.log(`[Worker] Fetched ${jobs.length} jobs`);

  if (jobs.length === 0) {
    console.log('[Worker] No jobs found. Exiting.');
    return { jobs: 0, users: 0, notifications: 0 };
  }

  // ── Step 2: Store jobs (filter out null URLs) ──
  console.log('[Worker] Step 2: Storing jobs...');
  let storedCount = 0;
  const validJobs = jobs.filter(j => j.url && j.url.length > 0);

  for (const job of validJobs) {
    try {
      const { error } = await supabase.from('jobs').upsert(
        {
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary,
          description: (job.description || '').slice(0, 600),
          url: job.url,
          source: job.source,
          posted_date: job.posted_date
        },
        { onConflict: 'url', ignoreDuplicates: true }
      );
      if (!error) storedCount++;
      else console.error(`[Worker] Store error for ${job.url}:`, error.message);
    } catch (err) {
      console.error(`[Worker] Store exception:`, err.message);
    }
  }
  console.log(`[Worker] Stored ${storedCount} new jobs`);

  // ── Step 3: Get all users with complete profiles ──
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('*')
    .eq('profile_complete', true);

  if (usersErr) {
    console.error('[Worker] Failed to fetch users:', usersErr.message);
    return { jobs: storedCount, users: 0, notifications: 0 };
  }

  if (!users || users.length === 0) {
    console.log('[Worker] No users with complete profiles. Exiting.');
    return { jobs: storedCount, users: 0, notifications: 0 };
  }
  console.log(`[Worker] Processing ${users.length} users`);

  // ── Step 4: Fetch recent jobs from DB for matching ──
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentJobs, error: jobsErr } = await supabase
    .from('jobs')
    .select('*')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(200);

  if (jobsErr) {
    console.error('[Worker] Failed to fetch recent jobs:', jobsErr.message);
    return { jobs: storedCount, users: users.length, notifications: 0 };
  }

  const jobPool = recentJobs || [];
  console.log(`[Worker] ${jobPool.length} recent jobs in pool`);

  // ── Step 5: Match & Notify each user ──
  let notificationCount = 0;

  for (const user of users) {
    try {
      console.log(`[Worker] Matching for user: ${user.email}`);

      const matches = matchJobsToUser(user, jobPool);
      console.log(`[Worker]   → ${matches.length} matches (score ≥ 70)`);

      if (matches.length === 0) continue;

      // Check if already notified
      const jobIds = matches.map(m => m.job.id).filter(Boolean);
      if (jobIds.length === 0) continue;

      const { data: existing } = await supabase
        .from('matches')
        .select('job_id')
        .eq('user_id', user.id)
        .in('job_id', jobIds)
        .eq('sent', true);

      const alreadySent = new Set((existing || []).map(e => e.job_id));
      const newMatches = matches.filter(m => m.job.id && !alreadySent.has(m.job.id));

      if (newMatches.length === 0) {
        console.log(`[Worker]   → All matches already sent. Skipping.`);
        continue;
      }

      // AI summarization
      console.log(`[Worker]   → Summarizing ${newMatches.length} jobs with AI...`);
      let summaries;
      try {
        const topJobs = newMatches.map(m => m.job);
        const result = await summarizeJobs(topJobs);
        summaries = result.jobs || result;
      } catch (aiErr) {
        console.error(`[Worker]   → AI summarization failed:`, aiErr.message);
        // Fallback: use job descriptions as summaries
        summaries = newMatches.map(m => ({
          title: m.job.title,
          company: m.job.company,
          location: m.job.location,
          salary: m.job.salary || 'Not listed',
          summary: (m.job.description || '').slice(0, 100)
        }));
      }

      // Store matches in DB
      for (let i = 0; i < newMatches.length; i++) {
        try {
          await supabase.from('matches').upsert({
            user_id: user.id,
            job_id: newMatches[i].job.id,
            score: newMatches[i].score,
            ai_summary: summaries[i]?.summary || '',
            sent: true
          }, { onConflict: 'user_id,job_id' });
        } catch (err) {
          console.error(`[Worker]   → Failed to store match:`, err.message);
        }
      }

      // Send notification
      console.log(`[Worker]   → Sending notification...`);
      const result = await sendNotification(user, summaries);

      // Log notification
      try {
        await supabase.from('notification_log').insert({
          user_id: user.id,
          method: user.notification_method || 'email',
          match_count: summaries.length,
          status: result.success ? 'sent' : 'failed',
          error: result.error || null
        });
      } catch (err) {
        console.error(`[Worker]   → Failed to log notification:`, err.message);
      }

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

if (process.argv[1]?.endsWith('jobWorker.js')) {
  runJobWorker()
    .then(r => { console.log('Result:', r); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}
