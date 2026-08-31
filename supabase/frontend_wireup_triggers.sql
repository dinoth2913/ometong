-- =========================================================
-- OMETONG — WIRE UP invoices / shipments (run in the Supabase SQL Editor)
-- Run this AFTER export_trade_schema.sql (needs invoices, shipments,
-- orders, order_items — all defined there).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- export_trade_schema.sql created the invoices/shipments tables but
-- nothing ever wrote a row into either one — this adds the triggers
-- that actually populate them from real order activity, so the new
-- frontend (invoice view, shipment history) has real data to show
-- instead of an always-empty table.
--
-- Idempotent — safe to run more than once.
-- =========================================================


-- =========================================================
-- 1. AUTO-CREATE AN INVOICE WHEN AN ORDER IS PLACED
--    A pro-forma invoice the moment the order exists (status
--    'unpaid', matching invoices.status's own default) rather than
--    waiting for a "paid" transition — this platform has no live
--    payment gateway wired up yet (see PayPal note in project notes),
--    so "paid" never actually happens today; waiting for it would
--    mean invoices never got created at all.
-- =========================================================
create or replace function public.create_invoice_for_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.invoices (order_id, subtotal, tax, total, currency)
  values (new.id, new.subtotal, new.tax, new.total, 'USD');
  return new;
end;
$$;

drop trigger if exists create_invoice_for_order_trigger on public.orders;
create trigger create_invoice_for_order_trigger
  after insert on public.orders
  for each row execute function public.create_invoice_for_order();


-- =========================================================
-- 2. KEEP THE INVOICE'S STATUS IN SYNC WITH THE ORDER
--    Best-effort mirror, not a source of truth of its own — an admin
--    can still hand-edit an invoice's status directly if a real
--    exception ever needs it (e.g. a partial payment).
-- =========================================================
create or replace function public.sync_invoice_status_from_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.invoices
    set status = case
      when new.status in ('paid', 'processing', 'shipped', 'delivered', 'completed') then 'paid'
      when new.status = 'cancelled' then 'cancelled'
      when new.status = 'refunded' then 'cancelled'
      else status
    end
    where order_id = new.id
      -- never resurrect an invoice an admin has deliberately overridden
      -- to something outside this mirrored set
      and status in ('unpaid', 'paid', 'overdue', 'cancelled');
  end if;
  return new;
end;
$$;

drop trigger if exists sync_invoice_status_from_order_trigger on public.orders;
create trigger sync_invoice_status_from_order_trigger
  after update of status on public.orders
  for each row execute function public.sync_invoice_status_from_order();


-- =========================================================
-- 3. AUTO-LOG A SHIPMENT ROW WHENEVER A SELLER SAVES SHIPPING
--    DETAILS (carrier/tracking number) — mirrors what
--    orderTracking.js's "Save shipping details" already writes onto
--    orders.carrier/tracking_number, into the real shipments table
--    too, so multi-shipment history actually exists somewhere. One
--    row per distinct (order, tracking_number) pair — re-saving the
--    same tracking number just updates that row instead of
--    duplicating it.
-- =========================================================
create or replace function public.sync_shipment_from_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_shipment_status text;
  v_existing_id uuid;
begin
  if new.tracking_number is null then
    return new;
  end if;

  v_shipment_status := case
    when new.status in ('delivered', 'completed') then 'delivered'
    when new.status = 'shipped' then 'in_transit'
    when new.status = 'returned' then 'returned'
    else 'preparing'
  end;

  select id into v_existing_id
  from public.shipments
  where order_id = new.id and tracking_number = new.tracking_number
  limit 1;

  if v_existing_id is null then
    insert into public.shipments (order_id, carrier, tracking_number, status, shipped_at, delivered_at, destination_address)
    values (
      new.id, new.carrier, new.tracking_number, v_shipment_status,
      case when v_shipment_status in ('in_transit', 'delivered') then now() else null end,
      case when v_shipment_status = 'delivered' then now() else null end,
      new.shipping_address
    );
  else
    update public.shipments
    set carrier = new.carrier,
        status = v_shipment_status,
        shipped_at = coalesce(shipped_at, case when v_shipment_status in ('in_transit', 'delivered') then now() else null end),
        delivered_at = coalesce(delivered_at, case when v_shipment_status = 'delivered' then now() else null end)
    where id = v_existing_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_shipment_from_order_trigger on public.orders;
create trigger sync_shipment_from_order_trigger
  after update of carrier, tracking_number, status on public.orders
  for each row execute function public.sync_shipment_from_order();
