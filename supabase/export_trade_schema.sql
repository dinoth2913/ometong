-- =========================================================
-- OMETONG — EXPORT/TRADE INFRASTRUCTURE (run in the Supabase SQL Editor)
-- Run this AFTER schema.sql, listings_schema.sql, orders_schema.sql,
-- admin_schema.sql, marketplace_enhancements_schema.sql and
-- inventory_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Fills in the gaps found in a full backend audit against a real
-- B2B/export-trade schema checklist: vendor/business profile depth,
-- product variants, certifications, product documents, invoices,
-- shipments, shipping quotes, a real countries/currencies/tax
-- reference layer, customs/export documents, buyer-side
-- verification (KYC), and export-specific product fields
-- (incoterm/export_status/packaging_type/weights/dimensions).
--
-- This is the DATABASE layer only. None of it has frontend UI wired
-- up yet — that follows as separate, smaller changes so each one can
-- be built and tested properly, the same way every other feature on
-- this site has been. Every table here is inert (empty, unused) until
-- a page actually reads/writes it.
--
-- Idempotent — safe to run more than once.
-- =========================================================


-- =========================================================
-- 1. VENDOR PROFILES — extends profiles for supplier/manufacturer-
--    specific info, without touching the existing profiles table or
--    any of the many foreign keys already pointing at it. 1:1.
-- =========================================================
create table if not exists public.vendor_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  business_registration_number text,
  years_in_business integer check (years_in_business >= 0),
  production_capacity text,
  export_experience text,
  main_markets text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendor_profiles enable row level security;

drop policy if exists "Anyone can view vendor profiles" on public.vendor_profiles;
create policy "Anyone can view vendor profiles"
  on public.vendor_profiles for select
  using (true);

drop policy if exists "Owners manage their own vendor profile" on public.vendor_profiles;
create policy "Owners manage their own vendor profile"
  on public.vendor_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins manage all vendor profiles" on public.vendor_profiles;
create policy "Admins manage all vendor profiles"
  on public.vendor_profiles for all
  using (public.is_admin())
  with check (public.is_admin());


-- =========================================================
-- 2. BUSINESS PROFILES — legal/registration details. Kept separate
--    from vendor_profiles (and private, unlike it) since this holds
--    genuinely sensitive info: tax ID, registration number, legal
--    address. 1:1 with profiles, any role can have one.
-- =========================================================
create table if not exists public.business_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  legal_business_name text,
  registration_number text,
  tax_id text,
  incorporation_country text,
  registered_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

drop policy if exists "Owners manage their own business profile" on public.business_profiles;
create policy "Owners manage their own business profile"
  on public.business_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Admins manage all business profiles" on public.business_profiles;
create policy "Admins manage all business profiles"
  on public.business_profiles for all
  using (public.is_admin())
  with check (public.is_admin());


-- =========================================================
-- 3. PRODUCT VARIANTS — e.g. a t-shirt listing in Red/M, Red/L,
--    Blue/M... each can override price and/or stock independently
--    from the parent listing. attributes is free-form (color, size,
--    material, etc.) so this fits any product type without needing
--    a rigid schema per category.
-- =========================================================
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  variant_name text not null,
  sku text,
  price numeric check (price >= 0), -- null = inherit the parent listing's price
  available_quantity integer check (available_quantity >= 0), -- null = not tracked, same convention as listings.available_quantity
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;

drop policy if exists "Anyone can view variants of active listings" on public.product_variants;
create policy "Anyone can view variants of active listings"
  on public.product_variants for select
  using (
    exists (select 1 from public.listings l where l.id = product_variants.listing_id and l.status = 'active')
  );

drop policy if exists "Owners manage variants of their own listings" on public.product_variants;
create policy "Owners manage variants of their own listings"
  on public.product_variants for all
  using (exists (select 1 from public.listings l where l.id = product_variants.listing_id and l.supplier_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = product_variants.listing_id and l.supplier_id = auth.uid()));

