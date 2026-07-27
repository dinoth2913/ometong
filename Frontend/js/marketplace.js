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
    return `
    <div class="p-card" style="animation-delay:${(index % 12) * 40}ms" data-id="${p.id}">
      <div class="p-thumb" style="background:${p.color}12">
        ${svgThumb(p.color, index)}
        ${p.badge ? `<span class="p-badge">${p.badge}</span>` : ''}
        <button class="p-fav" aria-label="Save item" data-fav="${p.id}">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
        </button>
      </div>
      <div class="p-body">
        <span class="p-cat">${p.cat}</span>
        <h4 class="p-title">${p.title}</h4>
        <div class="p-meta"><span class="stars">★ ${p.rating}</span><span>(${p.reviews}) · ${p.supplier}</span></div>
        <div class="p-foot">
          <span class="p-price">$${p.price}<small> /unit</small></span>
          <button class="p-add" data-add="${p.id}" aria-label="Add to cart">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
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
  refresh();
  updateCartBadge();

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