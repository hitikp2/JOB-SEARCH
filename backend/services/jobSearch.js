import dotenv from 'dotenv';
dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_HOST = 'jsearch.p.rapidapi.com';

/**
 * Fetch jobs from JSearch API (RapidAPI)
 * Filters to last 24 hours only
 */
async function searchJobs(query, page = 1) {
  try {
    const url = new URL('https://jsearch.p.rapidapi.com/search');
    url.searchParams.set('query', query);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('num_pages', '1');
    url.searchParams.set('date_posted', 'today');

    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': JSEARCH_HOST
      }
    });

    if (!response.ok) {
      console.error(`JSearch API error for "${query}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map(normalizeJob);
  } catch (err) {
    console.error(`Failed to search "${query}":`, err.message);
    return [];
  }
}

function normalizeJob(raw) {
  return {
    title: raw.job_title || '',
    company: raw.employer_name || '',
    location: raw.job_city
      ? `${raw.job_city}, ${raw.job_state || ''} ${raw.job_country || ''}`.trim()
      : raw.job_is_remote ? 'Remote' : 'Unknown',
    salary: formatSalary(raw),
    description: (raw.job_description || '').slice(0, 600),
    url: raw.job_apply_link || raw.job_google_link || '',
    source: 'jsearch',
    posted_date: raw.job_posted_at_datetime_utc || new Date().toISOString()
  };
}

function formatSalary(raw) {
  if (raw.job_min_salary && raw.job_max_salary) {
    const min = Math.round(raw.job_min_salary / 1000);
    const max = Math.round(raw.job_max_salary / 1000);
    return `$${min}k–$${max}k`;
  }
  if (raw.job_min_salary) return `$${Math.round(raw.job_min_salary / 1000)}k+`;
  return null;
}

/**
 * Build search queries dynamically from ALL user profiles.
 * Combines roles, top skills, and location preferences.
 * Deduplicates and limits to avoid API overuse.
 */
export function buildSearchQueries(users) {
  const querySet = new Set();

  for (const user of users) {
    const roles = user.primary_roles || [];
    const locations = user.preferred_locations || [];
    const remoteOk = ['remote', 'flexible'].includes(user.remote_preference);

    // Build queries from each role
    for (const role of roles.slice(0, 3)) {
      // Role + remote
      if (remoteOk) {
        querySet.add(`${role} remote`);
      }

      // Role + each preferred location
      for (const loc of locations.slice(0, 2)) {
        querySet.add(`${role} ${loc}`);
      }

      // If no location preference and not remote, just search the role
      if (locations.length === 0 && !remoteOk) {
        querySet.add(role);
      }
    }
  }

  // Cap at 15 queries to control API costs (free tier = 500/month)
  const queries = Array.from(querySet).slice(0, 15);
  console.log(`[JobSearch] Built ${queries.length} search queries from ${users.length} user profiles`);
  return queries;
}

/**
 * Fetch all jobs using dynamically built queries.
 * Deduplicates by URL.
 */
export async function fetchJobsForUsers(users) {
  const queries = buildSearchQueries(users);

  if (queries.length === 0) {
    console.log('[JobSearch] No search queries generated. Check user profiles.');
    return [];
  }

  console.log(`[JobSearch] Searching: ${queries.join(' | ')}`);

  const allJobs = [];
  const seenUrls = new Set();

  for (const query of queries) {
    const jobs = await searchJobs(query);
    for (const job of jobs) {
      if (job.url && !seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        allJobs.push(job);
      }
    }
    // Rate limit between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[JobSearch] Found ${allJobs.length} unique jobs from ${queries.length} searches`);
  return allJobs;
}

/**
 * Legacy: fetch with static clusters (fallback)
 */
export async function fetchAllJobs() {
  const FALLBACK_CLUSTERS = [
    'software engineer remote',
    'web developer remote',
    'data analyst remote',
    'project manager remote'
  ];

  console.log(`[JobSearch] Using fallback clusters...`);
  const allJobs = [];
  const seenUrls = new Set();

  for (const query of FALLBACK_CLUSTERS) {
    const jobs = await searchJobs(query);
    for (const job of jobs) {
      if (job.url && !seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        allJobs.push(job);
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[JobSearch] Found ${allJobs.length} unique jobs`);
  return allJobs;
}

/**
 * Sample jobs for dev/testing
 */
export function generateSampleJobs() {
  return [
    { title: 'Senior Frontend Developer', company: 'TechCo', location: 'Remote', salary: '$120k–$160k', description: 'Build modern web apps with React, TypeScript, and Node.js. Design system experience preferred.', url: 'https://example.com/job/fe-1', source: 'sample', posted_date: new Date().toISOString() },
    { title: 'Full Stack Engineer', company: 'StartupAI', location: 'Remote', salary: '$130k–$170k', description: 'Python, React, PostgreSQL. Building AI-powered SaaS platform. AWS experience required.', url: 'https://example.com/job/fs-1', source: 'sample', posted_date: new Date().toISOString() },
    { title: 'Backend Engineer', company: 'FinanceOS', location: 'San Francisco, CA', salary: '$150k–$190k', description: 'Node.js, PostgreSQL, Redis. Build scalable fintech APIs. Microservices architecture.', url: 'https://example.com/job/be-1', source: 'sample', posted_date: new Date().toISOString() },
    { title: 'Data Analyst', company: 'HealthMetrics', location: 'Remote', salary: '$95k–$120k', description: 'SQL, Python, Looker. Healthcare analytics dashboards. Support clinical operations team.', url: 'https://example.com/job/da-1', source: 'sample', posted_date: new Date().toISOString() },
    { title: 'Product Manager', company: 'ScaleUp', location: 'Remote', salary: '$140k–$175k', description: 'B2B SaaS product strategy. Work with engineering and design. Agile experience required.', url: 'https://example.com/job/pm-1', source: 'sample', posted_date: new Date().toISOString() },
  ];
}
