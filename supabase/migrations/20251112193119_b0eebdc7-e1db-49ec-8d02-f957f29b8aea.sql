-- Create enum type for contact status
CREATE TYPE contact_status AS ENUM ('not_sent', 'sent', 'responded', 'called', 'met_in_person', 'pitched', 'closed');

-- Add status column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN status contact_status DEFAULT 'not_sent';

-- Update existing records based on current state
UPDATE public.contacts 
SET status = CASE
  WHEN responded = true THEN 'responded'::contact_status
  WHEN last_contacted_at IS NOT NULL THEN 'sent'::contact_status
  ELSE 'not_sent'::contact_status
END;