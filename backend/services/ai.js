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
        maxOutputTokens: 500,
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
