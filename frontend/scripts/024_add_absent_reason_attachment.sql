-- Add optional absent reason attachment fields
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.meeting_attendance
  ADD COLUMN IF NOT EXISTS absent_reason_file_url TEXT,
  ADD COLUMN IF NOT EXISTS absent_reason_file_name TEXT;
