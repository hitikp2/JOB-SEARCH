import dotenv from 'dotenv';
dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_HOST = 'jsearch.p.rapidapi.com';

// ── Supported job board sources ──
const SOURCES = {
  jsearch:    { name: 'JSearch (Multi-source)',  enabled: true },
  indeed:     { name: 'Indeed',                  employer_filter: 'indeed.com' },
  ziprecruiter: { name: 'ZipRecruiter',          employer_filter: 'ziprecruiter.com' },
  glassdoor:  { name: 'Glassdoor',               employer_filter: 'glassdoor.com' },
  monster:    { name: 'Monster',                  employer_filter: 'monster.com' },
  linkedin:   { name: 'LinkedIn',                employer_filter: 'linkedin.com' },
  company_sites: { name: 'Company Websites',     employer_filter: null },
};

export { SOURCES };

/**
 * Fetch jobs from JSearch API (RapidAPI)
 * Supports filters: employment_type, remote, radius
 */
async function searchJobs(query, page = 1, filters = {}) {
  try {
    const url = new URL('https://jsearch.p.rapidapi.com/search');
    url.searchParams.set('query', query);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('num_pages', '1');
    url.searchParams.set('date_posted', 'today');

    // Employment type filter
    if (filters.employment_type && filters.employment_type !== 'any') {
      url.searchParams.set('employment_types', filters.employment_type);
    }

    // Remote filter
    if (filters.remote_only) {
      url.searchParams.set('remote_jobs_only', 'true');
    }

    // Radius filter (miles)
    if (filters.radius && filters.radius > 0) {
      url.searchParams.set('radius', filters.radius.toString());
    }

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
    let jobs = (data.data || []).map(normalizeJob);

    // Filter by specific source/employer if requested
    if (filters.source_filter) {
      jobs = jobs.filter(j =>
        (j.source_domain || '').includes(filters.source_filter) ||
        (j.url || '').includes(filters.source_filter)
      );
    }

    return jobs;
  } catch (err) {
    console.error(`Failed to search "${query}":`, err.message);
    return [];
  }
}

