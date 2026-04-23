-- Create batch_messages table
CREATE TABLE IF NOT EXISTS public.batch_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: `user_id` points to `users(id)`.

-- Enable Row Level Security
ALTER TABLE public.batch_messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for batch_messages
-- Check if publication exists, if so add table to it, else create it.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.batch_messages;
  ELSE
    -- Alter publication but it might already contain the table.
    -- Catch exceptions to prevent failure if it's already there
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_messages;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

-- RLS Policies

-- Policy 1: Admin (HOD) can read all batch messages
CREATE POLICY "Admin can view all batch messages" ON public.batch_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hod')
    );

-- Policy 2: Mentors can read messages in their batches
CREATE POLICY "Mentors can view their batch messages" ON public.batch_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.batches WHERE id = batch_id AND mentor_id = auth.uid())
    );

-- Policy 3: Students can read messages in batches they belong to
CREATE POLICY "Students can view their batch messages" ON public.batch_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.batch_students WHERE batch_id = public.batch_messages.batch_id AND student_id = auth.uid())
    );

-- Policy 4: Mentors can insert messages to their batches
CREATE POLICY "Mentors can insert batch messages" ON public.batch_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.batches WHERE id = batch_id AND mentor_id = auth.uid()) AND
        user_id = auth.uid()
    );

-- Policy 5: Students can insert messages to their batches
CREATE POLICY "Students can insert batch messages" ON public.batch_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.batch_students WHERE batch_id = public.batch_messages.batch_id AND student_id = auth.uid()) AND
        user_id = auth.uid()
    );

-- Policy 6: Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON public.batch_messages
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_messages_batch_id ON public.batch_messages(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_messages_user_id ON public.batch_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_messages_created_at ON public.batch_messages(created_at);
