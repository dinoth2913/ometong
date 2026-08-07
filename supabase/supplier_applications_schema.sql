-- =========================================================
-- OMETONG — SUPPLIER APPLICATIONS (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql, admin_schema.sql (needs is_admin()) and
-- marketplace_enhancements_schema.sql (needs notify_user() /
-- public.notifications for the new-application alert below).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- The "Apply to become a verified supplier" form on Supplier.html
-- previously saved submissions into that one visitor's own browser
-- localStorage and nothing else — nobody on the team ever saw them,
-- and the "our team reviews within 2-3 business days" promise on the
-- page had nothing real behind it. This gives it a real backend,
-- same pattern as contact_messages_schema.sql: anyone (a visitor
-- applying is not necessarily signed up yet) can submit one, only
-- admins can read them back and decide, and staff follow up by
-- emailing the applicant directly — an approved/rejected application
-- doesn't automatically create or promote an account, since the
-- applicant may not have signed up on Ometong at all yet.
-- =========================================================

create table if not exists public.supplier_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_email text not null,
  category text not null,
  details text,
  -- filled in automatically if the applicant happened to be logged
  -- in already; null is the common case (applying comes before
  -- signing up).
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.supplier_applications enable row level security;

-- Anyone can apply — including a logged-out visitor, which is the
-- normal case for this form.
drop policy if exists "Anyone can submit a supplier application" on public.supplier_applications;
create policy "Anyone can submit a supplier application"
  on public.supplier_applications for insert
  with check (true);

-- Reading is admin-only: there's no applicant-facing status page,
-- the follow-up happens by email same as contact_messages.
drop policy if exists "Admins can view supplier applications" on public.supplier_applications;
create policy "Admins can view supplier applications"
  on public.supplier_applications for select
  using (public.is_admin());

drop policy if exists "Admins can update supplier applications" on public.supplier_applications;
create policy "Admins can update supplier applications"
  on public.supplier_applications for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists supplier_applications_status_idx on public.supplier_applications(status, created_at desc);

-- Notify every admin the moment a new application comes in.
create or replace function public.notify_new_supplier_application()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid;
begin
  for v_admin_id in select id from public.profiles where role = 'admin' loop
    perform public.notify_user(
      v_admin_id,
      'supplier_application',
      'New supplier application',
      new.company_name || ' — ' || new.category,
      '/Frontend/html/admindashboard.html#applications'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_new_supplier_application_trigger on public.supplier_applications;
create trigger notify_new_supplier_application_trigger
  after insert on public.supplier_applications
  for each row execute function public.notify_new_supplier_application();

-- Track when a decision was made, the same way contact_messages does.
create or replace function public.set_supplier_application_reviewed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_supplier_application_reviewed_trigger on public.supplier_applications;
create trigger set_supplier_application_reviewed_trigger
  before update on public.supplier_applications
  for each row execute function public.set_supplier_application_reviewed();
