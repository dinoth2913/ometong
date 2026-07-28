/* =========================================================
   OMETONGPLACE — SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Theme Toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle?.querySelector('.sun-icon');
  const moonIcon = themeToggle?.querySelector('.moon-icon');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
  } else {
    setTheme('light');
  }

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Data ---------- */
  const palette = ['#FF7431', '#3A6FF7', '#FFC24D', '#22C55E', '#8B5CF6'];

  /* Each category lists its product types with a realistic price band (USD). */
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

  /* Real brands per category, so buyers can filter the way they actually shop. */
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

  const descriptions = {
    electronics: 'Precision-tested components sourced from certified manufacturing lines, ready for bulk industrial integration.',
    textiles: 'Mill-direct material, quality-checked for weight, weave and colorfastness before it ever leaves the warehouse.',
    machinery: 'Heavy-duty industrial equipment built for continuous operation, with full spec sheets available on request.',
    food: 'Export-grade produce handled under cold-chain and food-safety compliance from farm to freight.',
    construction: 'Site-ready materials meeting standard structural and safety certifications for commercial projects.',
    packaging: 'Custom-fit packaging engineered for shipping durability and shelf presentation alike.',
    services: 'A dedicated specialist team managing this end-to-end, so your shipment never sits idle waiting on paperwork.',
    logistics: 'Tracked, insured movement with real-time visibility from pickup to final delivery.',
  };

  function svgThumb(color, i) {
    return `<svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" fill="${color}" opacity="0.16"/>
      <circle cx="${40 + (i % 4) * 12}" cy="70" r="34" fill="${color}" opacity="0.35"/>
      <rect x="120" y="40" width="70" height="70" rx="10" fill="${color}" opacity="0.5"/>
    </svg>`;
  }

  function buildProducts() {
    const list = [];
    let id = 0;
    categories.forEach((cat, ci) => {
      const brands = brandsByCategory[cat];
      productDefs[cat].forEach((def, ni) => {
        brands.forEach((brand, bi) => {
          id++;
          const span = def.max - def.min;
          list.push({
            id,
            cat,
            title: `${brand} ${def.title}`,
            brand,
            supplier: ['Ceylon Traders Ltd', 'Horizon Supply Co.', 'Lanka Industrial Group', 'Spice Route Exports', 'Island Manufacturing'][id % 5],
            price: Math.round(def.min + ((id * 13) % (span || 1))),
            rating: (3.6 + ((id * 7) % 14) / 10).toFixed(1),
            reviews: 8 + (id * 5) % 240,
            color: palette[ci % palette.length],
            badge: id % 6 === 0 ? 'New' : (id % 5 === 0 ? 'Verified' : null),
            description: descriptions[cat],
            moq: 10 + (id * 17) % 190,
            leadTime: 3 + (id * 3) % 18,
          });
        });
      });
    });
    return list;
  }

  const allProducts = buildProducts();

  /* ---------- Cart (persisted in localStorage, shared with cart.html) ---------- */
  const CART_KEY = 'ometong_cart';
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
  function cartTotalQty(items) { return items.reduce((sum, i) => sum + i.qty, 0); }
  function addToCart(product) {
    const items = getCart();
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty++;
    else items.push({ id: product.id, title: product.title, cat: product.cat, supplier: product.supplier, price: product.price, color: product.color, qty: 1 });
    saveCart(items);
    updateCartBadge();
  }
  function updateCartBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = cartTotalQty(getCart());
  }

  /* ---------- Render ---------- */
  const grid = document.getElementById('productGrid');
  const resultCount = document.getElementById('resultCount');

  function cardHTML(p, index) {
    const catLabel = p.cat.charAt(0).toUpperCase() + p.cat.slice(1);
    return `
    <div class="p-card" style="animation-delay:${(index % 12) * 40}ms" data-id="${p.id}">
      <div class="p-thumb" style="background:${p.color}12">
        ${svgThumb(p.color, index)}
        <span class="p-price-badge">$${p.price}<small> /unit</small></span>
        <button class="p-fav" aria-label="Save item" data-fav="${p.id}">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
        </button>
        ${p.badge ? `<span class="p-badge">${p.badge}</span>` : ''}
      </div>
      <div class="p-body">
        <div class="p-head">
          <h4 class="p-title">${p.title}</h4>
          <span class="p-rating"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/></svg>${p.rating}<span class="p-reviews">(${p.reviews})</span></span>
        </div>
        <div class="p-meta">
          <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          ${p.supplier}, ${catLabel}
        </div>
        <div class="p-specs">
          <span class="p-spec"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M20.6 12l-8-8H4v8.6l8 8 8.6-8.6z"/><circle cx="8" cy="8" r="1.4"/></svg>${catLabel}</span>
          <span class="p-spec"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>${p.badge || 'Standard'}</span>
        </div>
        <div class="p-expand">
          <p class="p-desc">${p.description}</p>
          <div class="p-expand-stats">
            <div class="p-expand-stat">
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 9l9-6 9 6-9 6-9-6zM3 9v9l9 6M21 9v9l-9 6"/></svg>
              <span><strong>${p.moq}</strong> units MOQ</span>
            </div>
            <div class="p-expand-stat">
              <svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
              <span><strong>${p.leadTime}</strong> day lead time</span>
            </div>
          </div>
          <div class="p-expand-trust">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
            Escrow-protected purchase
          </div>
        </div>
        <button class="p-add" data-add="${p.id}">
          <svg viewBox="0 0 24 24" width="15" height="15"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>
          Add to Cart
        </button>
      </div>
    </div>`;
  }

  function render(list) {
    grid.innerHTML = list.map(cardHTML).join('');
    resultCount.textContent = `${list.length} listing${list.length === 1 ? '' : 's'}`;
  }

  /* ---------- State ---------- */
  let activeCat = 'all';
  let activeBrand = 'all';
  let query = '';
  let sortMode = 'relevance';
  let priceMinVal = null;
  let priceMaxVal = null;

  function currentList() {
    let list = allProducts;
    if (activeCat !== 'all') list = list.filter(p => p.cat === activeCat);
    if (activeBrand !== 'all') list = list.filter(p => p.brand === activeBrand);
    if (priceMinVal !== null) list = list.filter(p => p.price >= priceMinVal);
    if (priceMaxVal !== null) list = list.filter(p => p.price <= priceMaxVal);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.cat.includes(q) || p.supplier.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    list = [...list];
    if (sortMode === 'price-low') list.sort((a, b) => a.price - b.price);
    if (sortMode === 'price-high') list.sort((a, b) => b.price - a.price);
    if (sortMode === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }

  function refresh() { render(currentList()); }

  /* ---------- Brand filter (options depend on the active category) ---------- */
  const brandSelect = document.getElementById('brandSelect');
  function populateBrandOptions() {
    if (!brandSelect) return;
    const brands = activeCat === 'all'
      ? [...new Set(categories.flatMap(c => brandsByCategory[c]))].sort()
      : [...brandsByCategory[activeCat]];
    const previous = activeBrand;
    brandSelect.innerHTML = '<option value="all">Brand: All</option>' +
      brands.map(b => `<option value="${b}">${b}</option>`).join('');
    activeBrand = brands.includes(previous) ? previous : 'all';
    brandSelect.value = activeBrand;
  }
  brandSelect?.addEventListener('change', () => {
    activeBrand = brandSelect.value;
    refresh();
  });

  /* ---------- Price range filter ---------- */
  const priceMinInput = document.getElementById('priceMin');
  const priceMaxInput = document.getElementById('priceMax');
  priceMinInput?.addEventListener('input', () => {
    priceMinVal = priceMinInput.value === '' ? null : Number(priceMinInput.value);
    refresh();
  });
  priceMaxInput?.addEventListener('input', () => {
    priceMaxVal = priceMaxInput.value === '' ? null : Number(priceMaxInput.value);
    refresh();
  });

  /* ---------- Clear filters ---------- */
  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    activeCat = 'all';
    activeBrand = 'all';
    query = '';
    sortMode = 'relevance';
    priceMinVal = null;
    priceMaxVal = null;
    const searchEl = document.getElementById('searchInput');
    const sortEl = document.getElementById('sortSelect');
    if (searchEl) searchEl.value = '';
    if (priceMinInput) priceMinInput.value = '';
    if (priceMaxInput) priceMaxInput.value = '';
    if (sortEl) sortEl.value = 'relevance';
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === 'all'));
    populateBrandOptions();
    refresh();
  });

  /* ---------- Category from URL (e.g. marketplace.html?cat=electronics) ---------- */
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat && categories.includes(urlCat)) {
    activeCat = urlCat;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === urlCat));
    document.querySelectorAll('.bar-2 [data-tab]').forEach(a => a.classList.remove('active'));
  }

  populateBrandOptions();
  refresh();
  updateCartBadge();

  if (urlCat && categories.includes(urlCat)) {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Category chips ---------- */
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCat = chip.dataset.cat;
      populateBrandOptions();
      refresh();
    });
  });

  /* ---------- Search ---------- */
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', () => {
    query = searchInput.value.trim();
    refresh();
  });
  document.getElementById('aiBtn')?.addEventListener('click', () => {
    query = searchInput.value.trim();
    refresh();
    searchInput.focus();
  });

  /* ---------- Sort ---------- */
  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    sortMode = e.target.value;
    refresh();
  });

  /* ---------- Tabs in bar 2 (Products / Services filter shortcut) ---------- */
  document.querySelectorAll('.bar-2 [data-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.bar-2 a').forEach(a => a.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'services') {
        activeCat = 'services';
        document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === 'services'));
      } else {
        activeCat = 'all';
        document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === 'all'));
      }
      populateBrandOptions();
      refresh();
      document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- Cart + favorites (event delegation, since cards re-render) ---------- */
  grid.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      const id = parseInt(addBtn.dataset.add, 10);
      const product = allProducts.find(p => p.id === id);
      if (product) addToCart(product);
      addBtn.classList.add('added');
      setTimeout(() => addBtn.classList.remove('added'), 700);
      return;
    }
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      favBtn.classList.toggle('saved');
    }
  });

});