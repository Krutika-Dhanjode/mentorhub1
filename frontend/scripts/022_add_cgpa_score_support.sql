-- Ensure CGPA entries can store numeric score and text representation
-- Works for both public.progress (active table) and legacy public.progress_entries

ALTER TABLE IF EXISTS public.progress
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS value_text TEXT;

DO $$
BEGIN
  IF to_regclass('public.progress') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'progress_score_range'
         AND conrelid = 'public.progress'::regclass
     ) THEN
    ALTER TABLE public.progress
      ADD CONSTRAINT progress_score_range
      CHECK (score IS NULL OR (score >= 0 AND score <= 10));
  END IF;
END $$;

ALTER TABLE IF EXISTS public.progress_entries
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS value_text TEXT;

DO $$
BEGIN
  IF to_regclass('public.progress_entries') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'progress_entries_score_range'
         AND conrelid = 'public.progress_entries'::regclass
     ) THEN
    ALTER TABLE public.progress_entries
      ADD CONSTRAINT progress_entries_score_range
      CHECK (score IS NULL OR (score >= 0 AND score <= 10));
  END IF;
END $$;

-- Backfill display text for existing CGPA rows when score exists but value_text is empty
UPDATE public.progress
SET value_text = TO_CHAR(score, 'FM999990.00')
WHERE (entry_type = 'cgpa' OR entry_type = 'marks')
  AND score IS NOT NULL
  AND (value_text IS NULL OR value_text = '');

UPDATE public.progress_entries
SET value_text = TO_CHAR(score, 'FM999990.00')
WHERE (entry_type = 'cgpa' OR entry_type = 'marks')
  AND score IS NOT NULL
  AND (value_text IS NULL OR value_text = '');
