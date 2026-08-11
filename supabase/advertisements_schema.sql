-- =========================================================
-- OMETONG — SUPPLIER/MANUFACTURER ADVERTISING REQUESTS
-- (run this in the Supabase SQL Editor, AFTER
-- marketplace_enhancements_schema.sql — it reuses public.is_admin()
-- and public.notify_user())
--
-- The public advertisement.html form was never wired to the
-- database — it just showed a fake "submitted" message. This
-- replaces that with a real request a logged-in supplier or
-- manufacturer submits from their own dashboard, that staff can
-- review and activate.
--
-- There's no payment gateway anywhere on this platform yet (orders
-- work the same way — see orders_schema.sql), so this does NOT try
-- to fake one. An ad starts 'pending_payment': staff follows up
-- with the advertiser directly (bank transfer / invoice, same as
-- any other off-platform payment) and only flips it to 'active'
-- once payment is actually received. That's an honest reflection of
-- how payment really happens today, not a real payment integration.
-- =========================================================

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('spotlight', 'featured', 'banner')),
  price numeric not null default 0 check (price >= 0),
  business_name text not null,
  product_name text not null,
  category text,
  description text not null,
  link text,
  image_url text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'rejected', 'expired')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.advertisements enable row level security;

-- An advertiser only ever sees their own submissions.
create policy "Advertisers can view their own ads"
  on public.advertisements for select
  using (auth.uid() = advertiser_id);

create policy "Advertisers can submit their own ads"
  on public.advertisements for insert
  with check (auth.uid() = advertiser_id and status = 'pending_payment');

create policy "Admins can view all ads"
  on public.advertisements for select
  using (public.is_admin());

-- Only staff can move an ad past pending_payment (activate, reject,
-- or expire it) or attach a review note.
create policy "Admins can review ads"
  on public.advertisements for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists advertisements_advertiser_idx on public.advertisements(advertiser_id);
create index if not exists advertisements_status_idx on public.advertisements(status);

-- ---------- notify staff of a new ad request ----------
create or replace function public.notify_new_advertisement()
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
      'ad_new_request',
      'New advertising request',
      left(new.product_name || ' — ' || new.plan || ' plan', 140),
      '/Frontend/html/admindashboard.html#advertisements'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists advertisements_notify_admins on public.advertisements;
create trigger advertisements_notify_admins
  after insert on public.advertisements
  for each row execute function public.notify_new_advertisement();

-- ---------- notify the advertiser once staff reviews it ----------
create or replace function public.notify_advertisement_reviewed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status != 'pending_payment' then
    perform public.notify_user(
      new.advertiser_id,
      'ad_reviewed',
      case new.status
        when 'active' then 'Your ad is now live'
        when 'rejected' then 'Your ad request was declined'
        when 'expired' then 'Your ad has expired'
        else 'Your ad status changed'
      end,
      left(new.product_name || case when new.admin_note is not null then ' — ' || new.admin_note else '' end, 140),
      '/Frontend/html/supplierdashboard.html#advertising'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists advertisements_notify_advertiser on public.advertisements;
create trigger advertisements_notify_advertiser
  after update on public.advertisements
  for each row execute function public.notify_advertisement_reviewed();

-- ---------- storage bucket for ad creative ----------
-- Public so an active ad's image can actually be shown on the site
-- (homepage banner / category spotlight) without a signed URL.
insert into storage.buckets (id, name, public)
values ('ad-images', 'ad-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view ad images" on storage.objects;
create policy "Anyone can view ad images"
  on storage.objects for select
  using (bucket_id = 'ad-images');

drop policy if exists "Owners can upload their own ad images" on storage.objects;
create policy "Owners can upload their own ad images"
  on storage.objects for insert
  with check (
    bucket_id = 'ad-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Owners can update their own ad images" on storage.objects;
create policy "Owners can update their own ad images"
  on storage.objects for update
  using (
    bucket_id = 'ad-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Owners can delete their own ad images" on storage.objects;
create policy "Owners can delete their own ad images"
  on storage.objects for delete
  using (
    bucket_id = 'ad-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
