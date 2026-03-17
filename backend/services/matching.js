/**
 * Job Matching Algorithm (No AI)
 * Scores each job against a user's FULL profile using rule-based logic.
 * Returns only matches scoring above threshold.
 */

const SCORE_THRESHOLD = 30;
const MAX_MATCHES_PER_USER = 25;

// Seniority keywords for detecting job level from title/description
const SENIORITY_KEYWORDS = {
  junior:    ['junior', 'jr', 'entry level', 'entry-level', 'associate', 'intern', 'graduate', 'trainee'],
  mid:       ['mid-level', 'mid level', 'intermediate'],
  senior:    ['senior', 'sr', 'staff', 'principal', 'distinguished'],
  lead:      ['lead', 'team lead', 'tech lead', 'engineering manager', 'head of'],
  executive: ['director', 'vp', 'vice president', 'cto', 'ceo', 'cio', 'chief'],
};

/**
 * Detect seniority level from job title/description text
 */
function detectSeniority(text) {
  const lower = text.toLowerCase();
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return level;
    }
  }
  return 'mid'; // default if unspecified
}

/**
 * Score a single job against a user profile.
 * Uses ALL saved user inputs: roles, skills, locations, remote preference,
 * salary, seniority, industries, work_schedule, and years_experience.
 */
export function scoreJob(user, job) {
  let score = 0;
  const titleLower = (job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const locationLower = (job.location || '').toLowerCase();
  const fullText = `${titleLower} ${descLower}`;

  // ── Role match (40 points) ──
  const roles = (user.primary_roles || []).map(r => r.toLowerCase());
  for (const role of roles) {
    const roleWords = role.split(/\s+/);
    const titleMatch = roleWords.every(w => titleLower.includes(w));
    if (titleMatch) {
      score += 40;
      break;
    }
    // Partial: role words in description
    const descMatch = roleWords.filter(w => descLower.includes(w)).length;
    if (descMatch >= Math.ceil(roleWords.length * 0.7)) {
      score += 20;
      break;
    }
  }

  // ── Skills match (25 points, scaled) ──
  const skills = (user.skills || []).map(s => s.toLowerCase());
  let skillHits = 0;
  for (const skill of skills) {
    if (fullText.includes(skill)) {
      skillHits++;
    }
  }
  if (skills.length > 0) {
    const skillRatio = skillHits / Math.min(skills.length, 10);
    score += Math.round(skillRatio * 25);
  }

  // ── Seniority match (15 points) ──
  if (user.seniority_level) {
    const jobSeniority = detectSeniority(titleLower);
    const userLevel = user.seniority_level.toLowerCase();
    if (jobSeniority === userLevel) {
      score += 15;
    } else {
      // Adjacent levels get partial credit
      const levels = ['junior', 'mid', 'senior', 'lead', 'executive'];
      const jobIdx = levels.indexOf(jobSeniority);
      const userIdx = levels.indexOf(userLevel);
      if (jobIdx >= 0 && userIdx >= 0 && Math.abs(jobIdx - userIdx) === 1) {
        score += 8;
      }
      // Penalize large mismatch (e.g., senior user seeing junior roles)
      if (jobIdx >= 0 && userIdx >= 0 && Math.abs(jobIdx - userIdx) >= 2) {
        score -= 10;
      }
    }
  }

  // ── Industry match (10 points) ──
  const industries = (user.industries || []).map(i => i.toLowerCase());
  for (const industry of industries) {
    const industryWords = industry.split(/\s+/);
    if (industryWords.some(w => fullText.includes(w))) {
      score += 10;
      break;
    }
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

  // ── Work schedule match (10 points / -15 penalty) ──
  const schedule = (user.work_schedule || '').toLowerCase();
  if (schedule && schedule !== 'any') {
    const empType = (job.employment_type || '').toLowerCase();
    const scheduleMap = {
      full_time: ['fulltime', 'full-time', 'full time'],
      part_time: ['parttime', 'part-time', 'part time'],
      contract: ['contract', 'contractor', 'freelance'],
      internship: ['intern', 'internship'],
    };
    const expectedTerms = scheduleMap[schedule] || [];
    const matchesSchedule = expectedTerms.some(t => empType.includes(t) || fullText.includes(t));
    const mismatchSchedule = Object.entries(scheduleMap)
      .filter(([k]) => k !== schedule)
      .some(([, terms]) => terms.some(t => empType.includes(t)));

    if (matchesSchedule) {
      score += 10;
    } else if (mismatchSchedule) {
      score -= 15; // Wrong employment type
    }
  }

  // ── Salary match (10 points) ──
  if (job.salary && user.salary_expectation) {
    const jobMax = extractMaxSalary(job.salary);
    const userExpect = extractMaxSalary(user.salary_expectation);
    if (jobMax && userExpect && jobMax >= userExpect * 0.85) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(score, 130)); // Floor at 0, cap at 130
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
