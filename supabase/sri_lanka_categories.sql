-- =========================================================
-- OMETONG — SRI LANKA EXPORT CATEGORIES (run in the Supabase SQL Editor)
-- Run this AFTER categories_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Adds two categories that didn't fit anywhere in the existing
-- taxonomy — Rubber Products and Gems & Jewelry — both genuine major
-- Sri Lankan export sectors (tires/rubber gloves, sapphires/cut
-- diamonds). Mirrors the same two categories added to
-- Frontend/js/taxonomy.js; keep both in sync if this changes again.
-- Idempotent — safe to run more than once.
-- =========================================================

insert into public.categories (slug, label, icon, sort_order) values
  ('rubber', 'Rubber Products', '⚫', 10),
  ('gems',   'Gems & Jewelry',  '💎', 11)
on conflict (slug) do update
  set label = excluded.label, icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.subcategories (category_slug, slug, label, sort_order) values
  ('rubber', 'solid-industrial-tires', 'Industrial & Solid Rubber Tires', 1),
  ('rubber', 'pneumatic-tires', 'Pneumatic Tires', 2),
  ('rubber', 'rubber-gloves', 'Medical & Industrial Rubber Gloves', 3),
  ('rubber', 'other-rubber-products', 'Other Rubber Products', 4),

  ('gems', 'sapphires', 'Sapphires', 1),
  ('gems', 'diamonds', 'Cut & Polished Diamonds', 2),
  ('gems', 'other-gemstones', 'Other Gemstones & Jewelry', 3)
on conflict (category_slug, slug) do update
  set label = excluded.label, sort_order = excluded.sort_order;
