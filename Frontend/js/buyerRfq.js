/* =========================================================
   OMETONG — BUYER: REQUEST FOR QUOTATION (RFQ)
   Post a request, browse verified suppliers'/manufacturers' quotes
   once our team has relayed them. Backed by public.rfqs /
   rfq_responses (marketplace_enhancements_schema.sql section 2) —
   the tables and RLS already existed with nothing anywhere in the
   frontend reading or writing them.

   A buyer never sees a supplier's raw, unreviewed quote — only ones
   staff has flipped to status='relayed' (enforced by RLS, not just
   this file). Supplier identity isn't shown here either: profiles
   are locked to "view your own row only", so quotes read as "A
   verified supplier" rather than a name.
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
  if (!session || !window.sb) return; // authGuard.js already redirects unauthenticated visitors away
  const myId = session.user.id;
  const esc = window.ometongEscapeHTML || (s => s);

  const form = document.getElementById('rfqPostForm');
  const catSelect = document.getElementById('rfqCategory');
  const formMsg = document.getElementById('rfqFormMsg');
  const submitBtn = document.getElementById('rfqSubmitBtn');
  const listEl = document.getElementById('rfqList');
  const listEmpty = document.getElementById('rfqListEmpty');
  if (!form) return; // section not on this page

  if (catSelect && window.ometongTaxonomy) {
    catSelect.innerHTML = window.ometongTaxonomy.categories
      .map(c => `<option value="${c.slug}">${c.label}</option>`).join('');
  }

  const STATUS_LABEL = { open: 'Open', closed: 'Closed', awarded: 'Awarded' };

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  let rfqs = [];
  let responsesByRfq = {};

  async function loadRfqs() {
    const { data, error } = await window.sb
      .from('rfqs')
      .select('*')
      .eq('buyer_id', myId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load RFQs', error); return; }
    rfqs = data || [];

    const ids = rfqs.map(r => r.id);
    responsesByRfq = {};
    if (ids.length) {
      const { data: responses, error: respErr } = await window.sb
        .from('rfq_responses')
        .select('*')
        .in('rfq_id', ids)
        .order('quoted_price', { ascending: true });
      if (respErr) console.error('Ometong: failed to load RFQ quotes', respErr);
      (responses || []).forEach(r => {
        if (!responsesByRfq[r.rfq_id]) responsesByRfq[r.rfq_id] = [];
        responsesByRfq[r.rfq_id].push(r);
      });
    }
    render();
  }

  function render() {
    if (!rfqs.length) {
      listEl.innerHTML = '';
      if (listEmpty) listEmpty.hidden = false;
      return;
    }
    if (listEmpty) listEmpty.hidden = true;

    listEl.innerHTML = rfqs.map(r => {
      const quotes = responsesByRfq[r.id] || [];
      const catLabel = (window.ometongTaxonomy && window.ometongTaxonomy.categorySlugToLabel[r.category_slug]) || r.category_slug || 'General';
      const metaBits = [];
      if (r.quantity) metaBits.push(`Qty ${Number(r.quantity).toLocaleString('en-US')}`);
      if (r.target_price) metaBits.push(`Target $${Number(r.target_price).toLocaleString('en-US')}`);
      if (r.destination_country) metaBits.push(esc(r.destination_country));
      metaBits.push(catLabel);
      metaBits.push(timeAgo(r.created_at) + ' ago');

      return `
        <div class="rfq-list-item" data-rfq="${r.id}">
          <div class="rfq-list-top">
            <span class="rfq-list-title">${esc(r.title)}</span>
            <span class="rfq-list-status ${r.status}">${STATUS_LABEL[r.status] || r.status}</span>
          </div>
          <div class="rfq-list-meta">${metaBits.join(' · ')}</div>
          ${r.description ? `<p class="rfq-desc">${esc(r.description)}</p>` : ''}
          ${quotes.length
            ? `<button class="rfq-toggle-quotes" data-toggle="${r.id}">${quotes.length} quote${quotes.length > 1 ? 's' : ''} received — view</button>
               <div class="rfq-quotes" id="rfq-quotes-${r.id}" hidden>
                 ${quotes.map(q => `
                   <div class="rfq-quote-row">
                     <span>A verified supplier</span>
                     <span class="rfq-quote-price">$${Number(q.quoted_price).toLocaleString('en-US')}</span>
                     <span>${q.lead_time_days ? q.lead_time_days + ' day lead time' : 'Lead time not given'}</span>
                     ${r.status !== 'awarded' ? `<button class="btn btn-primary btn-sm" data-award="${r.id}">Accept this quote</button>` : ''}
                     ${q.message ? `<span class="rfq-quote-msg">${esc(q.message)}</span>` : ''}
                   </div>
                 `).join('')}
               </div>`
            : `<p class="rfq-list-meta" style="margin-top:10px;">No quotes yet — our team will relay one here as soon as a supplier responds.</p>`}
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const box = document.getElementById('rfq-quotes-' + btn.getAttribute('data-toggle'));
        if (box) box.hidden = !box.hidden;
      });
    });
    listEl.querySelectorAll('[data-award]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-award');
        btn.disabled = true;
        const { error } = await window.sb.from('rfqs').update({ status: 'awarded' }).eq('id', id);
        if (error) { console.error('Ometong: failed to mark RFQ awarded', error); btn.disabled = false; return; }
        await loadRfqs();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.hidden = true;

    const title = document.getElementById('rfqTitle').value.trim();
    const category_slug = catSelect ? catSelect.value : null;
    const quantityVal = document.getElementById('rfqQuantity').value;
    const targetPriceVal = document.getElementById('rfqTargetPrice').value;
    const destination_country = document.getElementById('rfqDestination').value.trim() || null;
    const description = document.getElementById('rfqDescription').value.trim() || null;

    if (!title) { formMsg.textContent = 'Tell us what you need.'; formMsg.className = 'rfq-form-msg error'; formMsg.hidden = false; return; }

    submitBtn.disabled = true;
    const { error } = await window.sb.from('rfqs').insert({
      buyer_id: myId,
      title,
      category_slug,
      quantity: quantityVal ? Number(quantityVal) : null,
      target_price: targetPriceVal ? Number(targetPriceVal) : null,
      destination_country,
      description
    });
    submitBtn.disabled = false;

    if (error) {
      console.error('Ometong: failed to post RFQ', error);
      formMsg.textContent = error.message || 'Could not post your request. Please try again.';
      formMsg.className = 'rfq-form-msg error';
      formMsg.hidden = false;
      return;
    }

    formMsg.textContent = 'Request posted — verified suppliers can now send quotes.';
    formMsg.className = 'rfq-form-msg success';
    formMsg.hidden = false;
    form.reset();
    await loadRfqs();
  });

  await loadRfqs();
});
