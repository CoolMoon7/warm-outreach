-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert teams" ON public.teams;

-- Recreate the policy with proper authentication check
CREATE POLICY "Users can insert teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);