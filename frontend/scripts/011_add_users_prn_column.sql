-- Add PRN support on users table (safe to run multiple times)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS prn TEXT;

-- Helpful lookup index for student PRN searches
CREATE INDEX IF NOT EXISTS idx_users_prn
  ON public.users(prn);

-- Optional: enforce unique PRN among students only.
-- Uncomment only if your existing data has no duplicate student PRNs.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_prn_unique
--   ON public.users(prn)
--   WHERE role = 'student' AND prn IS NOT NULL AND prn <> '';
