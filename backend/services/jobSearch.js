import dotenv from 'dotenv';
dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_HOST = 'jsearch.p.rapidapi.com';

// ============================================
// SEARCH CLUSTERS – configurable job searches
// ============================================
const SEARCH_CLUSTERS = [
  'software engineer remote',
  'product manager remote',
  'data analyst remote',
  'marketing manager remote',
  'UX designer remote',
  'data engineer remote',
  'devops engineer remote',
  'project manager remote'
];

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
    url.searchParams.set('date_posted', 'today'); // Last 24 hours

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

/**
 * Normalize JSearch API response to our schema
 */
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
 * Build search queries from a user's profile
 * Combines roles with location/remote preference for targeted searches
 */
export function buildUserSearchQueries(user) {
  const roles = (user.primary_roles || []).slice(0, 5);
  if (roles.length === 0) return SEARCH_CLUSTERS; // Fallback to defaults

  const queries = [];
  const remotePref = user.remote_preference || 'remote';
  const locations = (user.preferred_locations || []).slice(0, 3);

  for (const role of roles) {
    if (remotePref === 'remote' || remotePref === 'flexible' || locations.length === 0) {
      queries.push(`${role} remote`);
    }
    if (remotePref !== 'remote' && locations.length > 0) {
      // Add location-specific queries for non-remote users
      for (const loc of locations) {
        queries.push(`${role} ${loc}`);
      }
    }
  }

  // Deduplicate queries
  return [...new Set(queries)].slice(0, 10);
}

/**
 * Fetch all jobs across all search clusters
 * Deduplicates by URL
 */
export async function fetchAllJobs() {
  console.log(`[JobSearch] Fetching from ${SEARCH_CLUSTERS.length} default clusters...`);
  return fetchJobsByQueries(SEARCH_CLUSTERS);
}

/**
 * Fetch jobs for a specific user based on their profile
 */
export async function fetchJobsForUser(user) {
  const queries = buildUserSearchQueries(user);
  console.log(`[JobSearch] Fetching for user ${user.email}: ${queries.length} queries → ${queries.join(' | ')}`);
  return fetchJobsByQueries(queries);
}

/**
 * Fetch jobs using a list of search queries
 * Deduplicates by URL
 */
async function fetchJobsByQueries(queries) {
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
    // Rate limit: small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[JobSearch] Found ${allJobs.length} unique jobs`);
  return allJobs;
}

/**
 * For development/testing: generate sample jobs
 */
export function generateSampleJobs() {
  return [
    {
      title: 'Senior Backend Engineer',
      company: 'TechFlow AI',
      location: 'Remote',
      salary: '$140k–$180k',
      description: 'Building scalable AI infrastructure with Python, FastAPI, and AWS. Experience with LLMs and vector databases preferred. Team of 12 engineers.',
      url: 'https://example.com/job/1',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'Product Manager – Platform',
      company: 'FinanceOS',
      location: 'San Francisco, CA',
      salary: '$155k–$185k',
      description: 'Lead product strategy for our core fintech platform. SaaS B2B experience required. Work closely with engineering and design to ship quarterly releases.',
      url: 'https://example.com/job/2',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'Data Analyst',
      company: 'HealthMetrics',
      location: 'Remote',
      salary: '$95k–$120k',
      description: 'Analyze healthcare data using SQL and Python. Build dashboards in Looker. Support clinical operations team with data-driven insights.',
      url: 'https://example.com/job/3',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'Full Stack Developer',
      company: 'CreatorStack',
      location: 'Austin, TX',
      salary: '$130k–$160k',
      description: 'React, Node.js, PostgreSQL. Building tools for content creators. Remote-friendly with Austin HQ. Series A startup, fast-paced environment.',
      url: 'https://example.com/job/4',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'Marketing Manager – Growth',
      company: 'ScaleUp',
      location: 'Remote',
      salary: '$110k–$140k',
      description: 'Own growth marketing strategy including paid acquisition, SEO, and content. Experience with B2B SaaS required. HubSpot and analytics tools.',
      url: 'https://example.com/job/5',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'DevOps Engineer',
      company: 'CloudNine',
      location: 'Remote',
      salary: '$135k–$165k',
      description: 'Kubernetes, Terraform, CI/CD pipelines. AWS or GCP experience required. On-call rotation with team of 6. Infrastructure as code focus.',
      url: 'https://example.com/job/6',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'UX Designer – Mobile',
      company: 'AppWorks',
      location: 'New York, NY',
      salary: '$120k–$150k',
      description: 'Design mobile experiences for iOS and Android. Figma proficiency required. User research and prototyping. Consumer fintech product.',
      url: 'https://example.com/job/7',
      source: 'sample',
      posted_date: new Date().toISOString()
    },
    {
      title: 'Data Engineer',
      company: 'Analytiq',
      location: 'Remote',
      salary: '$140k–$170k',
      description: 'Build data pipelines with Spark, Airflow, and dbt. Strong SQL required. Support analytics and ML teams. Modern data stack environment.',
      url: 'https://example.com/job/8',
      source: 'sample',
      posted_date: new Date().toISOString()
    }
  ];
}
