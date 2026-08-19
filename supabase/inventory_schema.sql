-- =========================================================
-- OMETONG — INVENTORY / STOCK TRACKING (run in the Supabase SQL Editor)
-- Run this AFTER listings_schema.sql and orders_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Adds real, database-enforced stock tracking. Before this, nothing
-- stopped an order being placed for more units than a seller
-- actually had — there was no stock field on listings at all.
--
-- Design: available_quantity is NULLABLE. NULL means "not tracked" —
-- the seller is selling made-to-order / doesn't manage stock through
-- Ometong, and no limit is enforced (this is the default, so every
-- existing listing keeps working exactly as before). A real number
-- means "we're tracking this," and it's enforced: an order can never
-- be placed for more than what's available, checked and decremented
-- atomically in the same transaction as the order — a client can't
-- race past this by, say, opening two tabs and checking out twice at
-- once, because the check-and-decrement happens inside the database
-- trigger itself, not in the browser.
--
-- Cancelling or refunding an order restocks it automatically.
-- Idempotent — safe to run more than once.
-- =========================================================

-- ---------- listings: the stock field itself ----------
alter table public.listings add column if not exists available_quantity integer check (available_quantity >= 0);

comment on column public.listings.available_quantity is
  'NULL = not tracked (unlimited / made-to-order). A number = real stock, enforced at order time.';

-- ---------- enforce stock on order placement ----------
-- Runs once per row being inserted into order_items. Locks the
-- matching listing row (FOR UPDATE) so two simultaneous checkouts
-- for the same limited-stock listing can't both succeed past what's
-- actually available — the second one waits for the first
-- transaction to finish, then sees the already-decremented number.
create or replace function public.check_and_decrement_stock()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  current_stock integer;
begin
  if new.listing_id is null then
    return new; -- nothing to check against (e.g. a listing that was later deleted)
  end if;

  select available_quantity into current_stock
  from public.listings
  where id = new.listing_id
  for update;

  -- Listing not found, or available_quantity is NULL (not tracked) — no limit to enforce.
  if current_stock is null then
    return new;
  end if;

  if current_stock < new.qty then
    raise exception 'Only % left in stock for this item — please lower the quantity.', current_stock
      using errcode = 'P0001';
  end if;

  update public.listings
  set available_quantity = available_quantity - new.qty
  where id = new.listing_id;

  return new;
end;
$$;

drop trigger if exists check_and_decrement_stock_trigger on public.order_items;
create trigger check_and_decrement_stock_trigger
  before insert on public.order_items
  for each row execute function public.check_and_decrement_stock();

-- ---------- restock on cancel/refund ----------
-- Fires once per order whose status just changed. Only restocks
-- when the order is transitioning INTO cancelled/refunded FROM
-- something else — guards against restocking twice if a row somehow
-- gets updated again while already in a cancelled/refunded state.
create or replace function public.restock_on_order_cancelled()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status in ('cancelled', 'refunded') and old.status not in ('cancelled', 'refunded') then
    update public.listings l
    set available_quantity = l.available_quantity + oi.qty
    from public.order_items oi
    where oi.order_id = new.id
      and oi.listing_id = l.id
      and l.available_quantity is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists restock_on_order_cancelled_trigger on public.orders;
create trigger restock_on_order_cancelled_trigger
  after update on public.orders
  for each row execute function public.restock_on_order_cancelled();
