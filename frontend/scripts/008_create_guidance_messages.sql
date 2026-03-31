CREATE TABLE IF NOT EXISTS public.guidance_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'mentor')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guidance_messages_student_created_idx
  ON public.guidance_messages (student_id, created_at);

CREATE INDEX IF NOT EXISTS guidance_messages_mentor_created_idx
  ON public.guidance_messages (mentor_id, created_at);

ALTER TABLE public.guidance_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'guidance_messages'
      AND policyname = 'Students can view their guidance messages'
  ) THEN
    CREATE POLICY "Students can view their guidance messages"
      ON public.guidance_messages
      FOR SELECT
      TO authenticated
      USING (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'guidance_messages'
      AND policyname = 'Students can insert their guidance messages'
  ) THEN
    CREATE POLICY "Students can insert their guidance messages"
      ON public.guidance_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        student_id = auth.uid()
        AND sender_role = 'student'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'guidance_messages'
      AND policyname = 'Mentors can view assigned guidance messages'
  ) THEN
    CREATE POLICY "Mentors can view assigned guidance messages"
      ON public.guidance_messages
      FOR SELECT
      TO authenticated
      USING (mentor_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'guidance_messages'
      AND policyname = 'Mentors can insert guidance replies'
  ) THEN
    CREATE POLICY "Mentors can insert guidance replies"
      ON public.guidance_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        mentor_id = auth.uid()
        AND sender_role = 'mentor'
      );
  END IF;
END $$;
