-- =========================================================
-- OMETONG — DATABASE SCHEMA (run this in the Supabase SQL Editor)
-- Project Settings -> SQL Editor -> New query -> paste -> Run
-- =========================================================

-- ---------- profiles ----------
-- One row per account, linked 1:1 to Supabase's built-in auth.users.
-- role determines which dashboard the account uses.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('buyer', 'supplier', 'manufacturer')),
  full_name text,
  email text,
  business_name text,
  category text,
  details text,
  region text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can only ever read their own profile.
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can only ever update their own profile.
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Users can only ever insert a profile row for themselves.
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------- auto-create a profile row on signup ----------
-- Reads the role/full_name/business fields passed in as
-- `options.data` on supabase.auth.signUp() and copies them
-- into a new profiles row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, business_name, category, details)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'buyer'),
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'category',
    new.raw_user_meta_data->>'details'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