drop policy if exists "Admins manage all product variants" on public.product_variants;
create policy "Admins manage all product variants"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists product_variants_listing_idx on public.product_variants(listing_id);


-- =========================================================
-- 4. CERTIFICATIONS — attachable to a vendor (profile_id) or a
--    specific product (listing_id), or both left as-is with exactly
--    one required — e.g. "ISO 9001" at the company level, or
--    "CE marking" on one specific listing.
-- =========================================================
create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  name text not null,
  issuing_body text,
  certificate_number text,
  issued_at date,
  expires_at date,
  file_url text,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  constraint certifications_attached_to_something check (profile_id is not null or listing_id is not null)
);

alter table public.certifications enable row level security;

drop policy if exists "Anyone can view certifications" on public.certifications;
create policy "Anyone can view certifications"
  on public.certifications for select
  using (true);

drop policy if exists "Owners manage their own certifications" on public.certifications;
create policy "Owners manage their own certifications"
  on public.certifications for all
  using (
    auth.uid() = profile_id
    or exists (select 1 from public.listings l where l.id = certifications.listing_id and l.supplier_id = auth.uid())
  )
  with check (
    auth.uid() = profile_id
    or exists (select 1 from public.listings l where l.id = certifications.listing_id and l.supplier_id = auth.uid())
  );

drop policy if exists "Admins manage all certifications" on public.certifications;
create policy "Admins manage all certifications"
  on public.certifications for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists certifications_profile_idx on public.certifications(profile_id);
create index if not exists certifications_listing_idx on public.certifications(listing_id);


-- =========================================================
-- 5. PRODUCT DOCUMENTS — generic file attachments on a listing
--    (datasheets, manuals, test reports...), separate from
--    listing_images which is specifically photos.
-- =========================================================
create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  doc_type text not null default 'other' check (doc_type in ('datasheet', 'manual', 'test_report', 'brochure', 'other')),
  file_url text not null,
  label text,
  created_at timestamptz not null default now()
);

alter table public.product_documents enable row level security;

drop policy if exists "Anyone can view documents of active listings" on public.product_documents;
create policy "Anyone can view documents of active listings"
  on public.product_documents for select
  using (
    exists (select 1 from public.listings l where l.id = product_documents.listing_id and l.status = 'active')
  );

drop policy if exists "Owners manage documents of their own listings" on public.product_documents;
create policy "Owners manage documents of their own listings"
  on public.product_documents for all
  using (exists (select 1 from public.listings l where l.id = product_documents.listing_id and l.supplier_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = product_documents.listing_id and l.supplier_id = auth.uid()));

drop policy if exists "Admins manage all product documents" on public.product_documents;
create policy "Admins manage all product documents"
  on public.product_documents for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists product_documents_listing_idx on public.product_documents(listing_id);

-- Reuses the pattern from listing_images' own storage bucket, just
-- for generic docs instead of photos, and not public — a datasheet
-- PDF doesn't need to be world-listable the way a product photo does,
-- callers get the URL from product_documents.file_url instead.
insert into storage.buckets (id, name, public)
values ('product-documents', 'product-documents', false)
on conflict (id) do nothing;

