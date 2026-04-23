-- Add file attachment columns to batch_messages
ALTER TABLE public.batch_messages
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create storage bucket for chat attachments (run this in Supabase SQL Editor)
-- NOTE: You also need to create a bucket named 'chat-attachments' in
-- Supabase Dashboard → Storage → New Bucket → Name: chat-attachments → Public: ON

-- Storage bucket RLS policies for chat-attachments
-- (Run these after creating the bucket in the Supabase Dashboard)

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

-- Allow authenticated users to read all chat files
CREATE POLICY "Authenticated users can read chat files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');

-- Allow users to delete their own chat files
CREATE POLICY "Users can delete their own chat files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
