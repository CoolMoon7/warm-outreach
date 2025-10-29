-- Add role column to contacts if not exists (might be covered by job_title already)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS role TEXT;

-- Note: We already have job_title and linkedin_profile columns from previous migration