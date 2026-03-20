-- Migration: Add custom timing to timetable_entries and remove semester from subjects
-- Timestamp: 20260318180000

-- Add custom_start_time and custom_end_time to timetable_entries
ALTER TABLE public.timetable_entries
ADD COLUMN IF NOT EXISTS custom_start_time TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_end_time TEXT DEFAULT NULL;

-- Remove semester column from subjects (no longer needed)
ALTER TABLE public.subjects
DROP COLUMN IF EXISTS semester;