drop policy if exists "Owners can upload their own product documents" on storage.objects;
create policy "Owners can upload their own product documents"
  on storage.objects for insert
  with check (
    bucket_id = 'product-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Anyone can view product documents in storage" on storage.objects;
create policy "Anyone can view product documents in storage"
  on storage.objects for select
  using (bucket_id = 'product-documents');

drop policy if exists "Owners can delete their own product documents" on storage.objects;
create policy "Owners can delete their own product documents"
  on storage.objects for delete
  using (
    bucket_id = 'product-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- =========================================================
-- 6. CURRENCIES — real reference table. Everything on this
--    platform is hardcoded to USD today; this is the reference
--    layer real multi-currency display/conversion would build on
--    top of later. Seeded with the major world currencies.
-- =========================================================
create table if not exists public.currencies (
  code text primary key, -- ISO 4217, e.g. 'USD'
  name text not null,
  symbol text not null,
  created_at timestamptz not null default now()
);

alter table public.currencies enable row level security;

drop policy if exists "Anyone can read currencies" on public.currencies;
create policy "Anyone can read currencies"
  on public.currencies for select using (true);

drop policy if exists "Admins manage currencies" on public.currencies;
create policy "Admins manage currencies"
  on public.currencies for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.currencies (code, name, symbol) values
  ('USD', 'US Dollar', '$'),
  ('CAD', 'Canadian Dollar', 'CA$'),
  ('GBP', 'British Pound', '£'),
  ('EUR', 'Euro', '€'),
  ('AED', 'UAE Dirham', 'د.إ'),
  ('AUD', 'Australian Dollar', 'A$'),
  ('LKR', 'Sri Lankan Rupee', 'Rs'),
  ('INR', 'Indian Rupee', '₹'),
  ('CNY', 'Chinese Yuan', '¥'),
  ('JPY', 'Japanese Yen', '¥'),
  ('SGD', 'Singapore Dollar', 'S$'),
  ('HKD', 'Hong Kong Dollar', 'HK$'),
  ('NZD', 'New Zealand Dollar', 'NZ$'),
  ('CHF', 'Swiss Franc', 'CHF'),
  ('ZAR', 'South African Rand', 'R'),
  ('SAR', 'Saudi Riyal', '﷼'),
  ('QAR', 'Qatari Riyal', '﷼'),
  ('MYR', 'Malaysian Ringgit', 'RM'),
  ('THB', 'Thai Baht', '฿'),
  ('IDR', 'Indonesian Rupiah', 'Rp'),
  ('PKR', 'Pakistani Rupee', 'Rs'),
  ('BDT', 'Bangladeshi Taka', '৳'),
  ('NGN', 'Nigerian Naira', '₦'),
  ('BRL', 'Brazilian Real', 'R$'),
  ('MXN', 'Mexican Peso', 'MX$'),
  ('KRW', 'South Korean Won', '₩')
on conflict (code) do update
  set name = excluded.name, symbol = excluded.symbol;


-- =========================================================
-- 7. COUNTRIES — real reference table, validated against instead of
--    the free text used everywhere today (addresses.country,
--    rfqs.destination_country, orders.shipping_address). Seeded
--    with a broad, genuinely useful set covering every region —
--    starting with every market this platform actually serves
--    today, plus the other major trading nations.
-- =========================================================
create table if not exists public.countries (
  code text primary key, -- ISO 3166-1 alpha-2, e.g. 'US'
  name text not null,
  region text,
  currency_code text references public.currencies(code),
  sort_order integer not null default 0
);

alter table public.countries enable row level security;

drop policy if exists "Anyone can read countries" on public.countries;
create policy "Anyone can read countries"
  on public.countries for select using (true);

drop policy if exists "Admins manage countries" on public.countries;
create policy "Admins manage countries"
  on public.countries for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.countries (code, name, region, currency_code, sort_order) values
  ('CN', 'China', 'East Asia', 'CNY', 1),
  ('LK', 'Sri Lanka', 'South Asia', 'LKR', 2),
  ('US', 'United States', 'North America', 'USD', 3),
  ('CA', 'Canada', 'North America', 'CAD', 4),
  ('GB', 'United Kingdom', 'Europe', 'GBP', 5),
  ('DE', 'Germany', 'Europe', 'EUR', 6),
  ('FR', 'France', 'Europe', 'EUR', 7),
  ('AE', 'United Arab Emirates', 'Middle East', 'AED', 8),
  ('AU', 'Australia', 'Oceania', 'AUD', 9),
  ('IN', 'India', 'South Asia', 'INR', 10),
  ('IT', 'Italy', 'Europe', 'EUR', 20),
  ('ES', 'Spain', 'Europe', 'EUR', 21),
  ('NL', 'Netherlands', 'Europe', 'EUR', 22),
  ('BE', 'Belgium', 'Europe', 'EUR', 23),
  ('PL', 'Poland', 'Europe', 'EUR', 24),
  ('SE', 'Sweden', 'Europe', 'EUR', 25),
  ('IE', 'Ireland', 'Europe', 'EUR', 26),
  ('PT', 'Portugal', 'Europe', 'EUR', 27),
  ('AT', 'Austria', 'Europe', 'EUR', 28),
  ('CH', 'Switzerland', 'Europe', 'CHF', 29),
  ('DK', 'Denmark', 'Europe', 'EUR', 30),
  ('FI', 'Finland', 'Europe', 'EUR', 31),
  ('GR', 'Greece', 'Europe', 'EUR', 32),
  ('CZ', 'Czechia', 'Europe', 'EUR', 33),
  ('RO', 'Romania', 'Europe', 'EUR', 34),
  ('SA', 'Saudi Arabia', 'Middle East', 'SAR', 40),
  ('QA', 'Qatar', 'Middle East', 'QAR', 41),
  ('KW', 'Kuwait', 'Middle East', null, 42),
  ('BH', 'Bahrain', 'Middle East', null, 43),
  ('OM', 'Oman', 'Middle East', null, 44),
  ('IL', 'Israel', 'Middle East', null, 45),
  ('JP', 'Japan', 'East Asia', 'JPY', 50),
  ('KR', 'South Korea', 'East Asia', 'KRW', 51),
  ('SG', 'Singapore', 'Southeast Asia', 'SGD', 52),
  ('HK', 'Hong Kong', 'East Asia', 'HKD', 53),
  ('MY', 'Malaysia', 'Southeast Asia', 'MYR', 54),
  ('TH', 'Thailand', 'Southeast Asia', 'THB', 55),
  ('VN', 'Vietnam', 'Southeast Asia', null, 56),
  ('ID', 'Indonesia', 'Southeast Asia', 'IDR', 57),
  ('PH', 'Philippines', 'Southeast Asia', null, 58),
  ('TW', 'Taiwan', 'East Asia', null, 59),
  ('PK', 'Pakistan', 'South Asia', 'PKR', 60),
  ('BD', 'Bangladesh', 'South Asia', 'BDT', 61),
  ('NP', 'Nepal', 'South Asia', null, 62),
  ('NZ', 'New Zealand', 'Oceania', 'NZD', 70),
  ('ZA', 'South Africa', 'Africa', 'ZAR', 80),
  ('EG', 'Egypt', 'Africa', null, 81),
  ('NG', 'Nigeria', 'Africa', 'NGN', 82),
  ('KE', 'Kenya', 'Africa', null, 83),
  ('BR', 'Brazil', 'South America', 'BRL', 90),
  ('MX', 'Mexico', 'North America', 'MXN', 91),
  ('AR', 'Argentina', 'South America', null, 92),
  ('CL', 'Chile', 'South America', null, 93),
  ('CO', 'Colombia', 'South America', null, 94),
  ('RU', 'Russia', 'Europe', null, 100),
  ('TR', 'Turkey', 'Europe', null, 101)
on conflict (code) do update
  set name = excluded.name, region = excluded.region, currency_code = excluded.currency_code, sort_order = excluded.sort_order;


-- =========================================================
-- 8. TAX RATES — a real reference table checkout's flat orders.tax
--    number could compute against later, without ripping that
--    column out (still there, still what actually gets charged
--    today; this is the groundwork for computing it for real).
-- =========================================================
create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code),
  category text, -- null = applies to every category in that country
  rate_percent numeric not null check (rate_percent >= 0),
  label text, -- e.g. "VAT", "GST", "Sales Tax"
  created_at timestamptz not null default now(),
  unique (country_code, category)
);

