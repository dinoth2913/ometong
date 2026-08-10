/* =========================================================
   OMETONG — ADMIN: RFQ QUOTES (relay queue)
   Every quote a supplier/manufacturer submits on a buyer's RFQ
   (public.rfq_responses, marketplace_enhancements_schema.sql
   section 2) starts as status='submitted' and is invisible to the
   buyer it's for — same "must go through us" gate as the mediated
   Inquiries system. This queue is where staff reviews a quote and
   flips it to 'relayed', which is the only thing that makes it
   visible to that buyer's own RFQ (enforced by RLS, not just here).
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

  const tableBody = document.getElementById('rfqQuotesTableBody');
  const table = document.getElementById('rfqQuotesTable');
  const emptyEl = document.getElementById('rfqQuotesEmpty');
  const pendingHint = document.getElementById('rfqQuotesPendingHint');
  if (!tableBody) return; // section not on this page

  let responses = [];
  let profileMap = {};

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  function nameFor(id) {
    const p = profileMap[id];
    return (p && (p.business_name || p.full_name || p.email)) || 'Unknown';
  }

  async function loadResponses() {
    const { data, error } = await window.sb
      .from('rfq_responses')
      .select('*, rfqs(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error('Ometong: failed to load RFQ quotes', error); return; }
    responses = (data || []).filter(r => r.rfqs); // guard against an RFQ that's since been deleted

    const ids = new Set();
    responses.forEach(r => { ids.add(r.supplier_id); if (r.rfqs) ids.add(r.rfqs.buyer_id); });
    if (ids.size) {
      const { data: profiles, error: profErr } = await window.sb
        .from('profiles')
        .select('id, business_name, full_name, email')
        .in('id', [...ids]);
      if (profErr) console.error('Ometong: failed to load profiles', profErr);
      profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    render();
  }

  function render() {
    if (!responses.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      pendingHint.textContent = 'Nothing pending';
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    const pendingCount = responses.filter(r => r.status === 'submitted').length;
    pendingHint.textContent = pendingCount ? `${pendingCount} awaiting review` : 'Nothing pending';

    tableBody.innerHTML = responses.map(r => {
      const rfq = r.rfqs;
      const actions = r.status === 'submitted'
        ? `<button class="btn-approve" data-relay="${r.id}">Relay to buyer</button>`
        : `<span class="order-status delivered">Relayed</span>`;
      return `
        <div class="admin-row admin-row--rfq">
          <span><strong>${esc(rfq.title)}</strong><br><small style="color:var(--ink-faint);">for ${esc(nameFor(rfq.buyer_id))} · ${timeAgo(r.created_at)} ago</small></span>
          <span>${esc(nameFor(r.supplier_id))}</span>
          <span>$${Number(r.quoted_price).toLocaleString('en-US')}</span>
          <span>${r.lead_time_days ? r.lead_time_days + ' days' : '—'}</span>
          <span>${r.message ? esc(r.message) : '<span style="color:var(--ink-faint);">—</span>'}</span>
          <span class="admin-row-actions">${actions}</span>
        </div>`;
    }).join('');

    tableBody.querySelectorAll('[data-relay]').forEach(btn => {
      btn.addEventListener('click', () => relay(btn.getAttribute('data-relay'), btn));
    });
  }

  async function relay(id, btn) {
    btn.disabled = true;
    const { error } = await window.sb.from('rfq_responses').update({ status: 'relayed' }).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to relay RFQ quote', error); return; }
    await loadResponses();
  }

  await loadResponses();
});
