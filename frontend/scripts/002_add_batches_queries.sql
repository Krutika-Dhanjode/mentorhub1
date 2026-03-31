-- Create batches table
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create queries table for student queries/questions
CREATE TABLE IF NOT EXISTS public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Answered')),
  answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add batch_id to students if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'batch_id') THEN
    ALTER TABLE public.students ADD COLUMN batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Batches policies
CREATE POLICY "Anyone can view batches" ON public.batches
  FOR SELECT USING (true);

CREATE POLICY "Mentors can create batches" ON public.batches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mentor', 'hod'))
  );

CREATE POLICY "Mentors can update their batches" ON public.batches
  FOR UPDATE USING (
    mentor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hod')
  );

CREATE POLICY "Mentors can delete their batches" ON public.batches
  FOR DELETE USING (
    mentor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hod')
  );

-- Queries policies
CREATE POLICY "Students can view their queries" ON public.queries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND profile_id = auth.uid())
  );

CREATE POLICY "Mentors can view queries from their students" ON public.queries
  FOR SELECT USING (
    mentor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.students s 
      WHERE s.id = student_id AND s.mentor_id = auth.uid()
    )
  );

CREATE POLICY "HOD can view all queries" ON public.queries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hod')
  );

CREATE POLICY "Students can create queries" ON public.queries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND profile_id = auth.uid())
  );

CREATE POLICY "Mentors can update queries" ON public.queries
  FOR UPDATE USING (
    mentor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hod')
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batches_mentor_id ON public.batches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_queries_student_id ON public.queries(student_id);
CREATE INDEX IF NOT EXISTS idx_queries_mentor_id ON public.queries(mentor_id);
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON public.students(batch_id);
