-- =========================================================
-- OMETONG — ENABLE REALTIME ON MESSAGING TABLES
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New
-- query -> paste -> Run). Run AFTER marketplace_enhancements_schema.sql
-- and support_messages_schema.sql (needs inquiries, inquiry_messages,
-- support_threads, support_messages).
--
-- Gap this closes: messages.js / adminInquiries.js /
-- adminSupportMessages.js all required a manual page refresh to see
-- a new message — Supabase Realtime (Postgres Changes) was never
-- turned on for these tables. This is the one piece that can't be
-- done from the frontend: a table only broadcasts changes once it's
-- added to the `supabase_realtime` publication. RLS still applies —
-- a change is only ever broadcast to a client whose own policies
-- would let them SELECT that row anyway, so this doesn't loosen
-- privacy at all, it just makes already-visible changes push instead
-- of requiring a reload.
--
-- Idempotent — safe to run more than once (Postgres errors on a
-- duplicate "alter publication ... add table", so this checks first).
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inquiry_messages'
  ) then
    alter publication supabase_realtime add table public.inquiry_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inquiries'
  ) then
    alter publication supabase_realtime add table public.inquiries;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_threads'
  ) then
    alter publication supabase_realtime add table public.support_threads;
  end if;
end $$;
