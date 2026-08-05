-- =========================================================
-- OMETONG — CART PERSISTENCE (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- One JSON array per account, holding their current cart. Lives on
-- profiles rather than a separate table since a cart is small,
-- always read/written as a whole, and only ever needed by its owner
-- — the existing "Users can view/update own profile" RLS policies
-- on profiles already cover this column with no changes needed.
alter table public.profiles add column if not exists cart jsonb not null default '[]'::jsonb;
