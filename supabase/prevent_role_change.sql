-- =========================================================
-- OMETONG — PREVENT ROLE SELF-ESCALATION (run in Supabase SQL Editor)
-- Safe to run any time — replaces the trigger if it already exists.
-- =========================================================

-- The "Users can update own profile" policy in schema.sql lets a user
-- update their own row, but RLS only controls which ROWS are visible —
-- not which COLUMNS can change. Without this, any logged-in user could
-- run supabase.from('profiles').update({ role: 'supplier' }) directly
-- from the browser console and grant themselves a different role.
-- This trigger blocks that at the database level, regardless of what
-- the frontend does or doesn't check.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Changing your account role is not allowed.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_change_trigger on public.profiles;
create trigger prevent_role_change_trigger
  before update on public.profiles
  for each row execute function public.prevent_role_change();
