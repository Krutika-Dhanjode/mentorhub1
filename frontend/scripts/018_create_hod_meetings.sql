-- Migration: Create hod_meetings table for HOD-to-Mentor meeting scheduling
-- This table stores meetings that the HOD schedules with individual mentors.

CREATE TABLE IF NOT EXISTS hod_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hod_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'HOD Meeting',
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE hod_meetings ENABLE ROW LEVEL SECURITY;

-- Policy: HODs can insert their own meetings
CREATE POLICY "HODs can insert their own meetings"
    ON hod_meetings
    FOR INSERT
    WITH CHECK (auth.uid() = hod_id);

-- Policy: HODs can view their own meetings
CREATE POLICY "HODs can view their own meetings"
    ON hod_meetings
    FOR SELECT
    USING (auth.uid() = hod_id OR auth.uid() = mentor_id);

-- Policy: HODs can update their own meetings
CREATE POLICY "HODs can update their own meetings"
    ON hod_meetings
    FOR UPDATE
    USING (auth.uid() = hod_id);

-- Policy: HODs can delete their own meetings
CREATE POLICY "HODs can delete their own meetings"
    ON hod_meetings
    FOR DELETE
    USING (auth.uid() = hod_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_hod_meetings_hod_id ON hod_meetings(hod_id);
CREATE INDEX IF NOT EXISTS idx_hod_meetings_mentor_id ON hod_meetings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_hod_meetings_scheduled_at ON hod_meetings(scheduled_at);
