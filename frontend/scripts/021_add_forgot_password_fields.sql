-- Add fields for Forgot Password OTP flow
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP WITH TIME ZONE;
