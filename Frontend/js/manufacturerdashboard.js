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

  /* ---------- Demo manufacturer data ---------- */
  const demoLines = [
    { name: 'SMT Line 1 — PCB Assembly', product: 'Bluetooth earbuds, IoT boards', utilization: 92, status: 'running' },
    { name: 'Injection Molding Line A', product: 'Plastic enclosures, housewares', utilization: 78, status: 'running' },
    { name: 'CNC Machining Cell 3', product: 'Precision metal parts', utilization: 65, status: 'running' },
    { name: 'Assembly Line 2 — Final Pack', product: 'Solar garden lights', utilization: 40, status: 'maintenance' },
  ];

  const demoRfqs = [
    { id: 1, product: 'Bluetooth Earbuds Pro X3 (OEM)', buyer: 'Retail chain', country: 'United States', qty: '10,000 units', budget: '$165,000', status: 'new' },
    { id: 2, product: 'Custom Injection-Molded Housing', buyer: 'Consumer electronics brand', country: 'Germany', qty: '25,000 units', budget: '$92,500', status: 'new' },
    { id: 3, product: 'CNC Precision Metal Parts', buyer: 'Auto parts importer', country: 'Canada', qty: '4,000 units', budget: '$148,000', status: 'quoted' },
    { id: 4, product: 'Solar Garden Lights (ODM)', buyer: 'Home & garden retailer', country: 'India', qty: '15,000 units', budget: '$89,000', status: 'quoted' },
    { id: 5, product: 'Smart Home Sensor Boards', buyer: 'Tech distributor', country: 'Sri Lanka', qty: '6,000 units', budget: '$54,000', status: 'won' },
    { id: 6, product: 'IoT Gateway Enclosures', buyer: 'Industrial supplier', country: 'United States', qty: '8,500 units', budget: '$71,200', status: 'new' },
  ];

  const rfqLabels = { new: 'New', quoted: 'Quoted', won: 'Won' };

  const stageNames = ['Materials sourced', 'In production', 'Quality check', 'Packaging', 'Shipped'];

  const demoProdOrders = [
    { id: 'OM-81042', buyer: 'Retail chain', country: 'USA', product: 'Bluetooth Earbuds Pro X3', amount: 54200, stage: 1, eta: 'ETA 12 Aug 2026' },
    { id: 'OM-81030', buyer: 'Consumer electronics brand', country: 'Germany', product: 'Custom Injection-Molded Housing', amount: 38900, stage: 2, eta: 'ETA 08 Aug 2026' },
    { id: 'OM-80998', buyer: 'Tech distributor', country: 'Sri Lanka', product: 'Smart Home Sensor Boards', amount: 27600, stage: 3, eta: 'ETA 03 Aug 2026' },
    { id: 'OM-80961', buyer: 'Home & garden retailer', country: 'India', product: 'Solar Garden Lights', amount: 31200, stage: 4, eta: 'Shipped 27 Jul 2026' },
  ];

  const demoCerts = [
    { name: 'ISO 9001:2015', issuer: 'Quality Management System', expiry: 'Valid until Mar 2027', status: 'valid' },
    { name: 'ISO 14001:2015', issuer: 'Environmental Management', expiry: 'Valid until Jun 2027', status: 'valid' },
    { name: 'BSCI Audit', issuer: 'Business Social Compliance', expiry: 'Valid until Nov 2026', status: 'expiring' },
    { name: 'RoHS Compliance', issuer: 'Restriction of Hazardous Substances', expiry: 'Valid until Jan 2028', status: 'valid' },
  ];

  const demoPayouts = [
    { date: '27 Jul 2026', order: 'OM-80961', amount: 31200 },
    { date: '14 Jul 2026', order: 'OM-80902', amount: 22750 },
    { date: '02 Jul 2026', order: 'OM-80840', amount: 48300 },
    { date: '19 Jun 2026', order: 'OM-80711', amount: 19600 },
  ];

  /* ---------- Render production lines ---------- */
  const linesGrid = document.getElementById('linesGrid');
  function renderLines() {
    if (!linesGrid) return;
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
  function renderRfqs() {
    if (!rfqGrid) return;
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
  const checkIcon = '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>';

  function renderProdOrders() {
    if (!prodOrders) return;
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
  function renderCerts() {
    if (!certGrid) return;
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
    if (historyEl) {
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

  renderLines();
  renderRfqs();
  renderProdOrders();
  renderCerts();
  renderPayouts();
  renderStats();

});