function normalizeJob(raw) {
  const applyLink = raw.job_apply_link || raw.job_google_link || '';
  let sourceDomain = '';
  try { sourceDomain = new URL(applyLink).hostname; } catch(e) {}

  return {
    title: raw.job_title || '',
    company: raw.employer_name || '',
    location: raw.job_city
      ? `${raw.job_city}, ${raw.job_state || ''} ${raw.job_country || ''}`.trim()
      : raw.job_is_remote ? 'Remote' : 'Unknown',
    salary: formatSalary(raw),
    description: (raw.job_description || '').slice(0, 600),
    url: applyLink,
    source: raw.job_publisher || 'jsearch',
    source_domain: sourceDomain,
    remote: raw.job_is_remote || false,
    employment_type: raw.job_employment_type || '',
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
 * Combines roles, skills, industries, location preferences, and filters.
 * Uses the user's full saved preferences for targeted searches.
 * Deduplicates and limits to avoid API overuse.
 */
export function buildSearchQueries(users) {
  const querySet = new Set();

  for (const user of users) {
    const roles = user.primary_roles || [];
    const locations = user.preferred_locations || [];
    const skills = user.skills || [];
    const industries = user.industries || [];
    const locType = user.location_type || 'any';
    const remoteOk = locType === 'remote' || ['remote', 'flexible'].includes(user.remote_preference);
    const schedule = user.work_schedule || 'full_time';
    const seniority = user.seniority_level || '';

    // Schedule suffix for queries
    const schedSuffix = schedule === 'part_time' ? ' part time' : schedule === 'contract' ? ' contract' : schedule === 'internship' ? ' internship' : '';

    // Seniority prefix (only for non-generic levels)
    const seniorityPrefix = ['senior', 'lead', 'junior'].includes(seniority) ? `${seniority} ` : '';

    // ── Role-based queries (primary) ──
    for (const role of roles.slice(0, 3)) {
      const roleQuery = role.toLowerCase().includes(seniority) ? role : `${seniorityPrefix}${role}`;

      if (locType === 'remote' || remoteOk) {
        querySet.add(`${roleQuery} remote${schedSuffix}`);
      }

      if (locType !== 'remote') {
        for (const loc of locations.slice(0, 2)) {
          querySet.add(`${roleQuery} ${loc}${schedSuffix}`);
        }
      }

      if (locations.length === 0 && !remoteOk) {
        querySet.add(`${roleQuery}${schedSuffix}`);
      }
    }

    // ── Skill-augmented queries (for more targeted results) ──
    // Use top 2 skills combined with first role for precision
    const topSkills = skills.slice(0, 2);
    const primaryRole = roles[0] || '';
    if (primaryRole && topSkills.length > 0) {
      const skillStr = topSkills.join(' ');
      if (remoteOk) {
        querySet.add(`${primaryRole} ${skillStr} remote`);
      } else if (locations.length > 0) {
        querySet.add(`${primaryRole} ${skillStr} ${locations[0]}`);
      } else {
        querySet.add(`${primaryRole} ${skillStr}`);
      }
    }

    // ── Industry-specific queries (broaden reach) ──
    // Combine top industry with first role for industry-targeted results
    if (industries.length > 0 && primaryRole) {
      const topIndustry = industries[0];
      querySet.add(`${primaryRole} ${topIndustry}${remoteOk ? ' remote' : ''}`);
    }
  }

  const queries = Array.from(querySet).slice(0, 18);
  console.log(`[JobSearch] Built ${queries.length} search queries from ${users.length} user profiles`);
  console.log(`[JobSearch] Queries: ${queries.join(' | ')}`);
  return queries;
}

/**
 * Build API filter object from user preferences.
 */
function buildFilters(user) {
  const filters = {};
  const locType = user.location_type || 'any';
  const schedule = user.work_schedule || 'full_time';

  // Employment type mapping
  const typeMap = { full_time: 'FULLTIME', part_time: 'PARTTIME', contract: 'CONTRACTOR', internship: 'INTERN' };
  if (typeMap[schedule]) filters.employment_type = typeMap[schedule];

  // Remote filter
  if (locType === 'remote') filters.remote_only = true;

  // Radius for local/hybrid
  if ((locType === 'local' || locType === 'hybrid') && user.search_radius) {
    filters.radius = user.search_radius;
  }

  return filters;
}

/**
 * Fetch all jobs using dynamically built queries.
 * Respects user source preferences and filters.
 * Deduplicates by URL.
 */
export async function fetchJobsForUsers(users) {
  const queries = buildSearchQueries(users);

  if (queries.length === 0) {
    console.log('[JobSearch] No search queries generated. Check user profiles.');
    return [];
  }

  // Get filters from first user (single-user system for now)
  const filters = users.length > 0 ? buildFilters(users[0]) : {};

  // Get source preferences
  const user = users[0] || {};
  const sources = user.job_sources || ['jsearch'];

  console.log(`[JobSearch] Searching: ${queries.join(' | ')} | Filters: ${JSON.stringify(filters)} | Sources: ${sources}`);

  const allJobs = [];
  const seenUrls = new Set();

  for (const query of queries) {
    // If user selected specific sources (not jsearch-all), search with each source filter
    if (sources.length > 0 && !sources.includes('jsearch')) {
      for (const src of sources) {
        const srcInfo = SOURCES[src];
        const srcFilters = { ...filters };
        if (srcInfo?.employer_filter) {
          srcFilters.source_filter = srcInfo.employer_filter;
        }
        const jobs = await searchJobs(query, 1, srcFilters);
        for (const job of jobs) {
          if (job.url && !seenUrls.has(job.url)) {
            seenUrls.add(job.url);
            allJobs.push(job);
          }
        }
        await new Promise(r => setTimeout(r, 300));
      }
    } else {
      // Default: search all sources via JSearch
      const jobs = await searchJobs(query, 1, filters);
      for (const job of jobs) {
        if (job.url && !seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          allJobs.push(job);
        }
      }
    }
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
