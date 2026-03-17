-- ============================================
-- AI Job Matching Agent – Supabase Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  resume_text TEXT,
  primary_roles TEXT[] DEFAULT '{}',
  seniority_level TEXT,
  years_experience INTEGER,
  industries TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  remote_preference TEXT DEFAULT 'remote',
  salary_expectation TEXT,
  notification_method TEXT DEFAULT 'email', -- 'email' | 'sms' | 'both'
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE jobs (
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

-- Prevent duplicate job URLs
CREATE UNIQUE INDEX idx_jobs_url ON jobs(url) WHERE url IS NOT NULL;

-- Index for recent job queries
CREATE INDEX idx_jobs_posted_date ON jobs(posted_date DESC);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ============================================
-- MATCHES TABLE
-- ============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_user ON matches(user_id, created_at DESC);
CREATE INDEX idx_matches_unsent ON matches(user_id, sent) WHERE sent = FALSE;
CREATE UNIQUE INDEX idx_matches_user_job ON matches(user_id, job_id);

-- ============================================
-- NOTIFICATION LOG
-- ============================================
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'email' | 'sms'
  match_count INTEGER,
  status TEXT, -- 'sent' | 'failed'
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
CREATE POLICY "Users read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Matches: users see only their matches
CREATE POLICY "Users read own matches" ON matches
  FOR SELECT USING (auth.uid() = user_id);

-- Jobs are readable by all authenticated users
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read jobs" ON jobs
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- USER EXPERIENCE / FEEDBACK TABLE
-- ============================================
CREATE TABLE user_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view' | 'apply_click' | 'dismiss' | 'feedback' | 'test_run'
  rating INTEGER, -- 1-5 star rating (optional)
  feedback_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_experience_user ON user_experience(user_id, created_at DESC);
CREATE INDEX idx_user_experience_action ON user_experience(action);

ALTER TABLE user_experience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own experience" ON user_experience
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own experience" ON user_experience
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AI INSIGHTS CACHE TABLE
-- ============================================
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_user ON ai_insights(user_id, created_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own insights" ON ai_insights
  FOR SELECT USING (auth.uid() = user_id);
