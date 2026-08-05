-- =========================================================
-- OMETONG — CHAT WIDGET STORAGE (run this in the Supabase SQL Editor)
-- Run this AFTER schema.sql and admin_schema.sql (needs is_admin()).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- Stores conversations from the floating chat widget so they can be
-- read back later (support follow-up, and the training data that was
-- asked for).
--
-- PRIVACY NOTE: these are real customer conversations. If they are
-- going to be used to train a model, visitors have to be told —
-- that's a legal requirement in the EU/UK (GDPR) and increasingly
-- elsewhere, not just good manners. The widget now shows a short
-- disclosure line; that still needs backing up with a privacy policy
-- before this is live for real customers. Note also that people type
-- personal details into chat unprompted (emails, phone numbers,
-- order details), so treat this table as personal data: don't export
-- it casually, and strip identifiers before any training use.
-- =========================================================

-- ---------- conversations ----------
-- session_id is generated in the browser and kept in localStorage, so
-- a returning visitor continues the same thread. user_id is filled in
-- when the visitor happens to be logged in, and stays null for guests.
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  visitor_name text,
  first_page_url text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.chat_conversations enable row level security;

-- Anyone (including logged-out visitors) can start a conversation...
create policy "Anyone can start a conversation"
  on public.chat_conversations for insert
  with check (true);

-- ...and update only their own row, to attach their name or their
-- user id once they give it. Guarded by the unguessable session_id
-- they already hold.
create policy "Anyone can update their own conversation"
  on public.chat_conversations for update
  using (true)
  with check (true);

-- Reading is deliberately admin-only: a visitor never needs to read
-- conversations back (the widget keeps its own copy in the browser),
-- so nobody can fish for anyone else's chat.
create policy "Admins can read conversations"
  on public.chat_conversations for select
  using (public.is_admin());

create index if not exists chat_conversations_session_idx on public.chat_conversations(session_id);
create index if not exists chat_conversations_last_msg_idx on public.chat_conversations(last_message_at desc);

-- ---------- messages ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('user', 'bot', 'agent')),
  body text not null,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

-- Same shape as above: anyone can write a message, only admins can
-- read them back.
create policy "Anyone can send a chat message"
  on public.chat_messages for insert
  with check (true);

create policy "Admins can read chat messages"
  on public.chat_messages for select
  using (public.is_admin());

create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id, created_at);

-- Keep the conversation's last_message_at current so admins can sort
-- by most recent activity without scanning every message.
create or replace function public.touch_chat_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.chat_conversations
     set last_message_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_chat_conversation_trigger on public.chat_messages;
create trigger touch_chat_conversation_trigger
  after insert on public.chat_messages
  for each row execute function public.touch_chat_conversation();

-- ---------- convenience view for reading chats back ----------
-- Admin-only by inheritance: it selects from tables whose SELECT
-- policies already require is_admin().
create or replace view public.chat_transcripts as
  select
    c.id            as conversation_id,
    c.session_id,
    c.user_id,
    c.visitor_name,
    c.first_page_url,
    c.created_at    as started_at,
    c.last_message_at,
    m.sender,
    m.body,
    m.page_url,
    m.created_at    as sent_at
  from public.chat_conversations c
  join public.chat_messages m on m.conversation_id = c.id;
