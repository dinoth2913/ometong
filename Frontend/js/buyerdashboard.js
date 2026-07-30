/* =========================================================
   OMETONG — BUYER DASHBOARD SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Dark mode (shared "theme" preference with marketplace.html) ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle?.querySelector('.sun-icon');
  const moonIcon = themeToggle?.querySelector('.moon-icon');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (sunIcon) sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'none' : 'block';
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) setTheme(savedTheme);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  else setTheme('light');

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
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
    nav?.classList.toggle('scrolled', top > 40);
    backTop?.classList.toggle('show', top > 500);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 60 + 'ms';
    revealObserver.observe(el);
  });

  /* ---------- Shipping region (persisted, reflects the site's 5 supported markets) ---------- */
  const REGION_KEY = 'ometong_region';
  const regionNames = { us: 'United States', ca: 'Canada', eu: 'Europe', lk: 'Sri Lanka', in: 'India' };
  const regionSelect = document.getElementById('regionSelect');
  const acctRegion = document.getElementById('acctRegion');

  function applyRegion(code) {
    if (!regionNames[code]) code = 'us';
    if (regionSelect) regionSelect.value = code;
    if (acctRegion) acctRegion.textContent = regionNames[code];
  }
  applyRegion(localStorage.getItem(REGION_KEY) || 'us');
  regionSelect?.addEventListener('change', () => {
    localStorage.setItem(REGION_KEY, regionSelect.value);
    applyRegion(regionSelect.value);
  });

  /* ---------- Product catalog (same generation logic as marketplace.js,
     duplicated here so wishlist items can be looked up by id) ---------- */
  const palette = ['#FF7431', '#3A6FF7', '#FFC24D', '#22C55E', '#8B5CF6'];
  const productDefs = {
    electronics: [
      { title: 'Smartphone', min: 250, max: 1300 },
      { title: 'Laptop', min: 450, max: 2200 },
      { title: 'Industrial Sensor Kit', min: 40, max: 320 },
      { title: 'LED Panel Array', min: 60, max: 450 },
      { title: 'Smart Meter Unit', min: 90, max: 500 },
    ],
    textiles: [
      { title: 'Cotton Fabric Roll', min: 15, max: 120 },
      { title: 'Woven Poly Bags', min: 10, max: 80 },
      { title: 'Denim Bulk Lot', min: 200, max: 900 },
      { title: 'Technical Mesh Cloth', min: 25, max: 150 },
      { title: 'Dye-Ready Yarn', min: 30, max: 200 },
    ],
    machinery: [
      { title: 'CNC Spindle Unit', min: 800, max: 4500 },
      { title: 'Hydraulic Press', min: 1200, max: 6000 },
      { title: 'Conveyor Motor', min: 250, max: 1400 },
      { title: 'Industrial Compressor', min: 600, max: 3200 },
      { title: 'Gearbox Assembly', min: 300, max: 1800 },
    ],
    food: [
      { title: 'Ceylon Cinnamon Bulk', min: 30, max: 220 },
      { title: 'Roasted Cashew Lot', min: 60, max: 380 },
      { title: 'Coconut Oil Drums', min: 80, max: 500 },
      { title: 'Spice Blend Pack', min: 20, max: 150 },
      { title: 'Tea Leaf Crates', min: 40, max: 300 },
    ],
    construction: [
      { title: 'Steel Rebar Bundle', min: 150, max: 900 },
      { title: 'Cement Pallet', min: 60, max: 400 },
      { title: 'PVC Pipe Set', min: 30, max: 220 },
      { title: 'Roofing Sheet Lot', min: 100, max: 700 },
      { title: 'Aggregate Supply', min: 50, max: 380 },
    ],
    packaging: [
      { title: 'Corrugated Box Lot', min: 20, max: 180 },
      { title: 'Stretch Film Rolls', min: 15, max: 110 },
      { title: 'Pallet Wrap Set', min: 18, max: 130 },
      { title: 'Custom Carton Batch', min: 40, max: 260 },
      { title: 'Foam Insert Pack', min: 25, max: 160 },
    ],
    services: [
      { title: 'Customs Documentation', min: 50, max: 400 },
      { title: 'Freight Insurance Plan', min: 80, max: 600 },
      { title: 'Warehousing Package', min: 100, max: 900 },
      { title: 'Quality Inspection', min: 60, max: 500 },
      { title: 'Supplier Vetting', min: 40, max: 350 },
    ],
    logistics: [
      { title: 'FCL Sea Freight Slot', min: 500, max: 3500 },
      { title: 'Air Cargo Booking', min: 300, max: 2200 },
      { title: 'Last-Mile Delivery', min: 15, max: 120 },
      { title: 'Cross-Border Trucking', min: 200, max: 1500 },
      { title: 'Cold Chain Transport', min: 250, max: 1800 },
    ],
  };
  const categories = Object.keys(productDefs);
  const brandsByCategory = {
    electronics: ['Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Sony'],
    textiles: ['Raymond', 'Arvind', 'Welspun', 'Vardhman', 'Trident'],
    machinery: ['Caterpillar', 'Bosch', 'Siemens', 'Hitachi', 'Komatsu'],
    food: ['Nestlé', 'Unilever', 'Tata Consumer', 'Britannia', 'Olam'],
    construction: ['UltraTech', 'ACC', 'Ambuja', 'JSW', 'Tata Steel'],
    packaging: ['Amcor', 'Tetra Pak', 'Mondi', 'Sealed Air', 'WestRock'],
    services: ['SGS', 'Bureau Veritas', 'TÜV SÜD', 'Intertek', 'DHL'],
    logistics: ['Maersk', 'DHL', 'FedEx', 'DB Schenker', 'Kuehne+Nagel'],
  };

  function buildProducts() {
    const list = [];
    let id = 0;
    categories.forEach((cat, ci) => {
      const brands = brandsByCategory[cat];
      productDefs[cat].forEach((def) => {
        brands.forEach((brand) => {
          id++;
          const span = def.max - def.min;
          list.push({
            id,
            cat,
            title: `${brand} ${def.title}`,
            price: Math.round(def.min + ((id * 13) % (span || 1))),
            color: palette[ci % palette.length],
          });
        });
      });
    });
    return list;
  }
  const allProducts = buildProducts();

  function svgThumb(color) {
    return `<svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="220" height="140" fill="${color}" opacity="0.16"/>
      <circle cx="60" cy="70" r="34" fill="${color}" opacity="0.35"/>
      <rect x="120" y="40" width="70" height="70" rx="10" fill="${color}" opacity="0.5"/>
    </svg>`;
  }

  /* ---------- Wishlist (shared localStorage key with marketplace.js) ---------- */
  const WISHLIST_KEY = 'ometong_wishlist';
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
    catch { return []; }
  }
  function saveWishlist(ids) { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)); }

  const wishlistGrid = document.getElementById('wishlistGrid');
  const wishlistEmpty = document.getElementById('wishlistEmpty');
  const statSaved = document.getElementById('statSaved');

  function renderWishlist() {
    const ids = getWishlist();
    const items = ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
    statSaved.textContent = items.length;

    if (items.length === 0) {
      wishlistGrid.innerHTML = '';
      wishlistGrid.style.display = 'none';
      wishlistEmpty.hidden = false;
      return;
    }
    wishlistGrid.style.display = 'grid';
    wishlistEmpty.hidden = true;
    wishlistGrid.innerHTML = items.map(p => `
      <div class="wish-card" data-id="${p.id}">
        <div class="wish-thumb" style="background:${p.color}12">
          ${svgThumb(p.color)}
          <button class="wish-remove" data-remove="${p.id}" aria-label="Remove from saved items">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="wish-body">
          <div class="wish-title">${p.title}</div>
          <div class="wish-price">$${p.price} <small>/unit</small></div>
        </div>
      </div>
    `).join('');
  }
  renderWishlist();

  wishlistGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id = parseInt(btn.dataset.remove, 10);
    const ids = getWishlist().filter(x => x !== id);
    saveWishlist(ids);
    renderWishlist();
  });

  /* ---------- Recent orders (demo data — no backend/order history exists yet) ---------- */
  const demoOrders = [
    { title: 'Samsung Smartphone', supplier: 'Horizon Supply Co.', color: '#FF7431', date: '24 Jul 2026', amount: 512, status: 'transit', statusLabel: 'In Transit' },
    { title: 'Bosch Gearbox Assembly', supplier: 'Lanka Industrial Group', color: '#3A6FF7', date: '19 Jul 2026', amount: 1240, status: 'processing', statusLabel: 'Processing' },
    { title: 'Nestlé Spice Blend Pack', supplier: 'Spice Route Exports', color: '#22C55E', date: '11 Jul 2026', amount: 96, status: 'delivered', statusLabel: 'Delivered' },
    { title: 'Amcor Corrugated Box Lot', supplier: 'Island Manufacturing', color: '#8B5CF6', date: '2 Jul 2026', amount: 168, status: 'delivered', statusLabel: 'Delivered' },
  ];

  const ordersList = document.getElementById('ordersList');
  const statActiveOrders = document.getElementById('statActiveOrders');
  const statInTransit = document.getElementById('statInTransit');
  const statTotalSpent = document.getElementById('statTotalSpent');

  function renderOrders() {
    ordersList.innerHTML = demoOrders.map(o => `
      <div class="order-row">
        <div class="order-product">
          <div class="order-thumb" style="background:${o.color}22"></div>
          <div>
            <div class="order-product-name">${o.title}</div>
            <div class="order-product-sub">${o.supplier}</div>
          </div>
        </div>
        <span class="order-date">${o.date}</span>
        <span class="order-amount">$${o.amount.toLocaleString()}</span>
        <span class="order-status ${o.status}">${o.statusLabel}</span>
        <span></span>
      </div>
    `).join('');

    const active = demoOrders.filter(o => o.status !== 'delivered').length;
    const inTransit = demoOrders.filter(o => o.status === 'transit').length;
    const totalSpent = demoOrders.reduce((sum, o) => sum + o.amount, 0);
    statActiveOrders.textContent = active;
    statInTransit.textContent = inTransit;
    statTotalSpent.textContent = '$' + totalSpent.toLocaleString();
  }
  renderOrders();

});