alter table public.tax_rates enable row level security;

drop policy if exists "Anyone can read tax rates" on public.tax_rates;
create policy "Anyone can read tax rates"
  on public.tax_rates for select using (true);

drop policy if exists "Admins manage tax rates" on public.tax_rates;
create policy "Admins manage tax rates"
  on public.tax_rates for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.tax_rates (country_code, category, rate_percent, label) values
  ('US', null, 0, 'US import tariff (collected on delivery, varies by item)'),
  ('CA', null, 5, 'GST'),
  ('GB', null, 20, 'Import VAT'),
  ('DE', null, 19, 'VAT'),
  ('FR', null, 20, 'VAT'),
  ('AE', null, 5, 'VAT'),
  ('AU', null, 10, 'GST'),
  ('LK', null, 18, 'Import duty (varies by category)'),
  ('IN', null, 18, 'IGST (varies by category, often 30-55% combined with duty)')
on conflict (country_code, category) do update
  set rate_percent = excluded.rate_percent, label = excluded.label;


-- =========================================================
-- 9. INVOICES — one per order, admin/system-issued (not something
--    a buyer creates themselves).
-- =========================================================
create sequence if not exists public.invoice_number_seq;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  invoice_number text not null unique
    default ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  subtotal numeric not null check (subtotal >= 0),
  tax numeric not null default 0 check (tax >= 0),
  total numeric not null check (total >= 0),
  currency text not null default 'USD' references public.currencies(code),
  pdf_url text,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'overdue', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

