-- =========================================================
-- OMETONG — CONTACT MESSAGE REPLIES (run this in the Supabase SQL Editor)
-- Run this AFTER contact_messages_schema.sql.
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- contact_messages had admin_note (staff-only, never shown to the
-- sender) but nowhere to actually write the reply itself — staff
-- could only fall back to a real email/phone call. This adds a
-- proper admin_reply field the admin panel now has a compose box
-- for, so the reply is recorded on the platform (not just sent as
-- an email that leaves no trace here). It's still delivered to the
-- sender by real email — there's no email-sending integration wired
-- into this project yet, so writing the reply here also opens a
-- mailto: with the same text pre-filled, same as before.
-- =========================================================

alter table public.contact_messages add column if not exists admin_reply text;
