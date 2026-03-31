ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS added_by_hod_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'HOD can view mentors they added'
  ) THEN
    CREATE POLICY "HOD can view mentors they added"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (
        role = 'mentor'
        AND added_by_hod_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'HOD can insert mentors'
  ) THEN
    CREATE POLICY "HOD can insert mentors"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (
        role = 'mentor'
        AND added_by_hod_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'HOD can update mentors they added'
  ) THEN
    CREATE POLICY "HOD can update mentors they added"
      ON public.users
      FOR UPDATE
      TO authenticated
      USING (
        role = 'mentor'
        AND added_by_hod_id = auth.uid()
      )
      WITH CHECK (
        role = 'mentor'
        AND added_by_hod_id = auth.uid()
      );
  END IF;
END $$;
