-- =========================================================
-- OMETONG — BULK / TIERED PRICING (run this in the Supabase SQL Editor)
-- Run this AFTER listings_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- listings.price was always a single flat per-unit price — no way
-- for a seller to offer a better rate at higher quantities, which is
-- the normal way bulk buying works on a B2B sourcing marketplace
-- (buy 500 units at a lower per-unit price than buying 50). This
-- adds real quantity price breaks; listings.price stays exactly as
-- it is and keeps working as the base/default rate for quantities
-- below the lowest tier (or for any listing with no tiers at all —
-- bulk pricing is optional, not required).
-- =========================================================

create table if not exists public.listing_price_tiers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  min_qty integer not null check (min_qty >= 1),
  price_per_unit numeric not null check (price_per_unit >= 0),
  created_at timestamptz not null default now(),
  unique (listing_id, min_qty)
);

alter table public.listing_price_tiers enable row level security;

-- Public reference data for a listing — same trust level as
-- listing_images, everyone needs to see the price breaks to shop.
drop policy if exists "Anyone can view price tiers" on public.listing_price_tiers;
create policy "Anyone can view price tiers"
  on public.listing_price_tiers for select
  using (true);

drop policy if exists "Owners can manage their own price tiers" on public.listing_price_tiers;
create policy "Owners can manage their own price tiers"
  on public.listing_price_tiers for all
  using (
    exists (select 1 from public.listings l where l.id = listing_price_tiers.listing_id and l.supplier_id = auth.uid())
  )
  with check (
    exists (select 1 from public.listings l where l.id = listing_price_tiers.listing_id and l.supplier_id = auth.uid())
  );

create index if not exists listing_price_tiers_listing_idx on public.listing_price_tiers(listing_id, min_qty);

-- ---------- resolve the right unit price for a given quantity ----------
-- Picks the highest min_qty tier that's still <= the requested
-- quantity, falling back to the listing's own base price if there
-- are no tiers (or the quantity doesn't reach the lowest one).
-- SECURITY INVOKER is fine here — it only ever reads data that's
-- already public (the tiers/price policies above are both `using(true)`
-- for active listings), so no elevated privilege is needed; keeping
-- it security invoker (the default) is the more conservative choice.
create or replace function public.get_bulk_unit_price(p_listing_id uuid, p_qty integer)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select price_per_unit
      from public.listing_price_tiers
      where listing_id = p_listing_id and min_qty <= p_qty
      order by min_qty desc
      limit 1
    ),
    (select price from public.listings where id = p_listing_id)
  );
$$;

grant execute on function public.get_bulk_unit_price(uuid, integer) to anon, authenticated;
