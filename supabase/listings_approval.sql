-- =========================================================
-- OMETONG — LISTINGS APPROVAL GATE (run this in the Supabase SQL Editor)
-- Run this AFTER listings_schema.sql. Safe to run even if you've
-- already run listings_schema.sql before — every statement here
-- either checks "if exists" first or replaces the exact same policy.
-- =========================================================

-- New listings start unapproved. Until this is true, a listing only
-- shows on its owner's own dashboard — never on the public marketplace.
-- Approve one by opening Table Editor -> listings -> ticking is_approved
-- for that row (until a dedicated admin page exists for this).
alter table public.listings add column if not exists is_approved boolean not null default false;

-- Replace the public "view active listings" policy so the marketplace
-- only ever shows listings that are both active AND approved.
drop policy if exists "Anyone can view active listings" on public.listings;
create policy "Anyone can view active listings"
  on public.listings for select
  using (status = 'active' and is_approved = true);

-- ---------- public supplier names for the marketplace ----------
-- The marketplace needs to show a seller's business name next to
-- their listings, but profiles are otherwise private (a buyer's
-- email shouldn't be visible to strangers). This view exposes only
-- the safe, public-facing fields for supplier/manufacturer accounts —
-- never buyer profiles, never email or other private fields.
create or replace view public.public_supplier_profiles as
  select id, business_name, full_name, role
  from public.profiles
  where role in ('supplier', 'manufacturer');

grant select on public.public_supplier_profiles to anon, authenticated;
