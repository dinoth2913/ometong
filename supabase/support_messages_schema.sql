-- =========================================================
-- OMETONG — DIRECT CUSTOMER <-> ADMIN SUPPORT MESSAGING
-- (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql, admin_schema.sql (needs is_admin()) and
-- marketplace_enhancements_schema.sql (needs notify_user() /
-- public.notifications for the alerts below).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Different from public.inquiries (buyer<->supplier, mediated
-- through staff because the two of THEM can't contact each other
-- directly) — this is a straightforward two-way line between a
-- logged-in customer and Ometong itself, with nobody to mediate
-- between since staff IS the other party. Any authenticated account
-- can use this (named user_id, not buyer_id, so it isn't artificially
-- restricted to the buyer role if a supplier/manufacturer dashboard
-- wants the same "Contact Support" feature later) — the frontend
-- built alongside this file only wires it up on the buyer side, per
-- what was actually asked for.
-- =========================================================

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'Support request',
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  user_unread_count integer not null default 0,
  admin_unread_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.support_threads enable row level security;

create policy "Users can view their own support threads"
  on public.support_threads for select
  using (auth.uid() = user_id);

create policy "Users can open a support thread"
  on public.support_threads for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all support threads"
  on public.support_threads for select
  using (public.is_admin());

create policy "Admins can update any support thread"
  on public.support_threads for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists support_threads_user_idx on public.support_threads(user_id, last_message_at desc);
create index if not exists support_threads_status_idx on public.support_threads(status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;

create policy "Users can view messages in their own threads"
  on public.support_messages for select
  using (
    exists (select 1 from public.support_threads t where t.id = support_messages.thread_id and t.user_id = auth.uid())
  );

create policy "Users can send messages in their own threads"
  on public.support_messages for insert
  with check (
    sender_role = 'user' and sender_id = auth.uid()
    and exists (select 1 from public.support_threads t where t.id = support_messages.thread_id and t.user_id = auth.uid())
  );

create policy "Admins can view all support messages"
  on public.support_messages for select
  using (public.is_admin());

create policy "Admins can send support messages"
  on public.support_messages for insert
  with check (public.is_admin() and sender_role = 'admin' and sender_id = auth.uid());

create index if not exists support_messages_thread_idx on public.support_messages(thread_id, created_at);

-- Keep last_message_at and the relevant unread counter current, same
-- pattern as touch_inquiry() in marketplace_enhancements_schema.sql.
create or replace function public.touch_support_thread()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.support_threads t
     set last_message_at = now(),
         user_unread_count = case when new.sender_role = 'admin' then t.user_unread_count + 1 else t.user_unread_count end,
         admin_unread_count = case when new.sender_role = 'user' then t.admin_unread_count + 1 else t.admin_unread_count end
   where t.id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists touch_support_thread_trigger on public.support_messages;
create trigger touch_support_thread_trigger
  after insert on public.support_messages
  for each row execute function public.touch_support_thread();

-- ---------- start_support_thread() ----------
-- Find-or-create + optionally post the first message in one round
-- trip, same reasoning as start_inquiry(): reuses an already-open
-- thread for this user instead of spawning a new one every time they
-- click "Contact Support".
create or replace function public.start_support_thread(p_subject text, p_first_message text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
begin
  if v_user_id is null then
    raise exception 'Must be logged in to contact support.';
  end if;

  select id into v_thread_id
  from public.support_threads
  where user_id = v_user_id and status = 'open'
  order by created_at desc
  limit 1;

  if v_thread_id is null then
    insert into public.support_threads (user_id, subject)
    values (v_user_id, coalesce(nullif(trim(p_subject), ''), 'Support request'))
    returning id into v_thread_id;
  end if;

  if p_first_message is not null and length(trim(p_first_message)) > 0 then
    insert into public.support_messages (thread_id, sender_id, sender_role, body)
    values (v_thread_id, v_user_id, 'user', p_first_message);
  end if;

  return v_thread_id;
end;
$$;

grant execute on function public.start_support_thread(text, text) to authenticated;

-- ---------- mark_support_thread_read() ----------
-- Narrow function instead of a general UPDATE policy, same reasoning
-- as mark_inquiry_read(): only ever resets the caller's own unread
-- counter on a thread they're actually part of.
create or replace function public.mark_support_thread_read(p_thread_id uuid, p_as_admin boolean default false)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_as_admin then
    if not public.is_admin() then
      raise exception 'Only admins can mark a thread read as admin.';
    end if;
    update public.support_threads set admin_unread_count = 0 where id = p_thread_id;
  else
    update public.support_threads
       set user_unread_count = 0
     where id = p_thread_id and user_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.mark_support_thread_read(uuid, boolean) to authenticated;

-- ---------- notifications ----------
create or replace function public.notify_new_support_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_thread_user_id uuid;
  v_admin_id uuid;
begin
  select user_id into v_thread_user_id from public.support_threads where id = new.thread_id;

  if new.sender_role = 'admin' then
    perform public.notify_user(
      v_thread_user_id,
      'support_reply',
      'Ometong support replied',
      left(new.body, 140),
      '/Frontend/html/messages.html'
    );
  else
    for v_admin_id in select id from public.profiles where role = 'admin' loop
      perform public.notify_user(
        v_admin_id,
        'support_new_message',
        'New customer support message',
        left(new.body, 140),
        '/Frontend/html/admindashboard.html#support'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_new_support_message_trigger on public.support_messages;
create trigger notify_new_support_message_trigger
  after insert on public.support_messages
  for each row execute function public.notify_new_support_message();
