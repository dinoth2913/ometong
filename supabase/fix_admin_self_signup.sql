-- =========================================================
-- OMETONG — CRITICAL FIX: block 'admin' at signup
-- (run this in the Supabase SQL Editor immediately)
--
-- Why: admin_schema.sql added 'admin' as a valid profiles.role value.
-- But handle_new_user() (from schema.sql) copies whatever role string
-- the signup request sends, with no whitelist. Signup happens through
-- the public anon key from the browser — the UI only ever sends
-- 'buyer'/'supplier'/'manufacturer', but nothing stopped someone from
-- calling supabase.auth.signUp() directly (e.g. from the browser
-- console) with role: 'admin' and getting an admin account for free.
-- This closes that hole: signup can now only ever create a buyer,
-- supplier, or manufacturer account. The only way to become an admin
-- is the site owner running the `update profiles set role='admin'...`
-- command directly in the SQL Editor, as documented in admin_schema.sql.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, business_name, category, details)
  values (
    new.id,
    case
      when new.raw_user_meta_data->>'role' in ('buyer', 'supplier', 'manufacturer')
        then new.raw_user_meta_data->>'role'
      else 'buyer'
    end,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'category',
    new.raw_user_meta_data->>'details'
  );
  return new;
end;
$$;