drop policy if exists "Buyers can view invoices for their own orders" on public.invoices;
create policy "Buyers can view invoices for their own orders"
  on public.invoices for select
  using (exists (select 1 from public.orders o where o.id = invoices.order_id and o.buyer_id = auth.uid()));

drop policy if exists "Admins manage all invoices" on public.invoices;
create policy "Admins manage all invoices"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists invoices_order_idx on public.invoices(order_id);


-- =========================================================
-- 10. SHIPMENTS — a real table instead of the couple of columns
--     bolted onto orders. One order can have more than one shipment
--     (partial/split shipping); orders.tracking_number/carrier stay
--     as-is for backward compatibility with whatever already reads
--     them.
-- =========================================================
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  tracking_number text,
  status text not null default 'preparing' check (status in ('preparing', 'in_transit', 'delivered', 'returned', 'failed')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  origin_address jsonb,
  destination_address jsonb,
  created_at timestamptz not null default now()
);

alter table public.shipments enable row level security;

drop policy if exists "Buyers can view shipments for their own orders" on public.shipments;
create policy "Buyers can view shipments for their own orders"
  on public.shipments for select
  using (exists (select 1 from public.orders o where o.id = shipments.order_id and o.buyer_id = auth.uid()));

-- A supplier can see and update shipments for orders that include
-- one of their own listings — mirrors the existing pattern in
-- order_fulfillment_access_schema.sql for orders.tracking_number.
drop policy if exists "Suppliers can view shipments for their order items" on public.shipments;
create policy "Suppliers can view shipments for their order items"
  on public.shipments for select
  using (exists (
    select 1 from public.order_items oi
    where oi.order_id = shipments.order_id and oi.supplier_id = auth.uid()
  ));

drop policy if exists "Suppliers can manage shipments for their order items" on public.shipments;
create policy "Suppliers can manage shipments for their order items"
  on public.shipments for all
  using (exists (
    select 1 from public.order_items oi
    where oi.order_id = shipments.order_id and oi.supplier_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.order_items oi
    where oi.order_id = shipments.order_id and oi.supplier_id = auth.uid()
  ));

drop policy if exists "Admins manage all shipments" on public.shipments;
create policy "Admins manage all shipments"
  on public.shipments for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists shipments_order_idx on public.shipments(order_id);


