CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hod_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hod_id, mentor_user_id)
);

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentors'
      AND policyname = 'HOD can view their mentor mappings'
  ) THEN
    CREATE POLICY "HOD can view their mentor mappings"
      ON public.mentors
      FOR SELECT
      TO authenticated
      USING (hod_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentors'
      AND policyname = 'HOD can insert mentor mappings'
  ) THEN
    CREATE POLICY "HOD can insert mentor mappings"
      ON public.mentors
      FOR INSERT
      TO authenticated
      WITH CHECK (hod_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mentors'
      AND policyname = 'HOD can delete mentor mappings'
  ) THEN
    CREATE POLICY "HOD can delete mentor mappings"
      ON public.mentors
      FOR DELETE
      TO authenticated
      USING (hod_id = auth.uid());
  END IF;
END $$;
