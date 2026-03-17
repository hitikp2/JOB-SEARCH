import { Router } from 'express';
import multer from 'multer';
import supabase from '../utils/supabase.js';
import { authMiddleware } from '../utils/auth.js';
import { extractResumeProfile } from '../services/ai.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET PROFILE ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, phone, primary_roles, seniority_level, years_experience, industries, skills, preferred_locations, remote_preference, salary_expectation, notification_method, profile_complete, created_at')
      .eq('id', req.userId)
      .single();

    if (error) throw error;
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

    // Auto-mark profile as complete if key fields are filled
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

    // Step 1: Store raw resume
    await supabase
      .from('users')
      .update({ resume_text })
      .eq('id', req.userId);

    // Step 2: AI extraction (one-time cost)
    console.log(`[Profile] Extracting profile for user ${req.userId}...`);
    const profile = await extractResumeProfile(resume_text);

    // Step 3: Update structured profile
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

    console.log(`[Profile] Extraction complete for ${req.userId}`);
    res.json({ message: 'Resume processed', profile: data });
  } catch (err) {
    console.error('Resume processing error:', err);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

// ── UPLOAD RESUME (file) ── Supports: PDF, TXT, JPG, JPEG, PNG, DOC, DOCX
router.post('/resume/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let resumeText;
    const mime = req.file.mimetype;

    if (mime === 'text/plain') {
      resumeText = req.file.buffer.toString('utf-8');
    } else if (mime === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const pdf = await pdfParse(req.file.buffer);
      resumeText = pdf.text;
    } else if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/jpg') {
      // For images: encode as base64 and use AI to extract text
      const base64 = req.file.buffer.toString('base64');
      const { extractTextFromImage } = await import('../services/ai.js');
      resumeText = await extractTextFromImage(base64, mime);
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      // DOCX support via mammoth
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      resumeText = result.value;
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Accepted: .txt, .pdf, .jpg, .png, .doc, .docx'
      });
    }

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({ error: 'Could not extract enough text from the file. Try pasting your resume text instead.' });
    }

    // Store and extract
    await supabase.from('users').update({ resume_text: resumeText }).eq('id', req.userId);

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
    res.json({ message: 'Resume processed', profile: data });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to process resume file' });
  }
});

export default router;