-- =========================================================
-- 11. SHIPPING QUOTES — a quoted shipping cost, tied to either an
--     order (post-purchase, e.g. re-quoting a partial shipment) or
--     an RFQ (pre-purchase). Admin/staff-provided today, same as
--     everything else on this platform that involves a real dollar
--     figure — no live carrier-API integration exists yet.
-- =========================================================
create table if not exists public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  rfq_id uuid references public.rfqs(id) on delete cascade,
  carrier text,
  cost numeric not null check (cost >= 0),
  eta_days integer check (eta_days >= 0),
  provided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shipping_quotes_attached_to_something check (order_id is not null or rfq_id is not null)
);

alter table public.shipping_quotes enable row level security;

drop policy if exists "Buyers can view shipping quotes on their own orders/RFQs" on public.shipping_quotes;
create policy "Buyers can view shipping quotes on their own orders/RFQs"
  on public.shipping_quotes for select
  using (
    exists (select 1 from public.orders o where o.id = shipping_quotes.order_id and o.buyer_id = auth.uid())
    or exists (select 1 from public.rfqs r where r.id = shipping_quotes.rfq_id and r.buyer_id = auth.uid())
  );

drop policy if exists "Admins manage all shipping quotes" on public.shipping_quotes;
create policy "Admins manage all shipping quotes"
  on public.shipping_quotes for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists shipping_quotes_order_idx on public.shipping_quotes(order_id);
create index if not exists shipping_quotes_rfq_idx on public.shipping_quotes(rfq_id);


-- =========================================================
-- 12. CUSTOMS DOCUMENTS — commercial invoice, packing list,
--     certificate of origin, customs declaration... tied to an
--     order (this is what accompanies an actual shipment through
--     customs).
-- =========================================================
create table if not exists public.customs_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  doc_type text not null check (doc_type in ('commercial_invoice', 'packing_list', 'certificate_of_origin', 'customs_declaration', 'other')),
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'cleared', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.customs_documents enable row level security;

drop policy if exists "Buyers can view customs documents for their own orders" on public.customs_documents;
create policy "Buyers can view customs documents for their own orders"
  on public.customs_documents for select
  using (exists (select 1 from public.orders o where o.id = customs_documents.order_id and o.buyer_id = auth.uid()));

drop policy if exists "Admins manage all customs documents" on public.customs_documents;
create policy "Admins manage all customs documents"
  on public.customs_documents for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists customs_documents_order_idx on public.customs_documents(order_id);


-- =========================================================
-- 13. EXPORT DOCUMENTS — export license, phytosanitary certificate,
--     etc. Can attach to a specific order (this shipment) or a
--     listing (this product generally requires X to export).
-- =========================================================
create table if not exists public.export_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  doc_type text not null check (doc_type in ('export_license', 'certificate_of_origin', 'phytosanitary_certificate', 'fumigation_certificate', 'other')),
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint export_documents_attached_to_something check (order_id is not null or listing_id is not null)
);

alter table public.export_documents enable row level security;

drop policy if exists "Relevant parties can view export documents" on public.export_documents;
create policy "Relevant parties can view export documents"
  on public.export_documents for select
  using (
    exists (select 1 from public.orders o where o.id = export_documents.order_id and o.buyer_id = auth.uid())
    or exists (select 1 from public.listings l where l.id = export_documents.listing_id and l.supplier_id = auth.uid())
  );

drop policy if exists "Admins manage all export documents" on public.export_documents;
create policy "Admins manage all export documents"
  on public.export_documents for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists export_documents_order_idx on public.export_documents(order_id);
create index if not exists export_documents_listing_idx on public.export_documents(listing_id);


