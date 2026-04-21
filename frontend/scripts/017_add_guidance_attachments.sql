ALTER TABLE public.guidance_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('guidance-attachments', 'guidance-attachments', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own guidance attachments'
  ) THEN
    CREATE POLICY "Users can upload own guidance attachments"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'guidance-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own guidance attachments'
  ) THEN
    CREATE POLICY "Users can update own guidance attachments"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'guidance-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'guidance-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own guidance attachments'
  ) THEN
    CREATE POLICY "Users can delete own guidance attachments"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'guidance-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can read guidance attachments'
  ) THEN
    CREATE POLICY "Authenticated users can read guidance attachments"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'guidance-attachments');
  END IF;
END $$;
