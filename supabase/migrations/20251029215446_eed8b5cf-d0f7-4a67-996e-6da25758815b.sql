-- Create function to get team id by invite code (case-insensitive)
CREATE OR REPLACE FUNCTION public.get_team_id_by_invite(_invite text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.teams
  WHERE lower(invite_code) = lower(_invite)
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_id_by_invite(text) TO authenticated;

-- Helpful index for faster lookup by invite code
CREATE INDEX IF NOT EXISTS idx_teams_invite_code_lower ON public.teams ((lower(invite_code)));

-- Allow users to delete their own roles (so members can leave teams cleanly)
DROP POLICY IF EXISTS "Users can delete their own roles" ON public.user_roles;
CREATE POLICY "Users can delete their own roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (user_id = auth.uid());