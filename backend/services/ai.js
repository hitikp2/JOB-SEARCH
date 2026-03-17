import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.AI_MODEL || 'gpt-4o-mini';

// ============================================
// RESUME EXTRACTION (run once per user)
// ============================================
export async function extractResumeProfile(resumeText) {
  // Truncate to ~4000 chars to minimize tokens
  const truncated = resumeText.slice(0, 4000);

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: `You are an AI that extracts structured career data from resumes.
Return ONLY valid JSON with no markdown formatting.
Extract:
- primary_roles: array of job titles the person is qualified for (max 5)
- seniority_level: "junior" | "mid" | "senior" | "lead" | "executive"
- years_experience: number
- industries: array (max 5)
- core_skills: array of technical and professional skills (max 15)
- preferred_locations: array of cities/regions mentioned or implied
- remote_preference: "remote" | "hybrid" | "onsite" | "flexible"
- salary_expectation: string estimate based on role and experience`
      },
      {
        role: 'user',
        content: `Extract structured profile from this resume:\n\n${truncated}`
      }
    ]
  });

  const text = response.choices[0].message.content.trim();
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ============================================
// JOB SUMMARIZATION (run per user, 3-5 jobs)
// ============================================
export async function summarizeJobs(jobs) {
  // Prepare minimal job data to reduce tokens
  const minimal = jobs.map(j => ({
    title: j.title,
    company: j.company,
    location: j.location,
    salary: j.salary || 'Not listed',
    description: (j.description || '').slice(0, 600)
  }));

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: `Summarize job listings for a job alert notification.
Rules:
- Maximum 25 words per job summary
- Focus on: role highlights, location, salary, key requirement
- Plain language, no jargon
- Return ONLY valid JSON with no markdown formatting

Return format:
{"jobs":[{"title":"","company":"","location":"","salary":"","summary":""}]}`
      },
      {
        role: 'user',
        content: `Summarize these jobs:\n${JSON.stringify(minimal)}`
      }
    ]
  });

  const text = response.choices[0].message.content.trim();
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleaned);
}
