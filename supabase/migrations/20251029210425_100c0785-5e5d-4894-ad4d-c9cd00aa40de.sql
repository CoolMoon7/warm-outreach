-- Add new columns to contacts table for the full CSV data
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS company_domain TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile TEXT;

-- Delete contacts with empty emails first
DELETE FROM public.contacts WHERE email = '' OR email IS NULL;

-- Add unique constraint to prevent duplicate contacts (by email within a team)
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_email_team_unique UNIQUE (email, team_id);