-- =========================================================
-- OMETONG — COUPON USAGE TRACKING (run this in the Supabase SQL Editor)
-- Run this AFTER marketplace_enhancements_schema.sql (needs
-- public.coupons).
-- Project Settings -> SQL Editor -> New query -> paste -> Run.
--
-- checkout.js validates a coupon (active, not expired, under its
-- max_uses, order meets min_order_total) before applying it, but a
-- buyer has no UPDATE policy on coupons — only admins do — so there
-- was no way to actually increment used_count once an order with a
-- promo code went through. Without this, max_uses could never
-- actually be enforced; the same code could be reused unlimited
-- times regardless of its cap. A narrow SECURITY DEFINER function,
-- same pattern as notify_user()/mark_inquiry_read() elsewhere in
-- this schema — it only ever increments a counter, nothing a buyer
-- couldn't be trusted to trigger.
-- =========================================================

create or replace function public.increment_coupon_usage(p_code text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.coupons
     set used_count = used_count + 1
   where code = p_code and is_active = true;
end;
$$;

grant execute on function public.increment_coupon_usage(text) to authenticated;
