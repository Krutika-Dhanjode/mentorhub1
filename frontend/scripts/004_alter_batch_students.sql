-- Add start_date and end_date to batch_students
ALTER TABLE public.batch_students
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;
