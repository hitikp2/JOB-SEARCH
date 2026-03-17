-- Run this in Supabase SQL Editor to add job source, filter, and SMS preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_sources JSONB DEFAULT '["jsearch"]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_sources TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'any';
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_schedule TEXT DEFAULT 'full_time';
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'any';
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_radius INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_template TEXT;
