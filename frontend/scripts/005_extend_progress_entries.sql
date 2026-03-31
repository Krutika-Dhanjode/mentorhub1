ALTER TABLE public.progress_entries
  ADD COLUMN IF NOT EXISTS value_text TEXT,
  ADD COLUMN IF NOT EXISTS attachment_names TEXT[];

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-progress', 'student-progress', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Students can upload their own progress files'
  ) THEN
    CREATE POLICY "Students can upload their own progress files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'student-progress'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Students can update their own progress files'
  ) THEN
    CREATE POLICY "Students can update their own progress files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'student-progress'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'student-progress'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Students can delete their own progress files'
  ) THEN
    CREATE POLICY "Students can delete their own progress files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'student-progress'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
