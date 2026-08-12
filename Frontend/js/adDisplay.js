/* =========================================================
   OMETONG — DISPLAYING ACTIVE ADS
   Shared by Home.js (Homepage Banner) and marketplace.js (Featured
   Listing row + Category Spotlight card). Reads public.advertisements
   directly — the public read policy in
   supabase/advertisement_display_schema.sql already scopes this to
   only ever return status='active' rows that haven't passed their
   ends_at, so every query here is automatically safe to run for a
   logged-out visitor and automatically stops returning an ad once
   its plan duration is up — no cleanup job needed.
========================================================= */
(function () {
  "use strict";

  async function fetchAds(plan, opts) {
    if (!window.sb) return [];
    opts = opts || {};
    let q = window.sb.from("advertisements").select("*").eq("status", "active").eq("plan", plan);
    if (opts.category) q = q.ilike("category", opts.category);
    q = q.order("created_at", { ascending: false });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) { console.error("Ometong: failed to load ads", error); return []; }
    return data || [];
  }

  function trackImpression(id) {
    window.sb?.rpc("increment_ad_impression", { p_ad_id: id })
      .then(res => { if (res.error) console.error("Ometong: failed to record ad impression", res.error); });
  }

  function trackClick(id) {
    window.sb?.rpc("increment_ad_click", { p_ad_id: id })
      .then(res => { if (res.error) console.error("Ometong: failed to record ad click", res.error); });
  }

  window.ometongAds = { fetchAds, trackImpression, trackClick };
})();
