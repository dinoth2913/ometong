-- =========================================================
-- OMETONG — CATEGORIES & SUBCATEGORIES (run in the Supabase SQL Editor)
-- Run this AFTER listings_schema.sql and admin_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Two-level taxonomy: category -> subcategory. Shape follows the
-- Google Product Taxonomy convention (Category > Subcategory) with
-- the breadth of a B2B marketplace, so e.g. Apparel splits into
-- men's / women's / kids' lines the way buyers actually shop.
--
-- The same list is mirrored in Frontend/js/taxonomy.js so the UI can
-- render filters instantly without waiting on a round-trip. If you
-- add rows here, add them there too (single place in the frontend).
-- =========================================================

create table if not exists public.categories (
  slug text primary key,
  label text not null,
  icon text,
  sort_order integer not null default 0
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references public.categories(slug) on delete cascade,
  slug text not null,
  label text not null,
  sort_order integer not null default 0,
  unique (category_slug, slug)
);

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

-- The taxonomy is public reference data — everyone needs to read it
-- to browse, including logged-out visitors.
drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories for select using (true);

drop policy if exists "Anyone can read subcategories" on public.subcategories;
create policy "Anyone can read subcategories"
  on public.subcategories for select using (true);

-- Only admins can change the taxonomy itself.
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
  on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage subcategories" on public.subcategories;
create policy "Admins manage subcategories"
  on public.subcategories for all
  using (public.is_admin()) with check (public.is_admin());

create index if not exists subcategories_category_idx on public.subcategories(category_slug, sort_order);

-- ---------- listings get a subcategory ----------
-- Stores the subcategory SLUG (e.g. 'mens-t-shirts'). Nullable, so
-- every existing listing stays valid and sellers can leave it blank.
alter table public.listings add column if not exists subcategory text;
create index if not exists listings_subcategory_idx on public.listings(subcategory);

-- ---------- seed ----------
insert into public.categories (slug, label, icon, sort_order) values
  ('electronics',  'Electronics',      '🔌', 1),
  ('apparel',      'Apparel & Clothing','👕', 2),
  ('textiles',     'Textiles & Fabrics','🧵', 3),
  ('machinery',    'Machinery',        '⚙',  4),
  ('food',         'Food & Beverage',  '🍽', 5),
  ('construction', 'Construction',     '🏗', 6),
  ('packaging',    'Packaging',        '📦', 7),
  ('services',     'Services',         '🛠', 8),
  ('logistics',    'Logistics',        '🚚', 9)
