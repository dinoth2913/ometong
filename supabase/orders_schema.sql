-- =========================================================
-- OMETONG — ORDERS & PAYMENTS SCHEMA (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql, listings_schema.sql and listings_approval.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- Reminder: after adding the AI module, when a customer asks for some
-- product through the chat system, that product should be shown on the
-- marketplace by AI as a fully AI-driven listing or suggestion.

-- ---------- orders ----------
-- One row per checkout. Holds the order-level totals and shipping
-- details; the individual line items live in order_items below.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded')),
  subtotal numeric not null check (subtotal >= 0),
  tax numeric not null default 0 check (tax >= 0),
  shipping numeric not null default 0 check (shipping >= 0),
  discount numeric not null default 0 check (discount >= 0),
  total numeric not null check (total >= 0),
  promo_code text,
  shipping_address jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- A buyer can see their own orders.
create policy "Buyers can view their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id);

-- A buyer can only ever create an order for themselves.
create policy "Buyers can insert their own orders"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

-- A buyer can cancel their own order only while it's still pending
-- (unpaid). Once it's paid, status changes are driven by the payment
-- provider / fulfilment flow, not the client.
create policy "Buyers can cancel their own pending orders"
  on public.orders for update
  using (auth.uid() = buyer_id and status = 'pending')
  with check (auth.uid() = buyer_id and status in ('pending', 'cancelled'));

create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_status_idx on public.orders(status);

-- ---------- order_items ----------
-- One row per line item in an order. listing_id is nullable because
-- cart items can be demo/recommended items that aren't real listings
-- rows yet; supplier_id is stored directly on the item (not just via
-- the listing) so seller visibility still works even if a listing is
-- later deleted or wasn't a real listing to begin with.
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  supplier_id uuid references auth.users(id) on delete set null,
  title text not null,
  price numeric not null check (price >= 0),
  qty integer not null check (qty >= 1),
  line_total numeric not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

alter table public.order_items enable row level security;

-- A buyer can see the items of their own orders.
create policy "Buyers can view their own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.buyer_id = auth.uid()
    )
  );

-- A supplier/manufacturer can see order items that are theirs to fulfil.
create policy "Sellers can view their own order items"
  on public.order_items for select
  using (auth.uid() = supplier_id);

-- A buyer can only insert items into an order that belongs to them.
create policy "Buyers can insert items into their own orders"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.buyer_id = auth.uid()
    )
  );

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_supplier_id_idx on public.order_items(supplier_id);

-- A supplier/manufacturer can see any order that contains at least
-- one of their own listings (so they know they have something to fulfil),
-- without seeing orders that don't involve them. Defined here, after
-- order_items exists, since this policy references that table.
create policy "Sellers can view orders containing their items"
  on public.orders for select
  using (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = orders.id
        and oi.supplier_id = auth.uid()
    )
  );

-- ---------- payments ----------
-- One row per payment attempt against an order. provider/provider_payment_id
-- are left generic so a real gateway (e.g. Airwallex) can be wired in later
-- without changing this table. status progresses pending -> held (escrow) ->
-- released (paid out to seller) or refunded — those later transitions should
-- only ever be made by a trusted server process (Edge Function/webhook), not
-- directly by the client, which is why there is no client update policy.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'manual',
  provider_payment_id text,
  amount numeric not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'held', 'released', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

-- A buyer can see the payment record(s) for their own orders.
create policy "Buyers can view payments for their own orders"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and o.buyer_id = auth.uid()
    )
  );

-- A buyer can create the initial (pending) payment row for their own order.
-- Any further status change (held/released/refunded/failed) must come from
-- a trusted server process once a real payment provider is integrated.
create policy "Buyers can insert a pending payment for their own order"
  on public.payments for insert
  with check (
    status = 'pending'
    and exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and o.buyer_id = auth.uid()
    )
  );

create index if not exists payments_order_id_idx on public.payments(order_id);
