-- =========================================================
-- OMETONG — ORDER FULFILMENT ACCESS (run this in the Supabase SQL Editor)
-- Run this AFTER orders_schema.sql, admin_schema.sql (needs is_admin())
-- and marketplace_enhancements_schema.sql (order_status_history,
-- tracking_number/carrier/estimated_delivery, orders.updated_at all
-- come from there).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Gap this closes: nothing in the schema before this let a supplier
-- or manufacturer ever mark an order shipped, set a tracking number,
-- or otherwise touch `orders` — the only UPDATE policy on that table
-- was "Buyers can cancel their own pending orders". A seller had a
-- real order sitting in their dashboard with no way to move it
-- forward. This adds that, with a trigger that keeps a seller inside
-- the normal forward sequence (paid -> processing -> shipped ->
-- delivered) rather than letting them jump to, say, "refunded" —
-- cancellation/refunds stay a buyer/admin-only action.
-- =========================================================

-- ---------- sellers can update orders they fulfil ----------
-- Same row-level trust model as the rest of this schema (e.g.
-- profiles' own update policy): this is a row-level, not
-- column-level, grant — a seller could technically also touch
-- totals/shipping_address on a row they're allowed into. The
-- transition trigger below is what actually keeps status changes
-- safe; the frontend only ever exposes status/tracking_number/
-- carrier/estimated_delivery as editable fields.
drop policy if exists "Sellers can update orders they fulfil" on public.orders;
create policy "Sellers can update orders they fulfil"
  on public.orders for update
  using (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = orders.id
        and oi.supplier_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = orders.id
        and oi.supplier_id = auth.uid()
    )
  );

-- ---------- admins can update any order ----------
-- Needed for dispute handling / manual overrides — admin_schema.sql
-- only ever gave admins SELECT on orders, never UPDATE.
drop policy if exists "Admins can update any order" on public.orders;
create policy "Admins can update any order"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- keep sellers inside the normal forward sequence ----------
create or replace function public.restrict_seller_order_status_transitions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_seller boolean;
begin
  -- Only constrains a status change made by a SELLER on this order —
  -- the buyer's own cancel-while-pending policy and an admin's
  -- override are governed elsewhere and are left alone here.
  if new.status is distinct from old.status
     and auth.uid() is not null
     and not public.is_admin()
     and auth.uid() <> old.buyer_id
  then
    select exists (
      select 1 from public.order_items oi
      where oi.order_id = old.id and oi.supplier_id = auth.uid()
    ) into v_is_seller;

    if v_is_seller and not (
      (old.status = 'paid' and new.status = 'processing') or
      (old.status = 'processing' and new.status = 'shipped') or
      (old.status = 'shipped' and new.status = 'delivered')
    ) then
      raise exception 'Sellers can only move an order forward: paid -> processing -> shipped -> delivered.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists restrict_seller_order_status_transitions_trigger on public.orders;
create trigger restrict_seller_order_status_transitions_trigger
  before update on public.orders
  for each row execute function public.restrict_seller_order_status_transitions();
