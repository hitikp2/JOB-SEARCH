/**
 * Job Matching Algorithm (No AI)
 * Scores each job against a user's profile using rule-based logic.
 * Returns only matches scoring above threshold.
 */

const SCORE_THRESHOLD = 50;
const MAX_MATCHES_PER_USER = 5;

/**
 * Score a single job against a user profile
 */
export function scoreJob(user, job) {
  let score = 0;
  const titleLower = (job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const locationLower = (job.location || '').toLowerCase();

  // ── Role match (50 points) ──
  const roles = (user.primary_roles || []).map(r => r.toLowerCase());
  for (const role of roles) {
    // Check if any word sequence from the role appears in the title
    const roleWords = role.split(/\s+/);
    const titleMatch = roleWords.every(w => titleLower.includes(w));
    if (titleMatch) {
      score += 50;
      break;
    }
    // Partial: role words in description
    const descMatch = roleWords.filter(w => descLower.includes(w)).length;
    if (descMatch >= Math.ceil(roleWords.length * 0.7)) {
      score += 25;
      break;
    }
  }

  // ── Skills match (30 points, scaled) ──
  const skills = (user.skills || []).map(s => s.toLowerCase());
  let skillHits = 0;
  for (const skill of skills) {
    // Handle multi-word skills (e.g., "machine learning")
    if (descLower.includes(skill) || titleLower.includes(skill)) {
      skillHits++;
    }
  }
  if (skills.length > 0) {
    const skillRatio = skillHits / Math.min(skills.length, 10);
    score += Math.round(skillRatio * 30);
  }

  // ── Location match (10 points) ──
  const locations = (user.preferred_locations || []).map(l => l.toLowerCase());
  for (const loc of locations) {
    if (locationLower.includes(loc)) {
      score += 10;
      break;
    }
  }

  // ── Remote match (10 points) ──
  const isRemote = locationLower.includes('remote') ||
    descLower.includes('remote') ||
    descLower.includes('work from home');
  if (isRemote && ['remote', 'flexible'].includes(user.remote_preference)) {
    score += 10;
  }

  // ── Salary match (10 points) ──
  if (job.salary && user.salary_expectation) {
    const jobMax = extractMaxSalary(job.salary);
    const userExpect = extractMaxSalary(user.salary_expectation);
    if (jobMax && userExpect && jobMax >= userExpect * 0.85) {
      score += 10;
    }
  }

  return Math.min(score, 110); // Cap at 110
}

/**
 * Extract the max salary number from strings like "$140k–$180k" or "150000"
 */
function extractMaxSalary(salaryStr) {
  if (!salaryStr) return null;
  const str = salaryStr.toString().toLowerCase().replace(/,/g, '');

  // Match patterns like $180k, 180k, $180,000
  const matches = str.match(/\$?(\d+)\s*k/g);
  if (matches && matches.length > 0) {
    const nums = matches.map(m => parseInt(m.replace(/\$|k/gi, '')) * 1000);
    return Math.max(...nums);
  }

  // Plain numbers
  const plainNums = str.match(/\d+/g);
  if (plainNums) {
    const nums = plainNums.map(Number);
    const max = Math.max(...nums);
    return max > 1000 ? max : max * 1000; // Assume 'k' if small number
  }

  return null;
}

/**
 * Match all jobs to a single user
 * Returns top N matches above threshold
 */
export function matchJobsToUser(user, jobs) {
  const scored = jobs.map(job => ({
    job,
    score: scoreJob(user, job)
  }));

  return scored
    .filter(m => m.score >= SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES_PER_USER);
}

/**
 * Match all users against all jobs
 * Returns { userId: [{ job, score }] }
 */
export function matchAllUsers(users, jobs) {
  const results = {};
  for (const user of users) {
    const matches = matchJobsToUser(user, jobs);
    if (matches.length > 0) {
      results[user.id] = matches;
    }
  }
  return results;
}
