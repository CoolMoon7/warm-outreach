-- Add platform enum and column to contacts, relax folder requirements
CREATE TYPE public.contact_platform AS ENUM ('email', 'linkedin', 'x');

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS platform public.contact_platform NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS x_handle text;

-- Allow contacts without a folder (folders are being removed from UI)
ALTER TABLE public.contacts ALTER COLUMN folder_id DROP NOT NULL;

-- Email is optional for linkedin/x contacts
ALTER TABLE public.contacts ALTER COLUMN email DROP NOT NULL;

-- Drop unique constraint on (email, team_id) if it exists, replace with conditional unique
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_team_id_key'
  ) THEN
    ALTER TABLE public.contacts DROP CONSTRAINT contacts_email_team_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_team_unique
  ON public.contacts (email, team_id) WHERE email IS NOT NULL;

-- Allow emails table records without folder
ALTER TABLE public.emails ALTER COLUMN folder_id DROP NOT NULL;