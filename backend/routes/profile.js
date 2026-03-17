import { Router } from 'express';
import multer from 'multer';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';
import { extractResumeProfile } from '../services/ai.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/plain',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// ── Helper: extract text from various file types ──
async function extractTextFromFile(file) {
  const { mimetype, buffer } = file;

  if (mimetype === 'text/plain') {
    return buffer.toString('utf-8');
  }

  if (mimetype === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const pdf = await pdfParse(buffer);
    return pdf.text;
  }

  if (mimetype.startsWith('image/')) {
    // For images (JPG, PNG, WebP), convert to base64 and use AI vision to extract text
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64}`;
    return await extractTextFromImage(dataUri, mimetype);
  }

  if (mimetype.includes('wordprocessingml') || mimetype === 'application/msword') {
    // For DOCX files, extract raw text from the XML
    const text = await extractTextFromDocx(buffer);
    return text;
  }

  throw new Error('Unsupported file type');
}

// ── Extract text from image using AI vision ──
async function extractTextFromImage(dataUri, mimetype) {
  const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  if (AI_PROVIDER === 'gemini' && GEMINI_KEY) {
    const base64Data = dataUri.split(',')[1];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Extract ALL text from this resume/document image. Return the raw text exactly as it appears, preserving structure. If this is not a document, describe what you see.' },
            { inline_data: { mime_type: mimetype, data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
      })
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // Fallback: OpenAI vision
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_KEY) {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: OPENAI_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Extract ALL text from this resume/document image. Return the raw text exactly as it appears.' },
          { type: 'image_url', image_url: { url: dataUri } }
        ]
      }]
    });
    return response.choices[0].message.content.trim();
  }

  throw new Error('No AI provider configured for image extraction');
}

// ── Extract text from DOCX ──
async function extractTextFromDocx(buffer) {
  const { Readable } = await import('stream');
  const { createUnzip } = await import('zlib');

  // DOCX is a ZIP containing XML. We'll extract word/document.xml
  // Simple approach: use the buffer directly with a basic ZIP reader
  try {
    // Try to find the XML content in the DOCX buffer
    const content = buffer.toString('utf-8');
    // Look for text between XML tags in the raw buffer
    const xmlStart = buffer.indexOf('<w:document');
    if (xmlStart === -1) {
      // Fallback: just extract readable text from buffer
      return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Extract text from w:t tags
    const xmlStr = buffer.toString('utf-8');
    const textParts = [];
    const regex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    let match;
    while ((match = regex.exec(xmlStr)) !== null) {
      textParts.push(match[1]);
    }

    // Also handle paragraph breaks
    const result = xmlStr
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:t[^>]*>/g, '')
      .replace(/<\/w:t>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return textParts.length > 0 ? textParts.join(' ') : result;
  } catch {
    return buffer.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// ── Track user activity ──
async function trackActivity(userId, action, metadata = {}) {
  try {
    await supabase.from('user_activity').insert({
      user_id: userId,
      action,
      metadata,
    });
  } catch (err) {
    console.error('[Activity] Failed to track:', err.message);
  }
}

// ── GET PROFILE ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, phone, primary_roles, seniority_level, years_experience, industries, skills, preferred_locations, remote_preference, salary_expectation, notification_method, profile_complete, created_at')
      .eq('id', req.userId)
      .single();

    if (error) throw error;
    await trackActivity(req.userId, 'view_profile');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── UPDATE PROFILE ──
router.patch('/', authMiddleware, async (req, res) => {
  try {
    const allowed = [
      'phone', 'primary_roles', 'skills', 'preferred_locations',
      'remote_preference', 'salary_expectation', 'notification_method',
      'seniority_level', 'years_experience', 'industries'
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.primary_roles?.length > 0 || updates.skills?.length > 0) {
      updates.profile_complete = true;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select('id, email, primary_roles, skills, preferred_locations, remote_preference, salary_expectation, notification_method, profile_complete')
      .single();

    if (error) throw error;
    await trackActivity(req.userId, 'update_profile', { fields: Object.keys(updates) });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── UPLOAD RESUME (text) ──
router.post('/resume', authMiddleware, async (req, res) => {
  try {
    const { resume_text } = req.body;

    if (!resume_text || resume_text.length < 50) {
      return res.status(400).json({ error: 'Resume text too short (min 50 characters)' });
    }

    await supabase
      .from('users')
      .update({ resume_text })
      .eq('id', req.userId);

    console.log(`[Profile] Extracting profile for user ${req.userId}...`);
    const profile = await extractResumeProfile(resume_text);

    const { data, error } = await supabase
      .from('users')
      .update({
        primary_roles: profile.primary_roles || [],
        seniority_level: profile.seniority_level || '',
        years_experience: profile.years_experience || 0,
        industries: profile.industries || [],
        skills: profile.core_skills || [],
        preferred_locations: profile.preferred_locations || [],
        remote_preference: profile.remote_preference || 'remote',
        salary_expectation: profile.salary_expectation || '',
        profile_complete: true
      })
      .eq('id', req.userId)
      .select('id, email, primary_roles, seniority_level, years_experience, industries, skills, preferred_locations, remote_preference, salary_expectation, profile_complete')
      .single();

    if (error) throw error;

    await trackActivity(req.userId, 'resume_upload', { method: 'text', length: resume_text.length });
    console.log(`[Profile] Extraction complete for ${req.userId}`);
    res.json({ message: 'Resume processed', profile: data });
  } catch (err) {
    console.error('Resume processing error:', err);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

// ── UPLOAD RESUME (file: PDF, JPG, PNG, DOCX, TXT) ──
router.post('/resume/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[Profile] Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    const resumeText = await extractTextFromFile(req.file);

    if (!resumeText || resumeText.length < 20) {
      return res.status(400).json({ error: 'Could not extract enough text from the file. Try a clearer image or paste text directly.' });
    }

    // Store raw text
    await supabase.from('users').update({ resume_text: resumeText }).eq('id', req.userId);

    // AI extraction
    const profile = await extractResumeProfile(resumeText);

    const { data, error } = await supabase
      .from('users')
      .update({
        primary_roles: profile.primary_roles || [],
        seniority_level: profile.seniority_level || '',
        years_experience: profile.years_experience || 0,
        industries: profile.industries || [],
        skills: profile.core_skills || [],
        preferred_locations: profile.preferred_locations || [],
        remote_preference: profile.remote_preference || 'remote',
        salary_expectation: profile.salary_expectation || '',
        profile_complete: true
      })
      .eq('id', req.userId)
      .select('id, email, primary_roles, seniority_level, years_experience, industries, skills, preferred_locations, remote_preference, salary_expectation, profile_complete')
      .single();

    if (error) throw error;

    await trackActivity(req.userId, 'resume_upload', {
      method: 'file',
      file_type: req.file.mimetype,
      file_name: req.file.originalname,
      extracted_length: resumeText.length
    });

    res.json({ message: 'Resume processed', profile: data });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process resume file' });
  }
});

// ── TEST CONNECTION ──
router.get('/test', authMiddleware, async (req, res) => {
  const results = { database: false, ai: false, timestamp: new Date().toISOString() };

  // Test database
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.userId)
      .single();
    results.database = !error && !!data;
  } catch {
    results.database = false;
  }

  // Test AI provider
  try {
    const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    if (AI_PROVIDER === 'gemini' && GEMINI_KEY) {
      results.ai_provider = 'gemini';
      results.ai = true;
    } else if (OPENAI_KEY) {
      results.ai_provider = 'openai';
      results.ai = true;
    } else {
      results.ai_provider = 'none';
      results.ai = false;
    }
  } catch {
    results.ai = false;
  }

  results.all_ok = results.database && results.ai;
  await trackActivity(req.userId, 'test_connection', results);
  res.json(results);
});

export default router;
