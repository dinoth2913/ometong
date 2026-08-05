-- =========================================================
-- OMETONG — REVIEWS & RATINGS (run this in the Supabase SQL Editor)
-- Run this AFTER orders_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- ---------- reviews ----------
-- One row per (order item, buyer) — a buyer can only review something
-- they actually bought, and only once per item. supplier_id/listing_id
-- are copied from the order item at review time so marketplace/product
-- pages can query reviews directly without joining through orders.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  supplier_id uuid references auth.users(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_item_id)
);

alter table public.reviews enable row level security;

-- Reviews are public — buyers deciding whether to purchase need to see
-- them, including logged-out visitors browsing the marketplace.
create policy "Anyone can view reviews"
  on public.reviews for select
  using (true);

-- A buyer can only review an order item that is (a) theirs and
-- (b) actually delivered/completed — no reviewing something you
-- haven't received yet.
create policy "Buyers can review their own delivered order items"
  on public.reviews for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.buyer_id = auth.uid()
        and o.status in ('delivered', 'completed')
    )
    and exists (
      select 1 from public.order_items oi
      where oi.id = reviews.order_item_id
        and oi.order_id = reviews.order_id
    )
  );

-- A buyer can edit their own review (fix a typo, change their mind).
create policy "Buyers can update their own reviews"
  on public.reviews for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

-- A buyer can delete their own review.
create policy "Buyers can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = buyer_id);

create index if not exists reviews_listing_id_idx on public.reviews(listing_id);
create index if not exists reviews_supplier_id_idx on public.reviews(supplier_id);
create index if not exists reviews_buyer_id_idx on public.reviews(buyer_id);
