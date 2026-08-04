-- =========================================================
-- OMETONG — CUSTOMS FIELDS ON LISTINGS
-- (run this in the Supabase SQL Editor)
-- Run this AFTER listings_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

alter table public.listings add column if not exists hs_code text;
alter table public.listings add column if not exists country_of_origin text;
