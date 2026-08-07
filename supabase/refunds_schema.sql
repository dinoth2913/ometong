-- =========================================================
-- OMETONG — REFUNDS (run this in the Supabase SQL Editor)
-- Run this AFTER orders_schema.sql, admin_schema.sql (needs
-- is_admin()) and marketplace_enhancements_schema.sql (needs
-- order_status_history, notify_user()/notifications).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- What existed before this: 'refunded' was a valid value in
-- orders.status and payments.status, and nothing else — no way for
-- a buyer to ask for one, nowhere for staff to review it, and (until
-- order_fulfillment_access_schema.sql) not even a policy that let
-- anyone actually set that status. This adds the real workflow:
-- buyer requests -> admin reviews (approve/reject) -> admin marks it
-- processed once the money has actually moved. That last step stays
-- a manual admin action rather than something automatic, the same
-- way payments.status stays 'pending'/manual until a real payment
-- provider is wired in (see orders_schema.sql's payments table) —
-- there's no gateway yet to actually call a refund API against.
-- =========================================================

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  -- null = refund covers the whole order; set = just one line item.
  order_item_id uuid references public.order_items(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  -- what the buyer is asking for; admin can adjust before approving
  -- (e.g. a partial refund) via requested_amount vs approved_amount.
  requested_amount numeric not null check (requested_amount >= 0),
  approved_amount numeric check (approved_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'processed')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.refund_requests enable row level security;

-- A buyer can see their own refund requests.
create policy "Buyers can view their own refund requests"
  on public.refund_requests for select
  using (auth.uid() = buyer_id);

-- A buyer can only request a refund on an order that's actually
-- theirs and has progressed far enough to have been paid for —
-- no refunding something still pending payment or already
-- cancelled/refunded.
create policy "Buyers can request a refund on their own paid orders"
  on public.refund_requests for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.orders o
      where o.id = refund_requests.order_id
        and o.buyer_id = auth.uid()
        and o.status in ('paid', 'processing', 'shipped', 'delivered', 'completed')
    )
  );

-- A seller whose item is on this order can see the request too —
-- they're the one who fulfilled it and may be asked what happened.
create policy "Sellers can view refund requests on orders they fulfil"
  on public.refund_requests for select
  using (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = refund_requests.order_id
        and oi.supplier_id = auth.uid()
    )
  );

create policy "Admins can view all refund requests"
  on public.refund_requests for select
  using (public.is_admin());

-- Only admins review/approve/reject/mark-processed — a buyer can't
-- approve their own refund by editing the row.
create policy "Admins can review refund requests"
  on public.refund_requests for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists refund_requests_order_idx on public.refund_requests(order_id);
create index if not exists refund_requests_buyer_idx on public.refund_requests(buyer_id);
create index if not exists refund_requests_status_idx on public.refund_requests(status, created_at desc);

-- One open request per order at a time — stops a buyer from
-- spamming duplicate requests on the same order while one is still
-- pending review.
create unique index if not exists refund_requests_one_pending_per_order
  on public.refund_requests(order_id)
  where status = 'pending';

-- ---------- reviewed_at + payment/order sync ----------
-- Approving marks reviewed_at; marking 'processed' is the point
-- where staff has actually returned the money (manually, via
-- whatever channel was used to pay — see the comment at the top of
-- this file), so that's also when the order/payment rows themselves
-- flip to 'refunded'. Rejecting just records that decision.
create or replace function public.sync_refund_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();

    if new.status = 'processed' then
      update public.orders set status = 'refunded' where id = new.order_id;
      update public.payments set status = 'refunded' where order_id = new.order_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_refund_status_trigger on public.refund_requests;
create trigger sync_refund_status_trigger
  before update on public.refund_requests
  for each row execute function public.sync_refund_status();

-- ---------- notifications ----------
-- New request -> every admin. Decision -> the buyer.
create or replace function public.notify_new_refund_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid;
begin
  for v_admin_id in select id from public.profiles where role = 'admin' loop
    perform public.notify_user(
      v_admin_id,
      'refund_request',
      'New refund request',
      left(new.reason, 140),
      '/Frontend/html/admindashboard.html#refunds'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_new_refund_request_trigger on public.refund_requests;
create trigger notify_new_refund_request_trigger
  after insert on public.refund_requests
  for each row execute function public.notify_new_refund_request();

create or replace function public.notify_refund_decision()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected', 'processed') then
    perform public.notify_user(
      new.buyer_id,
      'refund_decision',
      case new.status
        when 'approved' then 'Refund approved'
        when 'processed' then 'Refund processed'
        else 'Refund request declined'
      end,
      new.admin_note,
      '/Frontend/html/buyerdashboard.html'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_refund_decision_trigger on public.refund_requests;
create trigger notify_refund_decision_trigger
  after update on public.refund_requests
  for each row execute function public.notify_refund_decision();
