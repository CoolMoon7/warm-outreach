-- Add invite_code column to teams table
ALTER TABLE public.teams 
ADD COLUMN invite_code TEXT UNIQUE;

-- Generate random invite codes for existing teams
UPDATE public.teams 
SET invite_code = substring(md5(random()::text) from 1 for 8)
WHERE invite_code IS NULL;