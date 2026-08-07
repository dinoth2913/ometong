-- =========================================================
-- OMETONG — CONTACT US MESSAGES (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql, admin_schema.sql (needs is_admin()) and
-- marketplace_enhancements_schema.sql (needs its notify_user() /
-- public.notifications table for the new-message alert below).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- The contactus.html form previously did nothing but show a fake
-- "sent" animation — nothing was ever saved. This gives it a real
-- backend: anyone (including a logged-out visitor) can submit one,
-- only admins can read them back, and staff reply to the person
-- directly by email/phone using the contact details they gave —
-- this is deliberately NOT routed through the mediated
-- inquiries/inquiry_messages system (marketplace_enhancements_schema.sql),
-- since a Contact Us sender usually isn't paired with a specific
-- supplier yet; it's a direct line to Ometong itself, same as
-- picking up the phone.
-- =========================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  -- which route card was selected on the page: general/sales/support/partner
  route text not null default 'general' check (route in ('general', 'sales', 'support', 'partner')),
  subject text not null,
  message text not null,
  -- filled in automatically if the sender happened to be logged in;
  -- null for an anonymous visitor, which is the common case here.
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  admin_note text,
  replied_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone can send one — including a logged-out visitor filling out
-- the form, which is the normal case for this page.
drop policy if exists "Anyone can submit a contact message" on public.contact_messages;
create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  with check (true);

-- Reading is admin-only: a visitor never needs to read these back
-- (there's no inbox for them — a real reply comes as an email or a
-- phone call, not through the site).
drop policy if exists "Admins can view contact messages" on public.contact_messages;
create policy "Admins can view contact messages"
  on public.contact_messages for select
  using (public.is_admin());

drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages"
  on public.contact_messages for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists contact_messages_status_idx on public.contact_messages(status, created_at desc);

-- Notify every admin the moment a new one comes in, reusing the
-- notifications table + notify_user() from marketplace_enhancements_schema.sql.
create or replace function public.notify_new_contact_message()
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
      'contact_message',
      'New contact message',
      left(new.subject || ' — ' || new.message, 140),
      '/Frontend/html/admindashboard.html#inquiries'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_new_contact_message_trigger on public.contact_messages;
create trigger notify_new_contact_message_trigger
  after insert on public.contact_messages
  for each row execute function public.notify_new_contact_message();