on conflict (slug) do update
  set label = excluded.label, icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.subcategories (category_slug, slug, label, sort_order) values
  -- Electronics
  ('electronics','smartphones-tablets','Smartphones & Tablets',1),
  ('electronics','computers-laptops','Computers & Laptops',2),
  ('electronics','consumer-audio','Consumer Audio',3),
  ('electronics','home-appliances','Home Appliances',4),
  ('electronics','industrial-electronics','Industrial Electronics & Sensors',5),
  ('electronics','lighting-led','Lighting & LED',6),
  ('electronics','components-semiconductors','Components & Semiconductors',7),
  ('electronics','cables-accessories','Cables & Accessories',8),

  -- Apparel & Clothing
  ('apparel','mens-t-shirts','Men''s T-Shirts',1),
  ('apparel','mens-shirts','Men''s Shirts',2),
  ('apparel','mens-trousers','Men''s Trousers & Jeans',3),
  ('apparel','mens-outerwear','Men''s Outerwear',4),
  ('apparel','mens-activewear','Men''s Activewear',5),
  ('apparel','womens-tops','Women''s Tops & Blouses',6),
  ('apparel','womens-dresses','Women''s Dresses',7),
  ('apparel','womens-trousers','Women''s Trousers & Skirts',8),
  ('apparel','womens-activewear','Women''s Activewear (Gym)',9),
  ('apparel','womens-officewear','Women''s Officewear',10),
  ('apparel','kids-clothing','Kids'' & Baby Clothing',11),
  ('apparel','uniforms-workwear','Uniforms & Workwear',12),
  ('apparel','footwear','Footwear',13),
  ('apparel','bags-accessories','Bags & Accessories',14),

  -- Textiles & Fabrics
  ('textiles','woven-fabrics','Woven Fabrics',1),
  ('textiles','knitted-fabrics','Knitted Fabrics',2),
  ('textiles','yarn-thread','Yarn & Thread',3),
  ('textiles','denim','Denim',4),
  ('textiles','technical-textiles','Technical & Industrial Textiles',5),
  ('textiles','home-textiles','Home Textiles',6),
  ('textiles','leather-synthetics','Leather & Synthetics',7),

  -- Machinery
  ('machinery','cnc-machine-tools','CNC & Machine Tools',1),
  ('machinery','packaging-machinery','Packaging Machinery',2),
  ('machinery','food-machinery','Food Processing Machinery',3),
  ('machinery','textile-machinery','Textile Machinery',4),
  ('machinery','construction-machinery','Construction Machinery',5),
  ('machinery','pumps-compressors','Pumps & Compressors',6),
  ('machinery','motors-drives','Motors & Drives',7),
  ('machinery','spare-parts','Spare Parts & Components',8),

  -- Food & Beverage
  ('food','spices-seasonings','Spices & Seasonings',1),
  ('food','tea-coffee','Tea & Coffee',2),
  ('food','nuts-dried-fruit','Nuts & Dried Fruit',3),
  ('food','edible-oils','Edible Oils',4),
  ('food','grains-pulses','Grains & Pulses',5),
  ('food','beverages','Beverages',6),
  ('food','snacks-confectionery','Snacks & Confectionery',7),
  ('food','seafood','Seafood',8),

  -- Construction
  ('construction','cement-aggregates','Cement & Aggregates',1),
  ('construction','steel-rebar','Steel & Rebar',2),
  ('construction','pipes-fittings','Pipes & Fittings',3),
  ('construction','roofing-cladding','Roofing & Cladding',4),
  ('construction','doors-windows','Doors & Windows',5),
  ('construction','tiles-flooring','Tiles & Flooring',6),
  ('construction','paints-coatings','Paints & Coatings',7),
  ('construction','tools-hardware','Tools & Hardware',8),

  -- Packaging
  ('packaging','corrugated-boxes','Corrugated Boxes',1),
  ('packaging','flexible-packaging','Flexible Packaging & Film',2),
  ('packaging','bottles-jars','Bottles & Jars',3),
  ('packaging','labels-printing','Labels & Printing',4),
  ('packaging','protective-packaging','Protective Packaging',5),
  ('packaging','pallets-crates','Pallets & Crates',6),
  ('packaging','bags-sacks','Bags & Sacks',7),

  -- Services
  ('services','quality-inspection','Quality Inspection',1),
  ('services','sourcing-vetting','Sourcing & Supplier Vetting',2),
  ('services','customs-documentation','Customs & Documentation',3),
  ('services','product-design','Product Design',4),
  ('services','certification-testing','Certification & Testing',5),
  ('services','warehousing','Warehousing',6),
  ('services','marketing-photography','Marketing & Photography',7),

  -- Logistics
  ('logistics','sea-freight','Sea Freight',1),
  ('logistics','air-freight','Air Freight',2),
  ('logistics','road-freight','Road Freight',3),
  ('logistics','rail-freight','Rail Freight',4),
  ('logistics','courier-express','Courier & Express',5),
  ('logistics','cold-chain','Cold Chain',6),
  ('logistics','customs-brokerage','Customs Brokerage',7),
  ('logistics','last-mile','Last-Mile Delivery',8)
on conflict (category_slug, slug) do update
  set label = excluded.label, sort_order = excluded.sort_order;
