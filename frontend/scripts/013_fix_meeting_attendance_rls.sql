-- Fix RLS for meeting_attendance to avoid cross-table policy failures
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.meeting_attendance
  ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.meeting_attendance
SET mentor_id = COALESCE(mentor_id, marked_by)
WHERE mentor_id IS NULL;

ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Mentors manage attendance for own meetings'
  ) THEN
    DROP POLICY "Mentors manage attendance for own meetings" ON public.meeting_attendance;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Mentors can insert own attendance'
  ) THEN
    CREATE POLICY "Mentors can insert own attendance"
      ON public.meeting_attendance
      FOR INSERT
      TO authenticated
      WITH CHECK (COALESCE(mentor_id, marked_by) = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Mentors can update own attendance'
  ) THEN
    CREATE POLICY "Mentors can update own attendance"
      ON public.meeting_attendance
      FOR UPDATE
      TO authenticated
      USING (COALESCE(mentor_id, marked_by) = auth.uid())
      WITH CHECK (COALESCE(mentor_id, marked_by) = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Mentors can view own attendance records'
  ) THEN
    CREATE POLICY "Mentors can view own attendance records"
      ON public.meeting_attendance
      FOR SELECT
      TO authenticated
      USING (COALESCE(mentor_id, marked_by) = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Students can view own attendance'
  ) THEN
    CREATE POLICY "Students can view own attendance"
      ON public.meeting_attendance
      FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());
  END IF;
END $$;
