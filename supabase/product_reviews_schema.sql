-- =========================================================
-- OMETONG — OPEN PRODUCT REVIEWS (run this in the Supabase SQL Editor)
-- Run this AFTER orders_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- This is separate from the existing `reviews` table. That one is
-- purchase-locked: one review per order item, only after delivery.
-- This one lets ANY logged-in user rate/comment on ANY product in
-- the marketplace, which is what was asked for.
--
-- Trade-off worth knowing: because there's no purchase requirement,
-- nothing stops someone rating a product they never bought. The
-- is_verified_purchase flag below is set by a trigger (never by the
-- browser), so genuine buyers can still be badged and told apart.
-- =========================================================

-- product_ref is text, not a foreign key to listings, on purpose:
-- the marketplace currently shows both real listings (uuid ids) and
-- the generated demo catalog (numeric ids), and the ask was for this
-- to work on every product. Real listing rows therefore don't get
-- referential integrity here — worth revisiting once the demo
-- catalog is gone and everything is a real listing.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_ref text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- one review per person per product; posting again edits theirs
  unique (product_ref, user_id)
);

alter table public.product_reviews enable row level security;

-- Reviews are public so shoppers (logged in or not) can read them.
create policy "Anyone can view product reviews"
  on public.product_reviews for select
  using (true);

-- Any logged-in user can leave a review, but only as themselves.
create policy "Logged-in users can add their own review"
  on public.product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own review"
  on public.product_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own review"
  on public.product_reviews for delete
  using (auth.uid() = user_id);

create index if not exists product_reviews_product_ref_idx on public.product_reviews(product_ref);
create index if not exists product_reviews_user_id_idx on public.product_reviews(user_id);

-- ---------- verified-purchase badge ----------
-- Worked out server-side on every insert/update so the browser can't
-- claim a purchase it didn't make.
create or replace function public.set_review_verified_purchase()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.is_verified_purchase := exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.buyer_id = new.user_id
      and o.status in ('delivered', 'completed')
      and oi.listing_id is not null
      and oi.listing_id::text = new.product_ref
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_review_verified_purchase_trigger on public.product_reviews;
create trigger set_review_verified_purchase_trigger
  before insert or update on public.product_reviews
  for each row execute function public.set_review_verified_purchase();

-- ---------- public display names for reviewers ----------
-- profiles is private, so reviews would otherwise have no name to
-- show. This exposes only a display name for the specific reviewers
-- being rendered — never emails or any other profile field.
create or replace function public.get_review_authors(user_ids uuid[])
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select id, coalesce(nullif(business_name, ''), nullif(full_name, ''), 'Ometong user')
  from public.profiles
  where id = any(user_ids);
$$;

grant execute on function public.get_review_authors(uuid[]) to anon, authenticated;
