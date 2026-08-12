-- =========================================================
-- OMETONG — ACTUALLY DISPLAYING ADS ON THE SITE
-- (run this in the Supabase SQL Editor, AFTER advertisements_schema.sql)
--
-- advertisements_schema.sql built the request/review workflow —
-- sellers submit, staff activates — but nothing anywhere on the
-- live site ever actually showed an active ad to a real visitor.
-- This adds:
--   - an expiry window, set automatically when staff activates an
--     ad (Category Spotlight: 7 days, Featured Listing / Homepage
--     Banner: 30 days — matching the "7-day rotation" / "/month"
--     wording already on advertisement.html's pricing cards)
--   - a public read policy so logged-out visitors (not just the
--     advertiser or an admin) can see active, unexpired ads — this
--     is the only thing on this table that's ever meant to be
--     visible to the public
--   - impression/click counters, incremented through two narrow
--     RPCs rather than a direct UPDATE grant, so a visitor can only
--     ever increment those two numbers on an active ad and can't
--     touch anything else about it
-- =========================================================

alter table public.advertisements add column if not exists starts_at timestamptz;
alter table public.advertisements add column if not exists ends_at timestamptz;
alter table public.advertisements add column if not exists impressions integer not null default 0;
alter table public.advertisements add column if not exists clicks integer not null default 0;

-- Anyone (including logged-out visitors) can see an ad once it's
-- live and not yet expired — that's the whole point of an ad.
-- Pending/rejected/expired ones stay visible only to their own
-- advertiser and to admins, per the policies already in
-- advertisements_schema.sql.
create policy "Anyone can view active, unexpired ads"
  on public.advertisements for select
  using (status = 'active' and (ends_at is null or ends_at > now()));

-- ---------- impression / click counters ----------
-- SECURITY DEFINER so an anonymous visitor's browser can bump these
-- two numbers without needing a general UPDATE grant on the table —
-- this is the only thing either function will ever change.
create or replace function public.increment_ad_impression(p_ad_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.advertisements
  set impressions = impressions + 1
  where id = p_ad_id and status = 'active';
end;
$$;

create or replace function public.increment_ad_click(p_ad_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.advertisements
  set clicks = clicks + 1
  where id = p_ad_id and status = 'active';
end;
$$;

grant execute on function public.increment_ad_impression(uuid) to anon, authenticated;
grant execute on function public.increment_ad_click(uuid) to anon, authenticated;
