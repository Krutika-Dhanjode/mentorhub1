-- 1) Ensure report score column exists on active progress table
ALTER TABLE IF EXISTS public.progress
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

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

-- Optional compatibility for older schema naming
ALTER TABLE IF EXISTS public.progress_entries
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);

-- 2) Meeting attendance table (per meeting, per student)
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT FALSE,
  marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meeting_attendance_meeting_student_unique UNIQUE (meeting_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_id
  ON public.meeting_attendance(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_student_id
  ON public.meeting_attendance(student_id);

ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_attendance'
      AND policyname = 'Mentors manage attendance for own meetings'
  ) THEN
    CREATE POLICY "Mentors manage attendance for own meetings"
      ON public.meeting_attendance
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.meetings m
          WHERE m.id = meeting_attendance.meeting_id
            AND m.mentor_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.meetings m
          WHERE m.id = meeting_attendance.meeting_id
            AND m.mentor_id = auth.uid()
        )
      );
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
