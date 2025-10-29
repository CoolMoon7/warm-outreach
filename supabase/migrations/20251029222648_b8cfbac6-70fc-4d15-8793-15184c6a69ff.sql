-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can be removed from teams by founders" ON public.profiles;

-- Create a better policy that checks team relationship using a security definer function
CREATE OR REPLACE FUNCTION public.can_founder_update_member(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p1
    JOIN profiles p2 ON p1.team_id = p2.team_id
    WHERE p1.user_id = auth.uid()
      AND p2.user_id = _target_user_id
      AND p1.team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'founder'
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = _target_user_id AND role = 'founder'
      )
  );
$$;

-- Create new policy using the function
CREATE POLICY "Founders can remove members from their team"
ON public.profiles
FOR UPDATE
USING (can_founder_update_member(user_id));