-- Run this in Supabase SQL Editor to fix the 500 error on /api/experience
-- Creates the missing user_experience and ai_insights tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON ai_insights(user_id, created_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
