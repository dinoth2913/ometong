-- =========================================================
-- OMETONG — LISTING WARRANTY + ADDITIONAL SPECS
-- Sellers had nowhere to add a warranty or any other extra product
-- detail (material, power rating, certification, etc.) beyond the
-- free-text description. This adds:
--   warranty: a short plain-text field (e.g. "1 Year Manufacturer
--     Warranty", "No warranty").
--   specs: a flexible list of {label, value} pairs so a seller can
--     add as many extra details as the product needs, without a
--     fixed schema per category.
-- Shown on the big product-details page only — the small
-- marketplace/search card is intentionally left untouched.
-- =========================================================

alter table public.listings add column if not exists warranty text;
alter table public.listings add column if not exists specs jsonb not null default '[]'::jsonb;

comment on column public.listings.warranty is 'Short plain-text warranty terms, shown on the product details page.';
comment on column public.listings.specs is 'Array of {"label": text, "value": text} extra product details, shown on the product details page.';
