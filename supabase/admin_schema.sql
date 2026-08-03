-- =========================================================
-- OMETONG — ADMIN ROLE + ADMIN DASHBOARD ACCESS
-- (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql, listings_schema.sql, listings_approval.sql,
-- prevent_role_change.sql and orders_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- ---------- allow 'admin' as a role ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('buyer', 'supplier', 'manufacturer', 'admin'));

-- ---------- allow promoting an account to admin via the SQL Editor ----------
-- prevent_role_change.sql (run earlier) blocks ANY role change, which is
-- correct for stopping a logged-in user from escalating their own role
-- through the app — but it also blocks you from promoting an account to
-- admin yourself. auth.uid() is only ever set when a request comes in
-- through the app's API (PostgREST) with a user's session; it's null when
-- you run SQL directly here in the SQL Editor. So this version keeps
-- blocking role changes made by an app user, but allows the ones you make
-- yourself here.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Changing your account role is not allowed.';
  end if;
  return new;
end;
$$;

-- ---------- is_admin() helper ----------
-- A SECURITY DEFINER function (not a view) so it can safely check the
-- caller's own role without recursively re-triggering RLS on profiles,
-- and without exposing anything beyond a true/false answer.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- profiles: admin can view every account ----------
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- ---------- listings: admin can view and manage every listing ----------
create policy "Admins can view all listings"
  on public.listings for select
  using (public.is_admin());

create policy "Admins can update all listings"
  on public.listings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- orders: admin can view every order ----------
create policy "Admins can view all orders"
  on public.orders for select
  using (public.is_admin());

-- ---------- order_items: admin can view every order's items ----------
create policy "Admins can view all order items"
  on public.order_items for select
  using (public.is_admin());

-- ---------- payments: admin can view every payment ----------
create policy "Admins can view all payments"
  on public.payments for select
  using (public.is_admin());

-- =========================================================
-- HOW TO CREATE YOUR FIRST ADMIN ACCOUNT
-- 1. Sign up normally on the site (as a buyer, supplier — doesn't matter).
-- 2. Come back here and run, with your own email:
--
--    update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- 3. Log out and back in on the site. You'll now land on admindashboard.html.
-- =========================================================
