import dotenv from 'dotenv';
dotenv.config();

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// ============================================
// GEMINI API CALL
// ============================================
async function callGemini(systemPrompt, userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================
// OPENAI API CALL
// ============================================
async function callOpenAI(systemPrompt, userMessage) {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: OPENAI_KEY });

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.1,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });

  const text = response.choices[0].message.content.trim();
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================
// UNIFIED AI CALL
// ============================================
async function callAI(systemPrompt, userMessage) {
  if (AI_PROVIDER === 'gemini' && GEMINI_KEY) {
    return callGemini(systemPrompt, userMessage);
  } else if (OPENAI_KEY) {
    return callOpenAI(systemPrompt, userMessage);
  }
  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
}

// ============================================
// RESUME EXTRACTION (run once per user)
// ============================================
export async function extractResumeProfile(resumeText) {
  const truncated = resumeText.slice(0, 4000);

  const systemPrompt = `You are an AI that extracts structured career data from resumes.
Return ONLY valid JSON.
Extract:
- primary_roles: array of job titles the person is qualified for (max 5)
- seniority_level: "junior" | "mid" | "senior" | "lead" | "executive"
- years_experience: number
- industries: array (max 5)
- core_skills: array of technical and professional skills (max 15)
- preferred_locations: array of cities/regions mentioned or implied
- remote_preference: "remote" | "hybrid" | "onsite" | "flexible"
- salary_expectation: string estimate based on role and experience`;

  return callAI(systemPrompt, `Extract structured profile from this resume:\n\n${truncated}`);
}

// ============================================
// EXTRACT TEXT FROM IMAGE (for JPG/PNG resumes)
// ============================================
export async function extractTextFromImage(base64Data, mimeType) {
  if (AI_PROVIDER === 'gemini' && GEMINI_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Extract ALL text content from this resume/document image. Return the complete text exactly as it appears, preserving structure. Return ONLY the extracted text, no commentary.' },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
      })
    });
    if (!response.ok) throw new Error(`Gemini vision error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (OPENAI_KEY) {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: OPENAI_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Extract ALL text content from this resume/document image. Return the complete text exactly as it appears, preserving structure. Return ONLY the extracted text, no commentary.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ]
      }]
    });
    return response.choices[0].message.content.trim();
  }
  throw new Error('No AI provider configured for image extraction.');
}

// ============================================
// GENERATE AI INSIGHTS FOR USER
// ============================================
export async function generateInsights(profile, matches, experiences) {
  const systemPrompt = `You are a career advisor AI. Analyze the user's job search data and provide actionable insights.
Return ONLY valid JSON with this structure:
{
  "summary": "1-2 sentence overview of their job search status",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["suggestion1", "suggestion2", "suggestion3"],
  "skill_gaps": ["skill1", "skill2"],
  "market_trends": "1-2 sentences about relevant market trends for their roles",
  "next_steps": ["action1", "action2", "action3"],
  "match_quality": "low|medium|high",
  "confidence_score": 75
}`;

  const context = `User Profile:
- Roles: ${(profile.primary_roles || []).join(', ')}
- Skills: ${(profile.skills || []).join(', ')}
- Level: ${profile.seniority_level || 'unknown'}
- Experience: ${profile.years_experience || 0} years
- Industries: ${(profile.industries || []).join(', ')}
- Locations: ${(profile.preferred_locations || []).join(', ')}
- Remote: ${profile.remote_preference || 'flexible'}
- Salary: ${profile.salary_expectation || 'not specified'}

Recent Matches (${matches.length}):
${matches.slice(0, 5).map(m => `- ${m.jobs?.title || 'Unknown'} at ${m.jobs?.company || 'Unknown'} (Score: ${m.score})`).join('\n')}

User Activity (${experiences.length} actions):
${experiences.slice(0, 10).map(e => `- ${e.action}${e.rating ? ` (rated ${e.rating}/5)` : ''}${e.feedback_text ? `: ${e.feedback_text}` : ''}`).join('\n')}`;

  return callAI(systemPrompt, context);
}

// ============================================
// AI JOB ANALYSIS - Score top 25 jobs for user
// ============================================
export async function analyzeTopJobs(user, jobs) {
  const userProfile = {
    roles: (user.primary_roles || []).join(', '),
    skills: (user.skills || []).join(', '),
    level: user.seniority_level || 'unknown',
    experience: user.years_experience || 0,
    locations: (user.preferred_locations || []).join(', '),
    remote: user.remote_preference || 'flexible',
    salary: user.salary_expectation || 'not specified'
  };

  const jobList = jobs.slice(0, 25).map((j, i) => ({
    index: i,
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary || 'Not listed',
    description: (j.description || '').slice(0, 300)
  }));

  const systemPrompt = `You are a job matching AI. Score each job's relevance to the candidate profile.
Consider: role fit, skill overlap, location match, salary range, seniority alignment, and transferable skills.
Be generous with scoring - consider adjacent roles and transferable experience.
Return ONLY valid JSON array:
[{"index":0,"score":85,"summary":"Brief 15-word reason this job fits or doesn't"}]
Score 0-100. Include ALL jobs. Sort by score descending.`;

  const userMessage = `Candidate Profile:
${JSON.stringify(userProfile)}

Jobs to analyze:
${JSON.stringify(jobList)}`;

  return callAI(systemPrompt, userMessage);
}

// ============================================
// JOB SUMMARIZATION (run per user, 3-5 jobs)
// ============================================
export async function summarizeJobs(jobs) {
  const minimal = jobs.map(j => ({
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary || 'Not listed',
    description: (j.description || '').slice(0, 600)
  }));

  const systemPrompt = `Summarize job listings for a job alert notification.
Rules:
- Maximum 25 words per job summary
- Focus on: role highlights, location, salary, key requirement
- Plain language, no jargon
- Return ONLY valid JSON

Return format:
{"jobs":[{"title":"","company":"","location":"","salary":"","summary":""}]}`;

  return callAI(systemPrompt, `Summarize these jobs:\n${JSON.stringify(minimal)}`);
}
