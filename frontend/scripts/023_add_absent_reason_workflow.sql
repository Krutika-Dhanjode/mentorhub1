-- Add student absent reason workflow fields to meeting_attendance
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.meeting_attendance
  ADD COLUMN IF NOT EXISTS absent_reason TEXT,
  ADD COLUMN IF NOT EXISTS absent_reason_status TEXT NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF to_regclass('public.meeting_attendance') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'meeting_attendance_absent_reason_status_check'
         AND conrelid = 'public.meeting_attendance'::regclass
     ) THEN
    ALTER TABLE public.meeting_attendance
      ADD CONSTRAINT meeting_attendance_absent_reason_status_check
      CHECK (absent_reason_status IN ('pending', 'accepted', 'rejected'));
  END IF;
END $$;

-- Allow students to submit/update their own absent reason
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Students can insert own attendance reason'
  ) THEN
    CREATE POLICY "Students can insert own attendance reason"
      ON public.meeting_attendance
      FOR INSERT
      TO authenticated
      WITH CHECK (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Students can update own attendance reason'
  ) THEN
    CREATE POLICY "Students can update own attendance reason"
      ON public.meeting_attendance
      FOR UPDATE
      TO authenticated
      USING (student_id = auth.uid())
      WITH CHECK (student_id = auth.uid());
  END IF;
END $$;
