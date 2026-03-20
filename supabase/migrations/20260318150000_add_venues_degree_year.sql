-- Migration: Add venues to subjects, venue to timetable_entries, degree_type and year_of_joining to user_profiles
-- Timestamp: 20260318150000

-- Add venues array column to subjects table
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS venues TEXT[] DEFAULT '{}';

-- Add venue column to timetable_entries for per-period venue selection
ALTER TABLE public.timetable_entries
ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT '';

-- Add degree_type and year_of_joining to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS degree_type TEXT DEFAULT 'Undergraduate';

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS year_of_joining INTEGER;
