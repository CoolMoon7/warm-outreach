-- Add a trigger to automatically assign founder role when creating a team
CREATE OR REPLACE FUNCTION public.assign_founder_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_user_id uuid;
BEGIN
  -- Get the user_id of the profile that was just updated with this team_id
  SELECT user_id INTO creator_user_id
  FROM public.profiles
  WHERE team_id = NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Insert founder role for the creator
  IF creator_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (creator_user_id, 'founder')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on teams table
DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_founder_role();

-- Add RLS policies for user_roles table to allow team founders to view team member roles
CREATE POLICY "Team founders can view team member roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1
    WHERE p1.user_id = auth.uid()
    AND p1.team_id IN (
      SELECT p2.team_id FROM public.profiles p2
      WHERE p2.user_id = user_roles.user_id
    )
    AND public.has_role(auth.uid(), 'founder')
  )
);

-- Allow users to delete their own team membership when they're removed by founder
CREATE POLICY "Users can be removed from teams by founders"
ON public.profiles
FOR UPDATE
USING (
  -- The user being updated is not the founder
  NOT public.has_role(user_id, 'founder')
  AND
  -- The person doing the update is a founder of the same team
  EXISTS (
    SELECT 1 FROM public.profiles founder_profile
    WHERE founder_profile.user_id = auth.uid()
    AND founder_profile.team_id = profiles.team_id
    AND public.has_role(auth.uid(), 'founder')
  )
);

-- Allow founders to delete user_roles when removing members
CREATE POLICY "Founders can delete member roles"
ON public.user_roles
FOR DELETE
USING (
  NOT public.has_role(user_id, 'founder')
  AND
  EXISTS (
    SELECT 1 FROM public.profiles p1
    INNER JOIN public.profiles p2 ON p1.team_id = p2.team_id
    WHERE p1.user_id = auth.uid()
    AND p2.user_id = user_roles.user_id
    AND public.has_role(auth.uid(), 'founder')
  )
);