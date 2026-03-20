-- Add department and semester columns to subjects table
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT '';
