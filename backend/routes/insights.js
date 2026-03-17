import { Router } from 'express';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// ── GET AI INSIGHTS ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Gather user data
    const [userRes, matchesRes] = await Promise.all([
      supabase
        .from('users')
        .select('primary_roles, skills, seniority_level, years_experience, industries, preferred_locations, remote_preference, salary_expectation')
        .eq('id', req.userId)
        .single(),
      supabase
        .from('matches')
        .select('score, ai_summary, created_at, jobs(title, company, location, salary)')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (userRes.error) throw userRes.error;

    const profile = userRes.data;
    const matches = matchesRes.data || [];

    // Generate insights locally (no AI call to save costs)
    const insights = generateInsights(profile, matches);

    res.json({ insights });
  } catch (err) {
    console.error('[Insights] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

function generateInsights(profile, matches) {
  const insights = [];

  // 1. Profile completeness
  const profileFields = ['primary_roles', 'skills', 'seniority_level', 'preferred_locations', 'salary_expectation'];
  const filledFields = profileFields.filter(f => {
    const val = profile[f];
    return val && (Array.isArray(val) ? val.length > 0 : val.length > 0);
  });
  const completeness = Math.round((filledFields.length / profileFields.length) * 100);

  if (completeness < 100) {
    const missing = profileFields.filter(f => !filledFields.includes(f)).map(f => f.replace(/_/g, ' '));
    insights.push({
      type: 'profile',
      icon: 'user',
      title: 'Complete Your Profile',
      description: `Your profile is ${completeness}% complete. Fill in ${missing.join(', ')} to get better matches.`,
      priority: 'high',
    });
  } else {
    insights.push({
      type: 'profile',
      icon: 'check',
      title: 'Profile Fully Complete',
      description: 'Your profile has all key fields filled. You\'re getting the best possible matches.',
      priority: 'low',
    });
  }

  // 2. Match score analysis
  if (matches.length > 0) {
    const avgScore = Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length);
    const highMatches = matches.filter(m => m.score >= 90);
    const lowMatches = matches.filter(m => m.score < 75);

    if (avgScore >= 85) {
      insights.push({
        type: 'matches',
        icon: 'chart',
        title: 'Strong Match Quality',
        description: `Your average match score is ${avgScore}%. You have ${highMatches.length} high-quality matches (90%+). Your profile aligns well with the market.`,
        priority: 'low',
      });
    } else if (avgScore >= 70) {
      insights.push({
        type: 'matches',
        icon: 'chart',
        title: 'Good Match Quality',
        description: `Average score: ${avgScore}%. Consider adding more skills to your profile to improve matches. ${highMatches.length} matches scored 90%+.`,
        priority: 'medium',
      });
    } else {
      insights.push({
        type: 'matches',
        icon: 'chart',
        title: 'Improve Your Matches',
        description: `Your average match score is ${avgScore}%. Try broadening your target roles or adding trending skills to boost match quality.`,
        priority: 'high',
      });
    }

    // 3. Top companies
    const companies = {};
    for (const m of matches) {
      const company = m.jobs?.company;
      if (company) companies[company] = (companies[company] || 0) + 1;
    }
    const topCompanies = Object.entries(companies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    if (topCompanies.length > 0) {
      insights.push({
        type: 'market',
        icon: 'briefcase',
        title: 'Top Matching Companies',
        description: `You match most frequently with: ${topCompanies.join(', ')}. These companies are actively hiring for roles that fit your profile.`,
        priority: 'medium',
      });
    }
  } else {
    insights.push({
      type: 'matches',
      icon: 'target',
      title: 'Waiting for Matches',
      description: 'Your agent is scanning for jobs. Matches will appear after the next scan cycle (8 AM, 1 PM, 6 PM UTC).',
      priority: 'medium',
    });
  }

  // 4. Skills gap suggestion
  if (profile.skills && profile.skills.length > 0) {
    const trendingSkills = ['TypeScript', 'React', 'Python', 'AWS', 'Kubernetes', 'GraphQL', 'Rust', 'Go', 'AI/ML', 'Docker'];
    const userSkills = profile.skills.map(s => s.toLowerCase());
    const missingTrending = trendingSkills.filter(s => !userSkills.includes(s.toLowerCase()));

    if (missingTrending.length > 0) {
      insights.push({
        type: 'skills',
        icon: 'zap',
        title: 'Trending Skills to Consider',
        description: `Popular skills in your field that you might add: ${missingTrending.slice(0, 4).join(', ')}. Adding relevant skills improves match accuracy.`,
        priority: 'medium',
      });
    }
  }

  // 5. Salary insight
  if (profile.salary_expectation) {
    const salaryMatches = matches.filter(m => m.jobs?.salary);
    if (salaryMatches.length > 0) {
      insights.push({
        type: 'salary',
        icon: 'chart',
        title: 'Salary Market Alignment',
        description: `Your target: ${profile.salary_expectation}. We found ${salaryMatches.length} matches with listed salaries. Keep your expectation competitive to maximize opportunities.`,
        priority: 'low',
      });
    }
  }

  // 6. Remote preference insight
  if (profile.remote_preference) {
    insights.push({
      type: 'work_style',
      icon: 'target',
      title: `${profile.remote_preference.charAt(0).toUpperCase() + profile.remote_preference.slice(1)} Work Preference`,
      description: `You're set to "${profile.remote_preference}". The market shows strong demand for remote roles. Adjust in settings if your preference changes.`,
      priority: 'low',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights;
}

export default router;
