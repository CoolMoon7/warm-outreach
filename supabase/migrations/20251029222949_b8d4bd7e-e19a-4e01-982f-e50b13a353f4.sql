-- Create a secure function for founders to remove a team member without RLS conflicts
create or replace function public.remove_team_member(_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  founder_team uuid;
  target_team uuid;
  is_founder boolean;
  target_is_founder boolean;
begin
  -- Ensure the caller is a founder
  select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'founder') into is_founder;
  if not is_founder then
    raise exception 'not_authorized';
  end if;

  -- Validate same team
  select team_id into founder_team from public.profiles where user_id = auth.uid();
  select team_id into target_team from public.profiles where user_id = _target_user_id;
  if founder_team is null or target_team is null or founder_team <> target_team then
    raise exception 'not_same_team';
  end if;

  -- Prevent removing another founder
  select exists(select 1 from public.user_roles where user_id = _target_user_id and role = 'founder') into target_is_founder;
  if target_is_founder then
    raise exception 'cannot_remove_founder';
  end if;

  -- Perform updates
  update public.profiles set team_id = null where user_id = _target_user_id;
  delete from public.user_roles where user_id = _target_user_id;
end;
$$;