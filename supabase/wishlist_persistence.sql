-- =========================================================
-- OMETONG — WISHLIST PERSISTENCE (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- One JSON array of saved product ids per account — same pattern as
-- cart_persistence.sql. Covered by the existing owner-only RLS
-- policies on profiles, no new policies needed.
alter table public.profiles add column if not exists wishlist jsonb not null default '[]'::jsonb;
