/* =========================================================
   OMETONG — MANUFACTURER DASHBOARD SCRIPT
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

  /* ---------- Manufacturer data ----------
     Listings are real, fetched from Supabase for the logged-in
     account. No production/RFQ/order/certification/payout backend
     exists yet, so those sections genuinely start empty — they'll
     fill in on their own once that's built. */
  let listings = [];
  const demoLines = [];
  const demoRfqs = [];
  const rfqLabels = { new: 'New', quoted: 'Quoted', won: 'Won' };
  const stageNames = ['Materials sourced', 'In production', 'Quality check', 'Packaging', 'Shipped'];
  const demoProdOrders = [];
  const demoCerts = [];
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
            <div class="listing-title">${item.title}</div>
            <div class="listing-meta">${item.category} · ${moqLabel}</div>
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

  /* ---------- Render production lines ---------- */
  const linesGrid = document.getElementById('linesGrid');
  const linesEmpty = document.getElementById('linesEmpty');
  function renderLines() {
    if (!linesGrid) return;
    if (demoLines.length === 0) {
      linesGrid.innerHTML = '';
      linesGrid.style.display = 'none';
      if (linesEmpty) linesEmpty.hidden = false;
      return;
    }
    linesGrid.style.display = 'grid';
    if (linesEmpty) linesEmpty.hidden = true;
    linesGrid.innerHTML = demoLines.map(line => `
      <div class="line-card">
        <div class="line-top">
          <span class="line-name">${line.name}</span>
          <span class="line-status ${line.status === 'maintenance' ? 'maintenance' : ''}">${line.status === 'maintenance' ? 'Maintenance' : 'Running'}</span>
        </div>
        <div class="line-meta">${line.product}</div>
        <div class="line-bar-wrap">
          <div class="line-bar"><div class="line-bar-fill" style="width:${line.utilization}%"></div></div>
          <span class="line-pct">${line.utilization}%</span>
        </div>
      </div>`).join('');
  }

  /* ---------- Render RFQs ---------- */
  const rfqGrid = document.getElementById('rfqGrid');
  const rfqsEmpty = document.getElementById('rfqsEmpty');
  function renderRfqs() {
    if (!rfqGrid) return;
    if (demoRfqs.length === 0) {
      rfqGrid.innerHTML = '';
      rfqGrid.style.display = 'none';
      if (rfqsEmpty) rfqsEmpty.hidden = false;
      return;
    }
    rfqGrid.style.display = 'grid';
    if (rfqsEmpty) rfqsEmpty.hidden = true;
    rfqGrid.innerHTML = demoRfqs.map(r => `
      <div class="rfq-card">
        <div class="rfq-top">
          <span class="rfq-product">${r.product}</span>
          <span class="rfq-status ${r.status}">${rfqLabels[r.status]}</span>
        </div>
        <div class="rfq-buyer"><strong>${r.buyer}</strong> · ${r.country}</div>
        <div class="rfq-meta"><span>${r.qty}</span><span>Budget ${r.budget}</span></div>
        <div class="rfq-actions">
          ${r.status === 'won'
            ? '<button class="btn btn-ghost btn-sm" disabled>Deal closed</button>'
            : `<button class="btn btn-primary btn-sm" data-quote="${r.id}">${r.status === 'quoted' ? 'View quote' : 'Send a quote'}</button>`}
        </div>
      </div>`).join('');

    rfqGrid.querySelectorAll('[data-quote]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.textContent = 'Quote sent ✓';
        btn.disabled = true;
      });
    });
  }

  /* ---------- Render production-stage orders ---------- */
  const prodOrders = document.getElementById('prodOrders');
  const prodOrdersEmpty = document.getElementById('prodOrdersEmpty');
  const checkIcon = '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>';

  function renderProdOrders() {
    if (!prodOrders) return;
    if (demoProdOrders.length === 0) {
      prodOrders.innerHTML = '';
      if (prodOrdersEmpty) prodOrdersEmpty.hidden = false;
      return;
    }
    if (prodOrdersEmpty) prodOrdersEmpty.hidden = true;
    prodOrders.innerHTML = demoProdOrders.map(o => `
      <div class="prod-order-card">
        <div class="prod-order-top">
          <div>
            <div class="prod-order-title">${o.product}</div>
            <div class="prod-order-sub">${o.buyer} · ${o.country} · ${o.id} · ${o.eta}</div>
          </div>
          <div class="prod-order-amt">$${o.amount.toLocaleString('en-US')}</div>
        </div>
        <div class="stage-tracker">
          ${stageNames.map((label, i) => {
            const stepIndex = i + 1;
            const cls = stepIndex < o.stage ? 'done' : stepIndex === o.stage ? 'current' : '';
            return `
              <div class="stage-step ${cls}">
                <div class="stage ${cls}">${stepIndex < o.stage ? checkIcon : ''}</div>
                <span class="stage-label">${label}</span>
                <div class="stage-line"></div>
              </div>`;
          }).join('')}
        </div>
      </div>`).join('');
  }

  /* ---------- Render certifications ---------- */
  const certGrid = document.getElementById('certGrid');
  const certsEmpty = document.getElementById('certsEmpty');
  function renderCerts() {
    if (!certGrid) return;
    if (demoCerts.length === 0) {
      certGrid.innerHTML = '';
      certGrid.style.display = 'none';
      if (certsEmpty) certsEmpty.hidden = false;
      return;
    }
    certGrid.style.display = 'grid';
    if (certsEmpty) certsEmpty.hidden = true;
    certGrid.innerHTML = demoCerts.map(c => `
      <div class="cert-card ${c.status === 'valid' ? 'valid' : ''}">
        <div class="cert-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" /></svg></div>
        <div class="cert-name">${c.name}</div>
        <div class="cert-issuer">${c.issuer}</div>
        <span class="cert-badge ${c.status}">${c.expiry}</span>
      </div>`).join('');
  }

  /* ---------- Render payouts ---------- */
  function renderPayouts() {
    const escrow = demoProdOrders.filter(o => o.stage < 5).reduce((sum, o) => sum + o.amount, 0);
    const paidTotal = demoPayouts.reduce((sum, p) => sum + p.amount, 0);
    const nextOrder = demoProdOrders.find(o => o.stage < 5);

    const escrowEl = document.getElementById('payoutEscrow');
    const nextEl = document.getElementById('payoutNext');
    const nextDateEl = document.getElementById('payoutNextDate');
    const totalEl = document.getElementById('payoutTotal');
    const countEl = document.getElementById('payoutCount');
    if (escrowEl) escrowEl.textContent = '$' + escrow.toLocaleString('en-US');
    if (nextEl) nextEl.textContent = nextOrder ? '$' + nextOrder.amount.toLocaleString('en-US') : '$0';
    if (nextDateEl) nextDateEl.textContent = nextOrder ? 'Expected on delivery confirmation' : 'No payout scheduled';
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
    const activeLines = demoLines.filter(l => l.status !== 'maintenance').length;
    const newRfqs = demoRfqs.filter(r => r.status === 'new').length;
    const ordersInProduction = demoProdOrders.filter(o => o.stage < 5).length;
    const totalEarnings = demoPayouts.reduce((sum, p) => sum + p.amount, 0)
      + demoProdOrders.filter(o => o.stage === 5).reduce((sum, o) => sum + o.amount, 0);

    const setNum = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setNum('statLines', activeLines);
    setNum('statRfqs', newRfqs);
    setNum('statOrders', ordersInProduction);
    setNum('statEarnings', '$' + totalEarnings.toLocaleString('en-US'));
  }

  (async () => {
    await loadListings();
    renderListings();
    renderLines();
    renderRfqs();
    renderProdOrders();
    renderCerts();
    renderPayouts();
    renderStats();
  })();

});
