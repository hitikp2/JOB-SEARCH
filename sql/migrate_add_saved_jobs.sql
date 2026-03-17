-- Run this in Supabase SQL Editor to create the saved_jobs table for the Tracker feature
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT,
  applied_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON saved_jobs(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id, status, created_at DESC);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own saved jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'saved_jobs_user_policy') THEN
    CREATE POLICY saved_jobs_user_policy ON saved_jobs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
