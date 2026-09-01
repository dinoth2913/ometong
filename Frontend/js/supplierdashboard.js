/* =========================================================
   OMETONG — SUPPLIER DASHBOARD SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Dark mode (shared "theme" preference across the site) ---------- */
  const themeToggle = document.getElementById('themeToggle');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggle) themeToggle.checked = theme === 'dark';
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) setTheme(savedTheme);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  else setTheme('light');

  themeToggle?.addEventListener('change', () => {
    setTheme(themeToggle.checked ? 'dark' : 'light');
  });

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Scroll progress + nav + back-to-top ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('mainNav');
  const backTop = document.getElementById('backTop');

  function onScroll() {
    const top = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (top / docHeight) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (nav) nav.classList.toggle('scrolled', top > 40);
    if (backTop) backTop.classList.toggle('show', top > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('open');
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Supplier data ----------
     Listings, orders and buyer requests (RFQs) are all real, fetched
     from Supabase for the logged-in account. No payout backend
     exists yet (needs a real payment provider wired in first — see
     supabase/orders_schema.sql), so that section genuinely starts
     empty until then. */
  let listings = [];
  let orders = [];
  let orderItemsFlat = [];
  let requests = [];
  let myResponses = {}; // rfq_id -> rfq_responses row
  const demoPayouts = [];

  const listingColors = ['#3A6FF7', '#8B5CF6', '#22C55E', '#FFC24D', '#FF7431', '#EF4444'];

  function thumbSvg(color) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'><rect width='200' height='100' fill='${color}22'/><circle cx='40' cy='50' r='22' fill='${color}55'/><rect x='80' y='30' width='100' height='12' rx='6' fill='${color}66'/><rect x='80' y='52' width='70' height='10' rx='5' fill='${color}44'/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* ---------- Load + render listings ---------- */
  const listingsGrid = document.getElementById('listingsGrid');
  const listingsEmpty = document.getElementById('listingsEmpty');

  async function loadListings() {
    if (!window.sb) return;
    if (listingsGrid) { listingsGrid.style.display = ''; window.ometongShowLoading?.(listingsGrid, 'Loading your listings…'); }
    const user = await window.ometongGetUser();
    if (!user) return;
    const { data, error } = await window.sb
      .from('listings')
      .select('*')
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Ometong: failed to load listings', error);
      if (listingsGrid) window.ometongShowError?.(listingsGrid, "Couldn't load your listings.", async () => { await loadListings(); renderListings(); });
      return;
    }
    listings = data || [];
  }

  function renderListings() {
    if (!listingsGrid) return;
    if (listings.length === 0) {
      listingsGrid.innerHTML = '';
      listingsGrid.style.display = 'none';
      if (listingsEmpty) listingsEmpty.hidden = false;
      return;
    }
    listingsGrid.style.display = 'grid';
    if (listingsEmpty) listingsEmpty.hidden = true;
    const esc = window.ometongEscapeHTML;
    listingsGrid.innerHTML = listings.map((item, i) => {
      const isActive = item.status === 'active';
      const color = listingColors[i % listingColors.length];
      const moqLabel = item.moq ? `MOQ ${item.moq.toLocaleString('en-US')}` : 'No MOQ set';
      const stockLabel = item.available_quantity == null ? 'Stock not tracked' : `${item.available_quantity.toLocaleString('en-US')} in stock`;
      let statusClass = 'pending', statusLabel = 'Pending review';
      if (item.is_approved) {
        statusClass = isActive ? 'active' : 'paused';
        statusLabel = isActive ? 'Live' : 'Paused';
      }
      return `
        <div class="listing-card" data-id="${item.id}">
          <div class="listing-thumb" style="background-image:url('${item.image_url ? esc(item.image_url) : thumbSvg(color)}');background-size:cover;">
            <span class="listing-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="listing-body">
            <div class="listing-title">${esc(item.title)}</div>
            <div class="listing-meta">${esc(item.category)} · ${moqLabel}${item.country_of_origin ? ' · Origin: ' + esc(item.country_of_origin) : ''}</div>
            <div class="listing-price">$${Number(item.price).toLocaleString('en-US')} <span style="color:var(--ink-faint);font-weight:600;font-size:.72rem;">/ unit</span></div>
            <div class="listing-stock-row" data-stock-row="${item.id}">
              <span class="listing-stock-label">${stockLabel}</span>
              <button type="button" class="listing-stock-edit" data-stock-edit="${item.id}">Update stock</button>
            </div>
            <button class="listing-toggle ${isActive ? '' : 'is-paused'}" data-toggle="${item.id}">${isActive ? 'Pause listing' : 'Reactivate listing'}</button>
            ${(!isActive || !item.is_approved) ? `<button class="listing-delete" data-delete="${item.id}" type="button">Delete listing</button>` : ''}
          </div>
        </div>`;
    }).join('');

    listingsGrid.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-toggle');
        const item = listings.find(l => String(l.id) === id);
        if (!item) return;
        const next = item.status === 'active' ? 'paused' : 'active';
        btn.disabled = true;
        const { error } = await window.sb.from('listings').update({ status: next }).eq('id', id);
        btn.disabled = false;
        if (error) {
          console.error('Ometong: failed to update listing', error);
          return;
        }
        item.status = next;
        renderListings();
        renderStats();
      });
    });

    /* ---------- Delete listing (paused/never-approved only) ----------
       Real, permanent delete — the database itself (see
       supabase/listings_schema.sql's "Owners can delete their own
       listings" policy) has always allowed this; it just never had a
       button. Restricted here to a listing that isn't currently live
       (paused, or still pending review) so a supplier can't
       accidentally remove something buyers are actively seeing —
       pause it first, then delete. Safe for real order history too:
       order_items keeps its own copy of title/price/qty, and its
       listing_id just goes null (on delete set null) if this listing
       had past orders — nothing about a completed order changes. */
    listingsGrid.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete');
        const item = listings.find(l => String(l.id) === id);
        if (!item) return;
        if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
        btn.disabled = true;
        const { error } = await window.sb.from('listings').delete().eq('id', id);
        btn.disabled = false;
        if (error) {
          console.error('Ometong: failed to delete listing', error);
          window.alert('Could not delete this listing — please try again.');
          return;
        }
        listings = listings.filter(l => String(l.id) !== id);
        renderListings();
        renderStats();
      });
    });

    /* ---------- Update stock (inline) ----------
       Swaps the stock label for a number input + Save/Cancel right
       in place, rather than a separate edit page — this is the only
       field a listing ever needs updating after it's published. */
    listingsGrid.querySelectorAll('[data-stock-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-stock-edit');
        const item = listings.find(l => String(l.id) === id);
        const row = listingsGrid.querySelector(`[data-stock-row="${id}"]`);
        if (!item || !row) return;
        row.innerHTML = `
          <input type="number" min="0" step="1" class="listing-stock-input" id="stockInput-${id}"
            placeholder="Leave blank = not tracked" value="${item.available_quantity == null ? '' : item.available_quantity}">
          <button type="button" class="listing-stock-save" data-stock-save="${id}">Save</button>
          <button type="button" class="listing-stock-cancel" data-stock-cancel="${id}">Cancel</button>
        `;
        row.querySelector('[data-stock-cancel]').addEventListener('click', () => renderListings());
        row.querySelector('[data-stock-save]').addEventListener('click', async () => {
          const input = document.getElementById(`stockInput-${id}`);
          const raw = input.value.trim();
          const value = raw === '' ? null : parseInt(raw, 10);
          if (raw !== '' && (isNaN(value) || value < 0)) {
            input.focus();
            return;
          }
          const saveBtn = row.querySelector('[data-stock-save]');
          saveBtn.disabled = true;
          const { error } = await window.sb.from('listings').update({ available_quantity: value }).eq('id', id);
          saveBtn.disabled = false;
          if (error) {
            console.error('Ometong: failed to update stock', error);
            return;
          }
          item.available_quantity = value;
          renderListings();
        });
      });
    });
  }

  /* ---------- Load + render buyer requests (RFQs) ----------
     Real data from public.rfqs / rfq_responses (see
     supabase/marketplace_enhancements_schema.sql section 2) — any
     open RFQ is visible to any logged-in account (that's how
     suppliers discover buyer demand without buyer identity being
     exposed), and a supplier's own quote is only ever visible to
     that buyer once Ometong staff has relayed it. */
  const requestsGrid = document.getElementById('requestsGrid');
  const requestsEmpty = document.getElementById('requestsEmpty');

  async function loadRequests() {
    if (!window.sb) return;
    if (requestsGrid) { requestsGrid.style.display = ''; window.ometongShowLoading?.(requestsGrid, 'Loading buyer requests…'); }
    const user = await window.ometongGetUser();
    if (!user) return;
    const { data, error } = await window.sb
      .from('rfqs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) {
      console.error('Ometong: failed to load buyer requests', error);
      if (requestsGrid) window.ometongShowError?.(requestsGrid, "Couldn't load buyer requests.", async () => { await loadRequests(); renderRequests(); });
      return;
    }
    requests = data || [];

    const { data: responses, error: respErr } = await window.sb
      .from('rfq_responses')
      .select('*')
      .eq('supplier_id', user.id);
    if (respErr) console.error('Ometong: failed to load my quotes', respErr);
    myResponses = {};
    (responses || []).forEach(r => { myResponses[r.rfq_id] = r; });
  }

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  function renderRequests() {
    if (!requestsGrid) return;
    if (requests.length === 0) {
      requestsGrid.innerHTML = '';
      requestsGrid.style.display = 'none';
      if (requestsEmpty) requestsEmpty.hidden = false;
      return;
    }
    requestsGrid.style.display = 'grid';
    if (requestsEmpty) requestsEmpty.hidden = true;
    const esc = window.ometongEscapeHTML || (s => s);
    const catLabel = slug => (window.ometongTaxonomy && window.ometongTaxonomy.categorySlugToLabel[slug]) || slug || 'General';

    requestsGrid.innerHTML = requests.map(r => {
      const mine = myResponses[r.id];
      let actionsHtml;
      if (mine) {
        actionsHtml = mine.status === 'relayed'
          ? '<button class="btn btn-ghost btn-sm" disabled>Quote sent to buyer</button>'
          : '<button class="btn btn-ghost btn-sm" disabled>Quote submitted — pending review</button>';
      } else {
        actionsHtml = `<button class="btn btn-primary btn-sm" data-quote="${r.id}">Send a quote</button>`;
      }
      return `
      <div class="request-card" data-rfq="${r.id}">
        <div class="req-top">
          <span class="req-product">${esc(r.title)}</span>
          <span class="req-status new">${timeAgo(r.created_at)} ago</span>
        </div>
        <div class="req-buyer"><strong>${catLabel(r.category_slug)}</strong> · ${esc(r.destination_country || 'Destination not set')}</div>
        <div class="req-meta">
          <span>${r.quantity ? 'Qty ' + Number(r.quantity).toLocaleString('en-US') : 'Qty not set'}</span>
          <span>${r.target_price ? 'Target $' + Number(r.target_price).toLocaleString('en-US') : 'No target price'}</span>
        </div>
        ${r.description ? `<p class="rfq-desc">${esc(r.description)}</p>` : ''}
        <div class="req-actions">${actionsHtml}</div>
        <form class="rfq-form" id="quote-form-${r.id}" data-rfq-form="${r.id}" hidden style="margin-top:12px;">
          <div class="rfq-form-row">
            <label>Your price (USD / unit)
              <input type="number" min="0" step="0.01" required data-field="price">
            </label>
            <label>Lead time (days)
              <input type="number" min="0" data-field="lead">
            </label>
          </div>
          <label>Message to buyer (optional)
            <textarea data-field="message" placeholder="Anything the buyer should know about this quote"></textarea>
          </label>
          <p class="rfq-form-msg" data-form-msg hidden></p>
          <div class="rfq-form-actions">
            <button type="submit" class="btn btn-primary btn-sm">Submit quote</button>
            <button type="button" class="btn btn-ghost btn-sm" data-cancel-quote="${r.id}">Cancel</button>
          </div>
        </form>
      </div>`;
    }).join('');

    requestsGrid.querySelectorAll('[data-quote]').forEach(btn => {
      btn.addEventListener('click', () => {
        const formEl = document.getElementById('quote-form-' + btn.getAttribute('data-quote'));
        if (formEl) formEl.hidden = false;
      });
    });
    requestsGrid.querySelectorAll('[data-cancel-quote]').forEach(btn => {
      btn.addEventListener('click', () => {
        const formEl = document.getElementById('quote-form-' + btn.getAttribute('data-cancel-quote'));
        if (formEl) formEl.hidden = true;
      });
    });
    requestsGrid.querySelectorAll('[data-rfq-form]').forEach(formEl => {
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rfqId = formEl.getAttribute('data-rfq-form');
        const price = formEl.querySelector('[data-field="price"]').value;
        const lead = formEl.querySelector('[data-field="lead"]').value;
        const message = formEl.querySelector('[data-field="message"]').value.trim();
        const msgEl = formEl.querySelector('[data-form-msg]');
        const user = await window.ometongGetUser();
        if (!price || !user) return;

        const submitBtn = formEl.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const { error } = await window.sb.from('rfq_responses').insert({
          rfq_id: rfqId,
          supplier_id: user.id,
          quoted_price: Number(price),
          lead_time_days: lead ? Number(lead) : null,
          message: message || null
        });
        submitBtn.disabled = false;

        if (error) {
          console.error('Ometong: failed to submit quote', error);
          if (msgEl) { msgEl.textContent = error.message || 'Could not submit this quote. Please try again.'; msgEl.className = 'rfq-form-msg error'; msgEl.hidden = false; }
          return;
        }
        await loadRequests();
        renderRequests();
        renderStats();
      });
    });
  }

  /* ---------- Load real orders ----------
     Fetched from order_items (the line items that are actually this
     seller's own, not the whole order — an order can mix items from
     several sellers) joined back to their parent order, then grouped
     into one row per order. Amount shown is this seller's own share
     of that order, not its grand total. */
  async function loadOrders() {
    if (!window.sb) return;
    if (ordersList) window.ometongShowLoading?.(ordersList, 'Loading your orders…');
    const user = await window.ometongGetUser();
    if (!user) return;
    const { data, error } = await window.sb
      .from('order_items')
      .select('*, orders(*)')
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Ometong: failed to load orders', error);
      if (ordersList) window.ometongShowError?.(ordersList, "Couldn't load your orders.", async () => { await loadOrders(); renderOrders(); });
      return;
    }

    const grouped = {};
    // Kept flat too (not just grouped-by-order) so the "Top listings
    // by revenue" chart can aggregate per line item without re-fetching.
    orderItemsFlat = (data || []).filter(item => item.orders && item.orders.status !== 'cancelled');
    (data || []).forEach(item => {
      const o = item.orders;
      if (!o) return;
      if (!grouped[o.id]) grouped[o.id] = { order: o, items: [] };
      grouped[o.id].items.push(item);
    });

    orders = Object.values(grouped)
      .sort((a, b) => new Date(b.order.created_at) - new Date(a.order.created_at))
      .map(g => {
        const items = g.items;
        const addr = g.order.shipping_address || {};
        const amount = items.reduce((sum, it) => sum + Number(it.line_total || 0), 0);
        const product = items.length > 1 ? `${items[0].title} +${items.length - 1} more` : items[0].title;
        return {
          id: g.order.id,
          buyer: addr.fullName || 'Buyer',
          country: addr.country || '—',
          product,
          amount,
          status: g.order.status,
          createdAt: g.order.created_at
        };
      });
  }

  /* ---------- Render orders ---------- */
  const ordersList = document.getElementById('ordersList');
  const ordersHead = document.getElementById('ordersHead');
  const ordersEmpty = document.getElementById('ordersEmpty');
  const ORDER_STATUS_MAP = {
    pending: { cls: 'processing', label: 'Pending payment' },
    paid: { cls: 'processing', label: 'Paid — ready to process' },
    processing: { cls: 'processing', label: 'Processing' },
    shipped: { cls: 'transit', label: 'Shipped' },
    delivered: { cls: 'delivered', label: 'Delivered' },
    completed: { cls: 'delivered', label: 'Completed' },
    cancelled: { cls: 'cancelled', label: 'Cancelled' },
    refunded: { cls: 'cancelled', label: 'Refunded' }
  };

  function renderOrders() {
    if (!ordersList) return;
    if (orders.length === 0) {
      ordersList.innerHTML = '';
      if (ordersHead) ordersHead.style.display = 'none';
      if (ordersEmpty) ordersEmpty.hidden = false;
      return;
    }
    if (ordersHead) ordersHead.style.display = '';
    if (ordersEmpty) ordersEmpty.hidden = true;
    ordersList.innerHTML = orders.map(o => {
      const st = ORDER_STATUS_MAP[o.status] || { cls: 'processing', label: o.status };
      return `
      <div class="order-row">
        <div>
          <div class="order-buyer">${o.buyer}</div>
          <div class="order-buyer-sub">${o.country} · #${String(o.id).slice(0, 8).toUpperCase()}</div>
        </div>
        <div class="order-product-name">${o.product}</div>
        <div class="order-amount">$${o.amount.toLocaleString('en-US')}</div>
        <div><span class="order-status ${st.cls}">${st.label}</span></div>
        <div><button class="order-track" data-manage="${o.id}">Manage</button></div>
      </div>`;
    }).join('');

    ordersList.querySelectorAll('[data-manage]').forEach(btn => {
      btn.addEventListener('click', () => window.OmetongOrderTracking?.open(btn.getAttribute('data-manage'), { mode: 'manage' }));
    });
  }

  document.addEventListener('ometongOrderUpdated', async () => {
    await loadOrders();
    renderOrders();
    renderPayouts();
    renderStats();
  });

  /* ---------- Render payouts ---------- */
  function renderPayouts() {
    const escrow = orders.filter(o => o.status !== 'delivered' && o.status !== 'completed').reduce((sum, o) => sum + o.amount, 0);
    const paidTotal = demoPayouts.reduce((sum, p) => sum + p.amount, 0);
    const nextAmount = orders.find(o => o.status === 'processing')?.amount || 0;

    const escrowEl = document.getElementById('payoutEscrow');
    const nextEl = document.getElementById('payoutNext');
    const nextDateEl = document.getElementById('payoutNextDate');
    const totalEl = document.getElementById('payoutTotal');
    const countEl = document.getElementById('payoutCount');
    if (escrowEl) escrowEl.textContent = '$' + escrow.toLocaleString('en-US');
    if (nextEl) nextEl.textContent = '$' + nextAmount.toLocaleString('en-US');
    if (nextDateEl) nextDateEl.textContent = nextAmount ? 'Expected on delivery confirmation' : 'No payout scheduled';
    if (totalEl) totalEl.textContent = '$' + paidTotal.toLocaleString('en-US');
    if (countEl) countEl.textContent = demoPayouts.length;

    const historyEl = document.getElementById('payoutHistory');
    const historyEmptyEl = document.getElementById('payoutHistoryEmpty');
    if (demoPayouts.length === 0) {
      if (historyEl) { historyEl.innerHTML = ''; historyEl.style.display = 'none'; }
      if (historyEmptyEl) historyEmptyEl.hidden = false;
      return;
    }
    if (historyEmptyEl) historyEmptyEl.hidden = true;
    if (historyEl) {
      historyEl.style.display = '';
      historyEl.innerHTML = `
        <div class="payout-row head"><span>Date</span><span>Order</span><span>Amount</span></div>
        ${demoPayouts.map(p => `
          <div class="payout-row">
            <span>${p.date}</span><span>${p.order}</span><span class="p-amt">$${p.amount.toLocaleString('en-US')}</span>
          </div>`).join('')}
      `;
    }
  }

  /* ---------- Render stats ---------- */
  function renderStats() {
    const activeListings = listings.filter(l => l.status === 'active' && l.is_approved).length;
    const newRequests = requests.filter(r => !myResponses[r.id]).length;
    const ordersInProgress = orders.filter(o => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled').length;
    const totalEarnings = demoPayouts.reduce((sum, p) => sum + p.amount, 0)
      + orders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((sum, o) => sum + o.amount, 0);

    const setNum = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setNum('statListings', activeListings);
    setNum('statRequests', newRequests);
    setNum('statOrders', ordersInProgress);
    setNum('statEarnings', '$' + totalEarnings.toLocaleString('en-US'));
  }

  /* ---------- Analytics ----------
     Computed from the same `orders` already loaded on this page —
     no new table needed. Keeps the last-rendered rows around so the
     Export CSV buttons can download exactly what's on screen. */
  let lastEarningsRows = [];
  let lastStatusRows = [];
  let lastTopListingsRows = [];

  function renderAnalytics() {
    const earningsEl = document.getElementById('chartEarnings');
    const statusEl = document.getElementById('chartOrderStatus');
    const rangeSelect = document.getElementById('chartEarningsRange');
    const earningsTitle = document.getElementById('chartEarningsTitle');
    if (!earningsEl && !statusEl) return;

    const monthCount = rangeSelect ? parseInt(rangeSelect.value, 10) || 6 : 6;
    const now = new Date();
    const months = [];
    const byKey = {};
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short', year: monthCount > 6 ? '2-digit' : undefined }), value: 0 };
      months.push(m);
      byKey[m.key] = m;
    }
    orders.forEach(o => {
      if (o.status === 'cancelled' || !o.createdAt) return;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (byKey[key]) byKey[key].value += o.amount;
    });
    lastEarningsRows = months;
    if (earningsTitle) earningsTitle.textContent = `Earnings, last ${monthCount} months`;
    if (earningsEl) window.ometongRenderBarChart(earningsEl, months, { format: v => '$' + v.toLocaleString('en-US'), emptyText: 'No orders yet.' });

    if (statusEl) {
      const labels = { processing: 'Processing', transit: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
      const counts = { processing: 0, transit: 0, delivered: 0, cancelled: 0 };
      orders.forEach(o => {
        const cls = (ORDER_STATUS_MAP[o.status] || {}).cls || o.status;
        if (counts[cls] !== undefined) counts[cls]++;
      });
      const rows = Object.keys(labels).map(k => ({ label: labels[k], value: counts[k] }));
      lastStatusRows = rows;
      window.ometongRenderBarChart(statusEl, rows, { emptyText: 'No orders yet.' });
    }

    /* ---------- Top listings by revenue ----------
       Aggregated from the flat order_items list (not the grouped
       `orders`, which loses per-item detail) — top 5 by summed
       line_total, cancelled orders already excluded when it was built. */
    const topListingsEl = document.getElementById('chartTopListings');
    if (topListingsEl) {
      const byTitle = {};
      orderItemsFlat.forEach(item => {
        const key = item.title || 'Untitled listing';
        byTitle[key] = (byTitle[key] || 0) + Number(item.line_total || 0);
      });
      const rows = Object.entries(byTitle)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      lastTopListingsRows = rows;
      window.ometongRenderBarChart(topListingsEl, rows, { format: v => '$' + v.toLocaleString('en-US'), emptyText: 'No orders yet.' });
    }
  }

  document.getElementById('chartEarningsRange')?.addEventListener('change', renderAnalytics);
  document.getElementById('chartEarningsExport')?.addEventListener('click', () => window.ometongExportChartCSV(lastEarningsRows, 'ometong-earnings'));
  document.getElementById('chartOrderStatusExport')?.addEventListener('click', () => window.ometongExportChartCSV(lastStatusRows, 'ometong-orders-by-status'));
  document.getElementById('chartTopListingsExport')?.addEventListener('click', () => window.ometongExportChartCSV(lastTopListingsRows, 'ometong-top-listings'));

  (async () => {
    await Promise.all([loadListings(), loadOrders(), loadRequests()]);
    renderListings();
    renderRequests();
    renderOrders();
    renderPayouts();
    renderStats();
    renderAnalytics();
  })();

  /* ---------- Quick jump active-section highlight ----------
     Purely cosmetic scroll-spy for the pill row under the dashboard
     header — mirrors the same pattern used on admindashboard.js. */
  const quickJumpLinks = document.querySelectorAll('.quick-jump a');
  const quickJumpSections = [...quickJumpLinks]
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (quickJumpLinks.length && quickJumpSections.length && 'IntersectionObserver' in window) {
    const jumpIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = '#' + entry.target.id;
          quickJumpLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === id));
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    quickJumpSections.forEach(sec => jumpIo.observe(sec));
  }

});
