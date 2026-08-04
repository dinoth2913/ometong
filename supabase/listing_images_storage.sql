-- =========================================================
-- OMETONG — LISTING IMAGES (Supabase Storage)
-- (run this in the Supabase SQL Editor)
-- Run this AFTER listings_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
-- =========================================================

-- ---------- listings: where the image's public URL is stored ----------
alter table public.listings add column if not exists image_url text;

-- ---------- storage bucket ----------
-- Public so uploaded photos can be shown on the marketplace to anyone,
-- including logged-out visitors, without needing a signed URL.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- ---------- storage RLS ----------
-- Every uploaded file's path must start with "<the uploader's own user id>/",
-- e.g. "3fa2.../my-photo.jpg" — that's what lets these policies tell whose
-- file is whose without a separate ownership table.
drop policy if exists "Anyone can view listing images" on storage.objects;
create policy "Anyone can view listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "Owners can upload their own listing images" on storage.objects;
create policy "Owners can upload their own listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Owners can update their own listing images" on storage.objects;
create policy "Owners can update their own listing images"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Owners can delete their own listing images" on storage.objects;
create policy "Owners can delete their own listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