-- =========================================================
-- 14. BUYER VERIFICATION (KYC) — mirrors supplier_verification_docs
--     exactly (same shape, same reviewed-by-admin flow), just for
--     buyers, who currently have no identity verification at all.
--     Reuses the existing private 'verification-docs' storage
--     bucket — its storage policies are already keyed on
--     auth.uid() alone, not role, so nothing new is needed there.
-- =========================================================
create table if not exists public.buyer_verification_docs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('id_document', 'business_license', 'tax_certificate', 'other')),
  file_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.buyer_verification_docs enable row level security;

drop policy if exists "Buyers can view their own verification docs" on public.buyer_verification_docs;
create policy "Buyers can view their own verification docs"
  on public.buyer_verification_docs for select
  using (auth.uid() = buyer_id);

drop policy if exists "Buyers can upload their own verification docs" on public.buyer_verification_docs;
create policy "Buyers can upload their own verification docs"
  on public.buyer_verification_docs for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "Admins can view all buyer verification docs" on public.buyer_verification_docs;
create policy "Admins can view all buyer verification docs"
  on public.buyer_verification_docs for select
  using (public.is_admin());

drop policy if exists "Admins can review buyer verification docs" on public.buyer_verification_docs;
create policy "Admins can review buyer verification docs"
  on public.buyer_verification_docs for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists buyer_verification_docs_buyer_idx on public.buyer_verification_docs(buyer_id);

-- Same generic profiles.is_verified flag the supplier flow already
-- sets — it means "this identity has been checked," regardless of
-- which role the account is. A buyer approved here gets the same
-- flag a supplier gets from their own verification flow.
create or replace function public.sync_buyer_verified_flag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and new.doc_type in ('id_document', 'business_license') then
    update public.profiles set is_verified = true where id = new.buyer_id;
  end if;
  new.reviewed_at := case when new.status <> 'pending' then now() else new.reviewed_at end;
  return new;
end;
$$;

drop trigger if exists sync_buyer_verified_flag_trigger on public.buyer_verification_docs;
create trigger sync_buyer_verified_flag_trigger
  before update on public.buyer_verification_docs
  for each row execute function public.sync_buyer_verified_flag();


-- =========================================================
-- 15. PRODUCT EXPORT INFORMATION — the remaining export-specific
--     fields that don't already live on listings (hs_code and
--     country_of_origin already exist there since
--     listing_customs_fields.sql — deliberately NOT duplicated here
--     to avoid two copies of the same fact going out of sync). 1:1
--     with listings.
-- =========================================================
create table if not exists public.product_export_information (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  incoterm text check (incoterm in ('EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP')),
  export_status text not null default 'not_prepared' check (export_status in ('not_prepared', 'in_progress', 'ready', 'completed')),
  packaging_type text,
  net_weight_kg numeric check (net_weight_kg >= 0),
  gross_weight_kg numeric check (gross_weight_kg >= 0),
  dimensions_cm text, -- free text, e.g. "40 x 30 x 20"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_export_information enable row level security;

drop policy if exists "Anyone can view export info of active listings" on public.product_export_information;
create policy "Anyone can view export info of active listings"
  on public.product_export_information for select
  using (
    exists (select 1 from public.listings l where l.id = product_export_information.listing_id and l.status = 'active')
  );

drop policy if exists "Owners manage export info of their own listings" on public.product_export_information;
create policy "Owners manage export info of their own listings"
  on public.product_export_information for all
  using (exists (select 1 from public.listings l where l.id = product_export_information.listing_id and l.supplier_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = product_export_information.listing_id and l.supplier_id = auth.uid()));

drop policy if exists "Admins manage all product export information" on public.product_export_information;
create policy "Admins manage all product export information"
  on public.product_export_information for all
  using (public.is_admin())
  with check (public.is_admin());


-- =========================================================
-- 16. INCOTERM ON ORDERS — a listing's product_export_information
--     above holds the seller's default/stated terms; the actual
--     agreed term for one specific transaction can differ, so it
--     also lives directly on the order itself.
-- =========================================================
alter table public.orders add column if not exists incoterm text
  check (incoterm in ('EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'));
