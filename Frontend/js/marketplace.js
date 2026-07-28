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
  const names = {
    electronics: ['Industrial Sensor Kit', 'LED Panel Array', 'Circuit Board Set', 'Power Inverter 5kW', 'Smart Meter Unit'],
    textiles: ['Cotton Fabric Roll', 'Woven Poly Bags', 'Denim Bulk Lot', 'Technical Mesh Cloth', 'Dye-Ready Yarn'],
    machinery: ['CNC Spindle Unit', 'Hydraulic Press', 'Conveyor Motor', 'Industrial Compressor', 'Gearbox Assembly'],
    food: ['Ceylon Cinnamon Bulk', 'Roasted Cashew Lot', 'Coconut Oil Drums', 'Spice Blend Pack', 'Tea Leaf Crates'],
    construction: ['Steel Rebar Bundle', 'Cement Pallet', 'PVC Pipe Set', 'Roofing Sheet Lot', 'Aggregate Supply'],
    packaging: ['Corrugated Box Lot', 'Stretch Film Rolls', 'Pallet Wrap Set', 'Custom Carton Batch', 'Foam Insert Pack'],
    services: ['Customs Documentation', 'Freight Insurance Plan', 'Warehousing Package', 'Quality Inspection', 'Supplier Vetting'],
    logistics: ['FCL Sea Freight Slot', 'Air Cargo Booking', 'Last-Mile Delivery', 'Cross-Border Trucking', 'Cold Chain Transport'],
  };
  const categories = Object.keys(names);

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
      names[cat].forEach((title, ni) => {
        id++;
        list.push({
          id,
          cat,
          title,
          supplier: ['Ceylon Traders Ltd', 'Horizon Supply Co.', 'Lanka Industrial Group', 'Spice Route Exports', 'Island Manufacturing'][ (id) % 5 ],
          price: Math.round((20 + (id * 13) % 480) * 1.0),
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
  let query = '';
  let sortMode = 'relevance';

  function currentList() {
    let list = allProducts;
    if (activeCat !== 'all') list = list.filter(p => p.cat === activeCat);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.cat.includes(q) || p.supplier.toLowerCase().includes(q));
    }
    list = [...list];
    if (sortMode === 'price-low') list.sort((a, b) => a.price - b.price);
    if (sortMode === 'price-high') list.sort((a, b) => b.price - a.price);
    if (sortMode === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }

  function refresh() { render(currentList()); }

  /* ---------- Category from URL (e.g. marketplace.html?cat=electronics) ---------- */
  const urlCat = new URLSearchParams(window.location.search).get('cat');
  if (urlCat && categories.includes(urlCat)) {
    activeCat = urlCat;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.toggle('active', c.dataset.cat === urlCat));
    document.querySelectorAll('.bar-2 [data-tab]').forEach(a => a.classList.remove('active'));
  }

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