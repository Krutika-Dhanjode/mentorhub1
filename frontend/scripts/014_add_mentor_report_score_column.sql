-- Add overall mentor score (out of 10) on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mentor_report_score NUMERIC(4,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_mentor_report_score_range'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_mentor_report_score_range
      CHECK (mentor_report_score IS NULL OR (mentor_report_score >= 0 AND mentor_report_score <= 10));
  END IF;
END $$;
