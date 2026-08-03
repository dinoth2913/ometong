-- =========================================================
-- OMETONG — FIX: replace the SECURITY DEFINER view with a
-- narrow SECURITY DEFINER function (run this in the Supabase SQL Editor)
-- Run this AFTER listings_approval.sql. Fixes the Supabase linter's
-- "Security Definer View" warning on public.public_supplier_profiles.
--
-- Why: a SECURITY DEFINER view runs with the view creator's
-- privileges for its ENTIRE definition, which is hard to audit if the
-- view is ever changed later. A SECURITY DEFINER function is safer
-- here because it has an explicit, fixed, reviewable set of columns
-- it will ever return — nothing more.
-- =========================================================

drop view if exists public.public_supplier_profiles;

create or replace function public.get_public_supplier_profiles(supplier_ids uuid[])
returns table (id uuid, business_name text, full_name text, role text)
language sql
security definer
set search_path = public
stable
as $$
  select id, business_name, full_name, role
  from public.profiles
  where id = any(supplier_ids)
    and role in ('supplier', 'manufacturer');
$$;

grant execute on function public.get_public_supplier_profiles(uuid[]) to anon, authenticated;
