-- ============================================
-- AI Job Matching Agent – Safe Schema Setup
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Add missing columns to existing users table ──
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_roles TEXT[] DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS seniority_level TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience INTEGER;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS remote_preference TEXT DEFAULT 'remote';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_expectation TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_method TEXT DEFAULT 'email';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet, create it
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT,
    resume_text TEXT,
    primary_roles TEXT[] DEFAULT '{}',
    seniority_level TEXT,
    years_experience INTEGER,
    industries TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    remote_preference TEXT DEFAULT 'remote',
    salary_expectation TEXT,
    notification_method TEXT DEFAULT 'email',
    profile_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
END $$;

-- ── Jobs table ──
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  salary TEXT,
  description TEXT,
  url TEXT,
  source TEXT,
  posted_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_url ON jobs(url) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- ── Matches table ──
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_unsent ON matches(user_id, sent) WHERE sent = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_user_job ON matches(user_id, job_id);

-- ── Notification log ──
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  match_count INTEGER,
  status TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS: Disable for now (backend uses service_role key which bypasses RLS) ──
-- The service_role key already bypasses RLS, so these policies only matter
-- for direct Supabase client access. Keeping them simple.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (this is automatic, but being explicit)
-- For the frontend/anon key, we don't need policies since all access goes through the API

-- Drop conflicting policies if they exist, then recreate
DROP POLICY IF EXISTS "Allow all for service role" ON users;
DROP POLICY IF EXISTS "Allow all for service role" ON jobs;
DROP POLICY IF EXISTS "Allow all for service role" ON matches;
DROP POLICY IF EXISTS "Allow all for service role" ON notification_log;

-- Simple policy: allow authenticated users to read jobs
DROP POLICY IF EXISTS "Authenticated read jobs" ON jobs;
CREATE POLICY "Authenticated read jobs" ON jobs FOR SELECT TO authenticated USING (true);

-- ── User Experience / Feedback table ──
CREATE TABLE IF NOT EXISTS user_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  rating INTEGER,
  feedback_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_experience_user ON user_experience(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_experience_action ON user_experience(action);

ALTER TABLE user_experience ENABLE ROW LEVEL SECURITY;

-- ── AI Insights Cache table ──
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights(user_id, created_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- ── Updated_at trigger ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
