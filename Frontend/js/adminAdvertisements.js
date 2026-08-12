/* =========================================================
   OMETONG — ADMIN: ADVERTISEMENTS
   Reviews ad requests suppliers/manufacturers submit from their own
   dashboard (sellerAdvertising.js) — see
   supabase/advertisements_schema.sql. There's no payment gateway
   anywhere on this platform, so every request starts
   'pending_payment': staff follows up on payment directly (bank
   transfer / invoice) and only then activates it here. This file
   never fakes a charge — it only ever changes advertisements.status.
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  function getInitialSession() {
    return new Promise((resolve) => {
      if (!window.sb) { resolve(null); return; }
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          sub.subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  const session = await getInitialSession();
  if (!session || !window.sb) return; // authGuard.js already redirects non-admins away
  const esc = window.ometongEscapeHTML || (s => s);

  const tableBody = document.getElementById('adsTableBody');
  const table = document.getElementById('adsTable');
  const emptyEl = document.getElementById('adsEmpty');
  const pendingHint = document.getElementById('adsPendingHint');
  if (!tableBody) return; // section not on this page

  const PLAN_LABELS = { spotlight: 'Category Spotlight', featured: 'Featured Listing', banner: 'Homepage Banner' };
  const STATUS_LABELS = { pending_payment: 'Awaiting payment', active: 'Active', rejected: 'Declined', expired: 'Expired' };
  const STATUS_CLS = { pending_payment: 'processing', active: 'delivered', rejected: 'cancelled', expired: 'cancelled' };

  let ads = [];
  let profileMap = {};

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  function advertiserName(id) {
    const p = profileMap[id];
    return (p && (p.business_name || p.full_name || p.email)) || 'Unknown';
  }

  async function loadAds() {
    const { data, error } = await window.sb
      .from('advertisements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load ads', error); return; }
    ads = data || [];

    const ids = [...new Set(ads.map(a => a.advertiser_id))];
    if (ids.length) {
      const { data: profiles, error: profErr } = await window.sb
        .from('profiles')
        .select('id, business_name, full_name, email')
        .in('id', ids);
      if (profErr) console.error('Ometong: failed to load advertiser profiles', profErr);
      profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    render();
  }

  function render() {
    if (!ads.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      pendingHint.textContent = 'Nothing pending';
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    const pendingCount = ads.filter(a => a.status === 'pending_payment').length;
    pendingHint.textContent = pendingCount ? `${pendingCount} awaiting review` : 'Nothing pending';

    tableBody.innerHTML = ads.map(ad => {
      // The public read policy already hides an ad from real visitors
      // the moment ends_at passes, regardless of what its status
      // column still says — reflect that here too rather than
      // showing "Active" on something nobody can actually see anymore.
      const pastExpiry = ad.status === 'active' && ad.ends_at && new Date(ad.ends_at) < new Date();
      const effectiveStatus = pastExpiry ? 'expired' : ad.status;

      let actions = '';
      if (ad.status === 'pending_payment') {
        actions = `<button class="btn-approve" data-activate="${ad.id}">Activate</button>
          <button class="btn-reject" data-reject="${ad.id}">Decline</button>`;
      } else if (ad.status === 'active') {
        actions = `<button data-expire="${ad.id}">Mark expired</button>`;
      }
      if (ad.link) actions += ` <a class="order-track" href="${esc(ad.link)}" target="_blank" rel="noopener">Link</a>`;
      if (ad.image_url) actions += ` <a class="order-track" href="${esc(ad.image_url)}" target="_blank" rel="noopener">Image</a>`;

      const statsLine = (ad.status === 'active' || ad.status === 'expired')
        ? `<br><small style="color:var(--ink-faint);">${ad.impressions || 0} views · ${ad.clicks || 0} clicks</small>`
        : '';

      return `
        <div class="admin-row admin-row--ads">
          <span>${esc(advertiserName(ad.advertiser_id))}<br><small style="color:var(--ink-faint);">${timeAgo(ad.created_at)} ago</small></span>
          <span>${esc(PLAN_LABELS[ad.plan] || ad.plan)}</span>
          <span>${esc(ad.product_name)}${ad.category ? ' · ' + esc(ad.category) : ''}</span>
          <span>${ad.price ? '$' + Number(ad.price).toLocaleString('en-US') : 'Free'}${statsLine}</span>
          <span class="order-status ${STATUS_CLS[effectiveStatus] || 'processing'}">${esc(STATUS_LABELS[effectiveStatus] || effectiveStatus)}</span>
          <span class="admin-row-actions">${actions}</span>
        </div>`;
    }).join('');

    tableBody.querySelectorAll('[data-activate]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-activate'), 'active', btn));
    });
    tableBody.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-reject'), 'rejected', btn));
    });
    tableBody.querySelectorAll('[data-expire]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-expire'), 'expired', btn));
    });
  }

  // Matches the "7-day rotation" / "$X / month" wording already on
  // advertisement.html's pricing cards.
  const PLAN_DURATION_DAYS = { spotlight: 7, featured: 30, banner: 30 };

  async function decide(id, status, btn) {
    let note = null;
    if (status === 'active') {
      note = window.prompt('Optional note (e.g. payment reference) for your own records:', '');
      if (note === null) return; // cancelled
    } else if (status === 'rejected') {
      note = window.prompt('Optional note on why this was declined:', '');
      if (note === null) return; // cancelled
    }
    btn.disabled = true;
    const patch = { status, reviewed_at: new Date().toISOString() };
    if (note) patch.admin_note = note;
    if (status === 'active') {
      const ad = ads.find(a => a.id === id);
      const days = PLAN_DURATION_DAYS[ad && ad.plan] || 30;
      const now = new Date();
      patch.starts_at = now.toISOString();
      patch.ends_at = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    const { error } = await window.sb.from('advertisements').update(patch).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to update ad', error); return; }
    await loadAds();
  }

  await loadAds();
});
