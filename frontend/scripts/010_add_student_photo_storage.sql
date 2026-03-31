ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-profile-photos', 'student-profile-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Students can upload their own profile photos'
  ) THEN
    CREATE POLICY "Students can upload their own profile photos"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'student-profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Students can update their own profile photos'
  ) THEN
    CREATE POLICY "Students can update their own profile photos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'student-profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'student-profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Students can read profile photos'
  ) THEN
    CREATE POLICY "Students can read profile photos"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'student-profile-photos');
  END IF;
END $$;
