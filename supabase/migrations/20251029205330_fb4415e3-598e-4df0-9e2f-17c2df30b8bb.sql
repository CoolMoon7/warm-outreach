-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in their team" ON public.profiles;

-- Create a security definer function to get user's team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Recreate the policy using the function
CREATE POLICY "Users can view profiles in their team"
ON public.profiles
FOR SELECT
USING (
  team_id = public.get_user_team_id(auth.uid())
  OR user_id = auth.uid()
);