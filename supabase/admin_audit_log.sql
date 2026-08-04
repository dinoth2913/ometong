-- =========================================================
-- OMETONG — ADMIN AUDIT LOG
-- (run this in the Supabase SQL Editor)
-- Run this AFTER admin_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- ---------- admin_audit_log ----------
-- One row per tracked change: who did it, when, and what changed.
-- Rows are only ever written by SECURITY DEFINER trigger functions
-- below — there is deliberately no insert/update/delete policy for
-- ordinary clients, so nobody (not even an admin) can edit or erase
-- an entry through the app. Only admins can read it.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_is_admin boolean not null default false,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "Admins can view audit log"
  on public.admin_audit_log for select
  using (public.is_admin());

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log(created_at desc);

-- ---------- log listing approval / status changes ----------
create or replace function public.log_listing_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.is_approved is distinct from old.is_approved) or (new.status is distinct from old.status) then
    insert into public.admin_audit_log (actor_id, actor_is_admin, action, table_name, record_id, old_data, new_data)
    values (
      auth.uid(),
      public.is_admin(),
      case
        when new.is_approved is distinct from old.is_approved and new.is_approved = true then 'listing_approved'
        when new.status is distinct from old.status then 'listing_status_changed'
        else 'listing_updated'
      end,
      'listings',
      new.id,
      jsonb_build_object('is_approved', old.is_approved, 'status', old.status),
      jsonb_build_object('is_approved', new.is_approved, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_listing_change_trigger on public.listings;
create trigger log_listing_change_trigger
  after update on public.listings
  for each row execute function public.log_listing_change();

-- ---------- log role changes ----------
-- prevent_role_change.sql already blocks any role change made through
-- the app (auth.uid() is not null in that context) before it can ever
-- reach this trigger. In practice this only ever fires for the one
-- case that's still allowed: the site owner promoting an account to
-- admin directly in the SQL Editor (auth.uid() is null there) — which
-- is exactly the sensitive action worth having a permanent record of.
create or replace function public.log_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.admin_audit_log (actor_id, actor_is_admin, action, table_name, record_id, old_data, new_data)
    values (
      auth.uid(),
      public.is_admin(),
      'role_changed',
      'profiles',
      new.id,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_role_change_trigger on public.profiles;
create trigger log_role_change_trigger
  after update on public.profiles
  for each row execute function public.log_role_change();
