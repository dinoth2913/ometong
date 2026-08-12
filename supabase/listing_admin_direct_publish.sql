-- =========================================================
-- OMETONG — ADMIN CAN PUBLISH LISTINGS DIRECTLY
-- (run this in the Supabase SQL Editor, AFTER listings_approval.sql
-- and admin_schema.sql — needs public.is_admin())
--
-- Until now, add-listing.html was reachable by supplier/manufacturer
-- accounts only in practice, and every listing always inserted with
-- is_approved defaulting to false — nothing in the RLS insert policy
-- actually stopped a crafted request from setting is_approved=true
-- directly, it just never happened because the UI never sent it.
-- This closes that gap for real (only an admin may ever insert a
-- pre-approved row) and is what lets add-listing.js publish an
-- admin's own listing immediately instead of queuing it for review —
-- an admin approving their own submission would be a formality, not
-- a real check.
-- =========================================================

drop policy if exists "Owners can insert their own listings" on public.listings;
create policy "Owners can insert their own listings"
  on public.listings for insert
  with check (
    auth.uid() = supplier_id
    and (is_approved = false or public.is_admin())
  );
