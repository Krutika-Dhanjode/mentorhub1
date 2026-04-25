-- Add certification-specific fields to progress_entries table
ALTER TABLE public.progress_entries
  ADD COLUMN IF NOT EXISTS certification_type TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS mentor_score DECIMAL(3,1) CHECK (mentor_score >= 0 AND mentor_score <= 10),
  ADD COLUMN IF NOT EXISTS mentor_feedback TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_progress_entries_certification_type ON public.progress_entries(certification_type);
CREATE INDEX IF NOT EXISTS idx_progress_entries_verification_status ON public.progress_entries(verification_status);
CREATE INDEX IF NOT EXISTS idx_progress_entries_student_mentor ON public.progress_entries(student_id, mentor_id);

-- Update existing entries to have proper certification types
UPDATE public.progress_entries
SET certification_type = CASE
  WHEN entry_type = 'skill' THEN 'certification'
  WHEN entry_type = 'marks' THEN 'cgpa'
  WHEN entry_type = 'report' THEN 'achievement'
  ELSE 'other'
END
WHERE certification_type IS NULL;

-- Add RLS policies for certifications
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;

-- Students can see their own progress entries
CREATE POLICY "Students can view their own progress entries"
  ON public.progress_entries FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Mentors can view progress entries of their students
CREATE POLICY "Mentors can view their students progress entries"
  ON public.progress_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.profile_id = auth.uid()
      AND s.mentor_id = progress_entries.mentor_id
    )
  );

-- Students can insert their own progress entries
CREATE POLICY "Students can insert their own progress entries"
  ON public.progress_entries FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Mentors can update verification status and scores for their students
CREATE POLICY "Mentors can update their students progress entries"
  ON public.progress_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.profile_id = auth.uid()
      AND s.mentor_id = progress_entries.mentor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.profile_id = auth.uid()
      AND s.mentor_id = progress_entries.mentor_id
    )
  );