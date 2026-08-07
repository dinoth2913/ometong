-- =========================================================
-- OMETONG — MARKETPLACE ENHANCEMENTS (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql, listings_schema.sql, listings_approval.sql,
-- orders_schema.sql and admin_schema.sql (needs is_admin()).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Fills in the gaps a B2B sourcing marketplace like this one needs
-- next: staff-mediated buyer/supplier messaging (company policy: no
-- direct contact between them), RFQs (the standard "ask for a quote"
-- flow on Alibaba-style platforms — also routed through staff), a
-- real address book, shipment tracking + status history, multiple
-- photos per listing, promo codes that actually validate,
-- notifications, and supplier KYB (know-your-business) verification
-- documents.
-- =========================================================

-- ---------- shared: updated_at helper ----------
-- Generic trigger function so any table can get a self-maintaining
-- updated_at column without duplicating this logic everywhere.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =========================================================
-- 1. MEDIATED MESSAGING (buyers and suppliers never message each
-- other directly — company policy: every contact goes through
-- Ometong staff.)
--
-- Shape: one "inquiry" (a case, e.g. about a listing or an order)
-- has TWO separate channels hanging off it:
--   - buyer_admin   — only the buyer and admins can read/write
--   - supplier_admin — only the supplier and admins can read/write
-- The buyer never sees the supplier_admin channel and vice versa —
-- that's enforced by RLS below, not just app logic, so there is no
-- way for the frontend to accidentally leak one party's message to
-- the other. When something needs to cross over, an admin reads
-- both channels and manually posts a relay message into the other
-- one (as sender_role 'admin') — which also gives staff a natural
-- point to redact phone numbers/emails/etc. per company policy
-- before anything reaches the other party.
--
-- This intentionally replaces the direct buyer<->supplier thread
-- model an earlier draft of this file had — that violated the "must
-- go through us" rule, so it was never shipped.
-- =========================================================

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references auth.users(id) on delete cascade,
  -- text, not a uuid fk, on purpose: mirrors product_reviews.product_ref
  -- so an inquiry can start from either a real listing or a demo-catalog
  -- product until the demo catalog is fully replaced by real listings.
  listing_ref text,
  order_id uuid references public.orders(id) on delete set null,
  subject text,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  buyer_unread_count integer not null default 0,
  supplier_unread_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

-- A buyer or supplier can see the case exists (subject/status), but
-- NOT each other's messages — that gate is on inquiry_messages below.
create policy "Participants can view their own inquiries"
  on public.inquiries for select
  using (auth.uid() = buyer_id or auth.uid() = supplier_id);

-- Only a buyer can open a case (reaching out about a listing/order);
-- the supplier is looped in by staff, never opens their own directly.
create policy "Buyers can open an inquiry"
  on public.inquiries for insert
  with check (auth.uid() = buyer_id);

create policy "Admins can view all inquiries"
  on public.inquiries for select
  using (public.is_admin());

create policy "Admins can update any inquiry"
  on public.inquiries for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists inquiries_buyer_idx on public.inquiries(buyer_id, last_message_at desc);
create index if not exists inquiries_supplier_idx on public.inquiries(supplier_id, last_message_at desc);

create table if not exists public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  -- which one-sided channel this message belongs to.
  channel text not null check (channel in ('buyer_admin', 'supplier_admin')),
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('buyer', 'supplier', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.inquiry_messages enable row level security;

-- Buyer can only ever see the buyer_admin channel of their own case.
create policy "Buyer can view their own channel"
  on public.inquiry_messages for select
  using (
    channel = 'buyer_admin'
    and exists (select 1 from public.inquiries i where i.id = inquiry_messages.inquiry_id and i.buyer_id = auth.uid())
  );

create policy "Buyer can message their own channel"
  on public.inquiry_messages for insert
  with check (
    channel = 'buyer_admin'
    and sender_role = 'buyer'
    and sender_id = auth.uid()
    and exists (select 1 from public.inquiries i where i.id = inquiry_messages.inquiry_id and i.buyer_id = auth.uid())
  );

-- Supplier can only ever see the supplier_admin channel of their own case.
create policy "Supplier can view their own channel"
  on public.inquiry_messages for select
  using (
    channel = 'supplier_admin'
    and exists (select 1 from public.inquiries i where i.id = inquiry_messages.inquiry_id and i.supplier_id = auth.uid())
  );

create policy "Supplier can message their own channel"
  on public.inquiry_messages for insert
  with check (
    channel = 'supplier_admin'
    and sender_role = 'supplier'
    and sender_id = auth.uid()
    and exists (select 1 from public.inquiries i where i.id = inquiry_messages.inquiry_id and i.supplier_id = auth.uid())
  );

-- Admin sees and can post into BOTH channels of every case — this is
-- the only account type that ever sees both sides, which is the
-- entire point of the "contact through us" policy.
create policy "Admins can view every channel"
  on public.inquiry_messages for select
  using (public.is_admin());

create policy "Admins can post into either channel"
  on public.inquiry_messages for insert
  with check (public.is_admin() and sender_role = 'admin' and sender_id = auth.uid());

create index if not exists inquiry_messages_inquiry_idx on public.inquiry_messages(inquiry_id, channel, created_at);

-- Keep last_message_at and the relevant unread counter current on
-- every new message, so inboxes (including the admin queue) can sort
-- and badge without extra queries.
create or replace function public.touch_inquiry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.inquiries i
     set last_message_at = now(),
         buyer_unread_count = case when new.channel = 'buyer_admin' and new.sender_role = 'admin' then i.buyer_unread_count + 1 else i.buyer_unread_count end,
         supplier_unread_count = case when new.channel = 'supplier_admin' and new.sender_role = 'admin' then i.supplier_unread_count + 1 else i.supplier_unread_count end
   where i.id = new.inquiry_id;
  return new;
end;
$$;

drop trigger if exists touch_inquiry_trigger on public.inquiry_messages;
create trigger touch_inquiry_trigger
  after insert on public.inquiry_messages
  for each row execute function public.touch_inquiry();

-- =========================================================
-- 2. RFQs — "Request for Quote"
-- The standard B2B sourcing flow (as on Alibaba/Made-in-China): a
-- buyer describes what they need — quantity, target price, category
-- — without picking one listing first, and suppliers who deal in
-- that category respond with a price/lead-time quote.
-- =========================================================

create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  category_slug text references public.categories(slug) on delete set null,
  subcategory text,
  title text not null,
  description text,
  quantity integer check (quantity >= 1),
  target_price numeric check (target_price >= 0),
  destination_country text,
  status text not null default 'open' check (status in ('open', 'closed', 'awarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rfqs enable row level security;

-- RFQs are visible to any logged-in account — suppliers need to
-- browse open ones to respond, the same way listings are browsable.
create policy "Logged-in users can view open RFQs"
  on public.rfqs for select
  using (auth.uid() is not null);

create policy "Buyers can view their own RFQs regardless of status"
  on public.rfqs for select
  using (auth.uid() = buyer_id);

create policy "Buyers can create their own RFQs"
  on public.rfqs for insert
  with check (auth.uid() = buyer_id);

create policy "Buyers can update their own RFQs"
  on public.rfqs for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "Admins can view all RFQs"
  on public.rfqs for select
  using (public.is_admin());

create index if not exists rfqs_buyer_idx on public.rfqs(buyer_id);
create index if not exists rfqs_category_idx on public.rfqs(category_slug, status);

drop trigger if exists rfqs_set_updated_at on public.rfqs;
create trigger rfqs_set_updated_at
  before update on public.rfqs
  for each row execute function public.set_updated_at();

-- A supplier's quote is a direct pitch to one specific buyer, so it
-- goes through the same "must go through us" gate as messaging:
-- suppliers submit, staff reviews (and can redact any contact info
-- typed into `message`), and only a 'relayed' quote is ever visible
-- to the buyer it's for.
create table if not exists public.rfq_responses (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references auth.users(id) on delete cascade,
  quoted_price numeric not null check (quoted_price >= 0),
  lead_time_days integer check (lead_time_days >= 0),
  message text,
  status text not null default 'submitted' check (status in ('submitted', 'relayed')),
  created_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);

alter table public.rfq_responses enable row level security;

-- The RFQ's own buyer only ever sees quotes staff has relayed —
-- never a supplier's raw, unreviewed submission.
create policy "Buyer can view relayed responses to their own RFQ"
  on public.rfq_responses for select
  using (
    status = 'relayed'
    and exists (select 1 from public.rfqs r where r.id = rfq_responses.rfq_id and r.buyer_id = auth.uid())
  );

create policy "Suppliers can view their own responses"
  on public.rfq_responses for select
  using (auth.uid() = supplier_id);

create policy "Suppliers can submit a response"
  on public.rfq_responses for insert
  with check (auth.uid() = supplier_id and status = 'submitted');

-- A supplier can edit their own quote only while it's still pending
-- review — once staff has relayed it to the buyer, it's final.
create policy "Suppliers can update their own unrelayed response"
  on public.rfq_responses for update
  using (auth.uid() = supplier_id and status = 'submitted')
  with check (auth.uid() = supplier_id and status = 'submitted');

create policy "Admins can view all RFQ responses"
  on public.rfq_responses for select
  using (public.is_admin());

-- Only staff can mark a quote 'relayed' (i.e. actually forward it to
-- the buyer), and can edit its text on the way through to strip out
-- anything that would let the two parties bypass Ometong.
create policy "Admins can review and relay RFQ responses"
  on public.rfq_responses for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists rfq_responses_rfq_idx on public.rfq_responses(rfq_id);
create index if not exists rfq_responses_supplier_idx on public.rfq_responses(supplier_id);

-- =========================================================
-- 3. BUYER ADDRESS BOOK
-- Checkout currently freezes shipping_address as a jsonb blob on the
-- order (fine for what was shipped), but there was nowhere to save
-- an address for reuse next time. This lets checkout offer "use a
-- saved address" and set a default.
-- =========================================================

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  full_name text not null,
  phone text,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "Users can view their own addresses"
  on public.addresses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own addresses"
  on public.addresses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own addresses"
  on public.addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own addresses"
  on public.addresses for delete
  using (auth.uid() = user_id);

create index if not exists addresses_user_idx on public.addresses(user_id);

-- Only one default address per user — clears any previous default
-- whenever a new one is marked default, so the app never has to.
create or replace function public.enforce_single_default_address()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id
       and id <> new.id
       and is_default = true;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_default_address_trigger on public.addresses;
create trigger enforce_single_default_address_trigger
  before insert or update on public.addresses
  for each row execute function public.enforce_single_default_address();

-- =========================================================
-- 4. ORDER STATUS HISTORY + SHIPMENT TRACKING
-- orders.status only ever holds the CURRENT state — there was no
-- record of when it changed or who changed it, and no tracking
-- number field for shipped orders.
-- =========================================================

alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists estimated_delivery date;
alter table public.orders add column if not exists updated_at timestamptz not null default now();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.order_status_history enable row level security;

create policy "Buyers can view their own order history"
  on public.order_status_history for select
  using (
    exists (select 1 from public.orders o where o.id = order_status_history.order_id and o.buyer_id = auth.uid())
  );

create policy "Sellers can view history for orders they fulfil"
  on public.order_status_history for select
  using (
    exists (
      select 1 from public.order_items oi
      where oi.order_id = order_status_history.order_id
        and oi.supplier_id = auth.uid()
    )
  );

create policy "Admins can view all order history"
  on public.order_status_history for select
  using (public.is_admin());

create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at);

-- Every status change is recorded automatically — nothing in the app
-- has to remember to log it separately.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), null);
  end if;
  return new;
end;
$$;

drop trigger if exists log_order_status_change_trigger on public.orders;
create trigger log_order_status_change_trigger
  after update on public.orders
  for each row execute function public.log_order_status_change();

-- Backfill one "pending" row for every order that already exists, so
-- history isn't empty for orders placed before this migration.
insert into public.order_status_history (order_id, status, created_at)
select id, status, created_at from public.orders
where not exists (
  select 1 from public.order_status_history h where h.order_id = orders.id
);

-- =========================================================
-- 5. MULTIPLE LISTING IMAGES
-- listings.image_url (from listing_images_storage.sql) only ever
-- held one photo. This adds a proper gallery, keeping image_url as
-- the cover photo for backward compatibility with existing code.
-- =========================================================

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.listing_images enable row level security;

create policy "Anyone can view listing images rows"
  on public.listing_images for select
  using (true);

create policy "Owners can manage their own listing image rows"
  on public.listing_images for all
  using (
    exists (select 1 from public.listings l where l.id = listing_images.listing_id and l.supplier_id = auth.uid())
  )
  with check (
    exists (select 1 from public.listings l where l.id = listing_images.listing_id and l.supplier_id = auth.uid())
  );

create index if not exists listing_images_listing_idx on public.listing_images(listing_id, sort_order);

-- =========================================================
-- 6. COUPONS / PROMO CODES
-- orders.promo_code was free-text with nothing behind it to validate
-- against or track usage — anyone could type anything. This adds a
-- real coupons table; validating/applying a code still happens in
-- application code (checkout.js), this just gives it something real
-- to check against.
-- =========================================================

create table if not exists public.coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  amount numeric not null check (amount >= 0),
  min_order_total numeric not null default 0 check (min_order_total >= 0),
  max_uses integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- A coupon's discount details need to be readable to validate it at
-- checkout, including for logged-out visitors browsing a cart.
create policy "Anyone can view active coupons"
  on public.coupons for select
  using (is_active = true);

create policy "Admins manage coupons"
  on public.coupons for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================
-- 7. NOTIFICATIONS
-- A generic per-user notification feed — order updates, new
-- messages, RFQ responses, listing approvals — so the frontend has
-- one place to poll/subscribe instead of stitching several tables
-- together on every page load.
-- =========================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications are only ever written by trusted server-side trigger
-- functions below — no direct client insert policy, so a user can't
-- forge a notification to themselves or anyone else.
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where is_read = false;

create or replace function public.notify_user(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link_url text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link_url)
  values (p_user_id, p_type, p_title, p_body, p_link_url);
end;
$$;

-- Notify a buyer whenever their order's status changes.
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.notify_user(
      new.buyer_id,
      'order_status',
      'Order update',
      'Your order is now ' || new.status || '.',
      '/Frontend/html/buyerdashboard.html'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_order_status_change_trigger on public.orders;
create trigger notify_order_status_change_trigger
  after update on public.orders
  for each row execute function public.notify_order_status_change();

-- Inquiries are staff-mediated (see section 1), so a new message
-- never notifies "the other party" directly — it notifies whoever is
-- meant to see that specific channel next:
--   - buyer/supplier writes in  -> every admin gets notified (someone
--     needs to pick it up and decide what, if anything, to relay).
--   - admin writes into a channel -> that channel's own buyer/supplier
--     gets notified (staff has replied to them).
create or replace function public.notify_new_inquiry_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_supplier_id uuid;
  v_admin_id uuid;
begin
  select buyer_id, supplier_id into v_buyer_id, v_supplier_id
  from public.inquiries where id = new.inquiry_id;

  if new.sender_role = 'admin' then
    perform public.notify_user(
      case when new.channel = 'buyer_admin' then v_buyer_id else v_supplier_id end,
      'inquiry_reply',
      'Ometong replied to your inquiry',
      left(new.body, 140),
      '/Frontend/html/messages.html'
    );
  else
    -- A buyer or supplier wrote in: every admin needs to see it, since
    -- there is no direct line to the other party for them to fall back on.
    for v_admin_id in select id from public.profiles where role = 'admin' loop
      perform public.notify_user(
        v_admin_id,
        'inquiry_new_message',
        'New inquiry message',
        left(new.body, 140),
        '/Frontend/html/admindashboard.html'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_new_inquiry_message_trigger on public.inquiry_messages;
create trigger notify_new_inquiry_message_trigger
  after insert on public.inquiry_messages
  for each row execute function public.notify_new_inquiry_message();

-- Notify a buyer when staff relays a supplier's RFQ quote to them.
create or replace function public.notify_rfq_relayed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_buyer_id uuid;
begin
  if new.status = 'relayed' and old.status is distinct from new.status then
    select buyer_id into v_buyer_id from public.rfqs where id = new.rfq_id;
    perform public.notify_user(
      v_buyer_id,
      'rfq_quote',
      'New quote for your RFQ',
      'A supplier quote has been reviewed and sent to you.',
      '/Frontend/html/buyerdashboard.html'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_rfq_relayed_trigger on public.rfq_responses;
create trigger notify_rfq_relayed_trigger
  after update on public.rfq_responses
  for each row execute function public.notify_rfq_relayed();

-- =========================================================
-- 8. SUPPLIER VERIFICATION (KYB)
-- Nothing currently distinguishes a verified real business from any
-- self-signed-up supplier account, which matters a lot for trust on
-- a cross-border sourcing platform. This adds a document-upload +
-- admin-review flow, plus a profiles.is_verified flag the frontend
-- can badge suppliers with once approved.
-- =========================================================

alter table public.profiles add column if not exists is_verified boolean not null default false;

create table if not exists public.supplier_verification_docs (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('business_license', 'export_license', 'tax_certificate', 'id_document', 'other')),
  file_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.supplier_verification_docs enable row level security;

create policy "Suppliers can view their own verification docs"
  on public.supplier_verification_docs for select
  using (auth.uid() = supplier_id);

create policy "Suppliers can upload their own verification docs"
  on public.supplier_verification_docs for insert
  with check (auth.uid() = supplier_id);

create policy "Admins can view all verification docs"
  on public.supplier_verification_docs for select
  using (public.is_admin());

create policy "Admins can review verification docs"
  on public.supplier_verification_docs for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists supplier_verification_docs_supplier_idx on public.supplier_verification_docs(supplier_id);

-- Storage bucket for the documents themselves — private, unlike
-- listing-images, since these are sensitive business documents.
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

drop policy if exists "Owners can upload their own verification docs" on storage.objects;
create policy "Owners can upload their own verification docs"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Owners can view their own verification docs" on storage.objects;
create policy "Owners can view their own verification docs"
  on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Admins can view all verification docs in storage" on storage.objects;
create policy "Admins can view all verification docs in storage"
  on storage.objects for select
  using (bucket_id = 'verification-docs' and public.is_admin());

-- Approving a doc auto-sets the supplier's is_verified flag once they
-- have at least one approved business_license or export_license.
create or replace function public.sync_supplier_verified_flag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and new.doc_type in ('business_license', 'export_license') then
    update public.profiles set is_verified = true where id = new.supplier_id;
  end if;
  new.reviewed_at := case when new.status <> 'pending' then now() else new.reviewed_at end;
  return new;
end;
$$;

drop trigger if exists sync_supplier_verified_flag_trigger on public.supplier_verification_docs;
create trigger sync_supplier_verified_flag_trigger
  before update on public.supplier_verification_docs
  for each row execute function public.sync_supplier_verified_flag();

-- =========================================================
-- 9. FULL-TEXT SEARCH ON LISTINGS
-- The marketplace search box currently has to filter client-side.
-- This adds a generated tsvector column + GIN index so a real
-- `.textSearch()` query against title/description/category scales
-- once listings are no longer just the demo catalog.
-- =========================================================

alter table public.listings add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(subcategory, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index if not exists listings_search_vector_idx on public.listings using gin(search_vector);
