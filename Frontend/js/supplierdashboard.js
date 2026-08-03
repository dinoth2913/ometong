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
     Listings are real, fetched from Supabase for the logged-in account.
     No order-fulfillment/payout backend exists yet, so a real new
     supplier account genuinely starts with none of that — those
     sections fill in on their own once that's built. */
  let listings = [];
  const demoRequests = [];
  const demoOrders = [];
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
    const user = await window.ometongGetUser();
    if (!user) return;
    const { data, error } = await window.sb
      .from('listings')
      .select('*')
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Ometong: failed to load listings', error);
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
      let statusClass = 'pending', statusLabel = 'Pending review';
      if (item.is_approved) {
        statusClass = isActive ? 'active' : 'paused';
        statusLabel = isActive ? 'Live' : 'Paused';
      }
      return `
        <div class="listing-card" data-id="${item.id}">
          <div class="listing-thumb" style="background-image:url('${thumbSvg(color)}');background-size:cover;">
            <span class="listing-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="listing-body">
            <div class="listing-title">${esc(item.title)}</div>
            <div class="listing-meta">${esc(item.category)} · ${moqLabel}</div>
            <div class="listing-price">$${Number(item.price).toLocaleString('en-US')} <span style="color:var(--ink-faint);font-weight:600;font-size:.72rem;">/ unit</span></div>
            <button class="listing-toggle ${isActive ? '' : 'is-paused'}" data-toggle="${item.id}">${isActive ? 'Pause listing' : 'Reactivate listing'}</button>
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
  }

  /* ---------- Render buyer requests ---------- */
  const requestsGrid = document.getElementById('requestsGrid');
  const requestsEmpty = document.getElementById('requestsEmpty');
  const reqLabels = { new: 'New', quoted: 'Quoted', won: 'Won' };

  function renderRequests() {
    if (!requestsGrid) return;
    if (demoRequests.length === 0) {
      requestsGrid.innerHTML = '';
      requestsGrid.style.display = 'none';
      if (requestsEmpty) requestsEmpty.hidden = false;
      return;
    }
    requestsGrid.style.display = 'grid';
    if (requestsEmpty) requestsEmpty.hidden = true;
    requestsGrid.innerHTML = demoRequests.map(r => `
      <div class="request-card">
        <div class="req-top">
          <span class="req-product">${r.product}</span>
          <span class="req-status ${r.status}">${reqLabels[r.status]}</span>
        </div>
        <div class="req-buyer"><strong>${r.buyer}</strong> · ${r.country}</div>
        <div class="req-meta"><span>${r.qty}</span><span>Budget ${r.budget}</span></div>
        <div class="req-actions">
          ${r.status === 'won'
            ? '<button class="btn btn-ghost btn-sm" disabled>Deal closed</button>'
            : `<button class="btn btn-primary btn-sm" data-quote="${r.id}">${r.status === 'quoted' ? 'View quote' : 'Send a quote'}</button>`}
        </div>
      </div>`).join('');

    requestsGrid.querySelectorAll('[data-quote]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.textContent = 'Quote sent ✓';
        btn.disabled = true;
      });
    });
  }

  /* ---------- Render orders ---------- */
  const ordersList = document.getElementById('ordersList');
  const ordersHead = document.getElementById('ordersHead');
  const ordersEmpty = document.getElementById('ordersEmpty');
  const orderStatusLabels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };

  function renderOrders() {
    if (!ordersList) return;
    if (demoOrders.length === 0) {
      ordersList.innerHTML = '';
      if (ordersHead) ordersHead.style.display = 'none';
      if (ordersEmpty) ordersEmpty.hidden = false;
      return;
    }
    if (ordersHead) ordersHead.style.display = '';
    if (ordersEmpty) ordersEmpty.hidden = true;
    ordersList.innerHTML = demoOrders.map(o => `
      <div class="order-row">
        <div>
          <div class="order-buyer">${o.buyer}</div>
          <div class="order-buyer-sub">${o.country} · ${o.id}</div>
        </div>
        <div class="order-product-name">${o.product}</div>
        <div class="order-amount">$${o.amount.toLocaleString('en-US')}</div>
        <div><span class="order-status ${o.status}">${orderStatusLabels[o.status]}</span></div>
        <div class="order-shipby">${o.shipBy}</div>
      </div>`).join('');
  }

  /* ---------- Render payouts ---------- */
  function renderPayouts() {
    const escrow = demoOrders.filter(o => o.status !== 'delivered').reduce((sum, o) => sum + o.amount, 0);
    const paidTotal = demoPayouts.reduce((sum, p) => sum + p.amount, 0);
    const nextAmount = demoOrders.find(o => o.status === 'processing')?.amount || 0;

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
    const newRequests = demoRequests.filter(r => r.status === 'new').length;
    const ordersInProgress = demoOrders.filter(o => o.status !== 'delivered').length;
    const totalEarnings = demoPayouts.reduce((sum, p) => sum + p.amount, 0)
      + demoOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.amount, 0);

    const setNum = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setNum('statListings', activeListings);
    setNum('statRequests', newRequests);
    setNum('statOrders', ordersInProgress);
    setNum('statEarnings', '$' + totalEarnings.toLocaleString('en-US'));
  }

  (async () => {
    await loadListings();
    renderListings();
    renderRequests();
    renderOrders();
    renderPayouts();
    renderStats();
  })();

});
