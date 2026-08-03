-- =========================================================
-- OMETONG — LISTINGS SCHEMA (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql. Same steps: SQL Editor -> New query
-- -> paste -> Run.
-- =========================================================

-- ---------- listings ----------
-- One row per product or service a supplier/manufacturer has added.
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  price numeric not null check (price >= 0),
  moq integer check (moq >= 1),
  lead_time_days integer check (lead_time_days >= 0),
  description text,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

-- Buyers (and anyone, including logged-out visitors) can see active listings.
create policy "Anyone can view active listings"
  on public.listings for select
  using (status = 'active');

-- A supplier/manufacturer can always see their own listings, active or paused.
create policy "Owners can view their own listings"
  on public.listings for select
  using (auth.uid() = supplier_id);

-- A supplier/manufacturer can only ever create listings under their own account.
create policy "Owners can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = supplier_id);

-- A supplier/manufacturer can only ever edit their own listings.
create policy "Owners can update their own listings"
  on public.listings for update
  using (auth.uid() = supplier_id)
  with check (auth.uid() = supplier_id);

-- A supplier/manufacturer can only ever delete their own listings.
create policy "Owners can delete their own listings"
  on public.listings for delete
  using (auth.uid() = supplier_id);

create index if not exists listings_supplier_id_idx on public.listings(supplier_id);
create index if not exists listings_status_idx on public.listings(status);
