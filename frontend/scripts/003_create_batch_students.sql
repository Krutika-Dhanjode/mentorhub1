-- Create batch_students table
CREATE TABLE IF NOT EXISTS public.batch_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate student assignments to the same batch
CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_students_batch_student_unique
  ON public.batch_students(batch_id, student_id);

-- Helpful lookup indexes
CREATE INDEX IF NOT EXISTS idx_batch_students_batch_id
  ON public.batch_students(batch_id);

CREATE INDEX IF NOT EXISTS idx_batch_students_student_id
  ON public.batch_students(student_id);
