-- =========================================================
-- OMETONG — BUYERS CAN DELETE THEIR OWN OPEN, UNQUOTED RFQs
-- Run this in the Supabase SQL Editor (Project -> SQL Editor ->
-- New query -> paste -> Run). Run AFTER
-- marketplace_enhancements_schema.sql (needs public.rfqs,
-- public.rfq_responses).
--
-- Gap this closes: public.rfqs never had a DELETE policy at all — a
-- buyer could post an RFQ but never remove it, even one that got no
-- response. Restricted to status='open' with zero quotes so a buyer
-- can't delete an RFQ a supplier has already put real work into
-- responding to (that quote history belongs to the supplier's side
-- of the relationship too, not just the buyer's) — once any quote
-- exists, or once it's closed/awarded, it stays as a real record.
--
-- Idempotent — safe to run more than once.
-- =========================================================

drop policy if exists "Buyers can delete their own open, unquoted RFQs" on public.rfqs;
create policy "Buyers can delete their own open, unquoted RFQs"
  on public.rfqs for delete
  using (
    auth.uid() = buyer_id
    and status = 'open'
    and not exists (select 1 from public.rfq_responses where rfq_id = rfqs.id)
  );
