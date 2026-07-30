/* =========================================================
   OMETONG — PRODUCT DETAILS SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Theme toggle (shared "theme" key across the site) ---------- */
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

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Same deterministic product catalog as marketplace.js ---------- */
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

  const descriptions = {
    electronics: 'Precision-tested components sourced from certified manufacturing lines, ready for bulk industrial integration. Every batch is inspected before it leaves the factory, and full spec sheets are available on request so your engineering team can verify fit before you commit to a bulk order.',
    textiles: 'Mill-direct material, quality-checked for weight, weave and colorfastness before it ever leaves the warehouse. Sample swatches can be requested ahead of a bulk purchase so you can confirm hand-feel and color match under your own lighting.',
    machinery: 'Heavy-duty industrial equipment built for continuous operation, with full spec sheets, wiring diagrams, and maintenance schedules available on request. Installation guidance is provided by the manufacturer\'s technical team.',
    food: 'Export-grade produce handled under cold-chain and food-safety compliance from farm to freight, with batch-level traceability documentation supplied for every shipment.',
    construction: 'Site-ready materials meeting standard structural and safety certifications for commercial projects, with test certificates available for import compliance.',
    packaging: 'Custom-fit packaging engineered for shipping durability and shelf presentation alike, with sample units available before committing to a full production run.',
    services: 'A dedicated specialist team manages this end-to-end, so your shipment never sits idle waiting on paperwork or approvals.',
    logistics: 'Tracked, insured movement with real-time visibility from pickup to final delivery, backed by Ometong\'s logistics partner network across all supported regions.',
  };

  function svgThumb(color, i) {
    return `<svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" fill="${color}" opacity="0.16"/>
      <circle cx="${40 + (i % 4) * 12}" cy="70" r="34" fill="${color}" opacity="0.35"/>
      <rect x="120" y="40" width="70" height="70" rx="10" fill="${color}" opacity="0.5"/>
    </svg>`;
  }
  function svgHero(color, seed) {
    return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${color}" opacity="0.14"/>
      <circle cx="${140 + (seed % 3) * 20}" cy="220" r="90" fill="${color}" opacity="0.3"/>
      <rect x="220" y="110" width="150" height="150" rx="24" fill="${color}" opacity="0.45"/>
      <circle cx="120" cy="120" r="34" fill="${color}" opacity="0.6"/>
    </svg>`;
  }

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
            id, cat,
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

  /* ---------- Cart (shared with marketplace.js / cart.html) ---------- */
  const CART_KEY = 'ometong_cart';
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
  function saveCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
  function cartTotalQty(items) { return items.reduce((sum, i) => sum + i.qty, 0); }
  function addToCart(product, qty) {
    const items = getCart();
    const existing = items.find(i => i.id === product.id);
    if (existing) existing.qty += qty;
    else items.push({ id: product.id, title: product.title, cat: product.cat, supplier: product.supplier, price: product.price, color: product.color, qty });
    saveCart(items);
    updateCartBadge();
  }
  function updateCartBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = cartTotalQty(getCart());
  }
  updateCartBadge();

  /* ---------- Wishlist (shared with marketplace.js / buyerdashboard.js) ---------- */
  const WISHLIST_KEY = 'ometong_wishlist';
  function getWishlist() { try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; } catch { return []; } }
  function saveWishlist(ids) { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)); }
  function toggleWishlist(product) {
    const ids = getWishlist();
    const idx = ids.indexOf(product.id);
    if (idx === -1) ids.push(product.id); else ids.splice(idx, 1);
    saveWishlist(ids);
    return idx === -1;
  }

  /* ---------- Resolve product from URL ---------- */
  const params = new URLSearchParams(window.location.search);
  const productId = parseInt(params.get('id'), 10);
  const product = allProducts.find(p => p.id === productId) || allProducts[0];
  const catLabel = product.cat.charAt(0).toUpperCase() + product.cat.slice(1);

  /* ---------- Breadcrumb ---------- */
  document.getElementById('crumbCat').textContent = catLabel;
  document.getElementById('crumbTitle').textContent = product.title;
  document.title = `${product.title} | Ometong`;

  /* ---------- Render main product panel ---------- */
  const pdGrid = document.getElementById('pdGrid');
  pdGrid.innerHTML = `
    <div class="pd-gallery">
      <div class="pd-main-image" id="pdMainImage" style="background:${product.color}10">
        ${svgHero(product.color, product.id)}
        ${product.badge ? `<span class="pd-badge">${product.badge}</span>` : ''}
        <button class="pd-fav${getWishlist().includes(product.id) ? ' saved' : ''}" id="pdFav" aria-label="Save item">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
        </button>
      </div>
      <div class="pd-thumb-strip" id="pdThumbStrip">
        ${[0, 1, 2, 3].map(i => `<button class="${i === 0 ? 'active' : ''}" data-thumb="${i}" style="background:${product.color}10">${svgThumb(product.color, product.id + i)}</button>`).join('')}
      </div>
    </div>

    <div class="pd-info">
      <span class="pd-cat-tag">${catLabel}</span>
      <h1 class="pd-title">${product.title}</h1>
      <div class="pd-rating-row">
        <span class="pd-stars"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/></svg>${product.rating}</span>
        <span class="pd-reviews-count">${product.reviews} reviews</span>
        <span class="pd-supplier-link">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          ${product.supplier}
        </span>
      </div>

      <div class="pd-price-row">
        <span class="pd-price">$${product.price}</span>
        <span class="pd-price-unit">/ unit</span>
      </div>

      <div class="pd-specs-grid">
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 9l9-6 9 6-9 6-9-6zM3 9v9l9 6M21 9v9l-9 6"/></svg></div>
          <span class="pd-spec-label">MOQ</span>
          <span class="pd-spec-value">${product.moq} units</span>
        </div>
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></div>
          <span class="pd-spec-label">Lead time</span>
          <span class="pd-spec-value">${product.leadTime} days</span>
        </div>
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></div>
          <span class="pd-spec-label">Condition</span>
          <span class="pd-spec-value">${product.badge || 'Standard'}</span>
        </div>
      </div>

      <p class="pd-desc">${product.description}</p>

      <div class="pd-trust-row">
        <span class="pd-trust-item"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>Escrow-protected purchase</span>
        <span class="pd-trust-item"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 16V9h9v7M12 16h9v-4l-3-3h-6M6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z"/></svg>Logistics included</span>
      </div>

      <div class="pd-actions">
        <div class="pd-qty">
          <button type="button" id="pdQtyMinus" aria-label="Decrease quantity">–</button>
          <input type="number" id="pdQtyInput" value="1" min="1">
          <button type="button" id="pdQtyPlus" aria-label="Increase quantity">+</button>
        </div>
        <button class="pd-add-btn" id="pdAddBtn">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>
          Add to Cart
        </button>
      </div>
    </div>
  `;

  /* ---------- Thumbnail swap (visual only — different angle tint) ---------- */
  document.querySelectorAll('#pdThumbStrip button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pdThumbStrip button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const i = parseInt(btn.dataset.thumb, 10);
      const mainImg = document.getElementById('pdMainImage');
      const badge = mainImg.querySelector('.pd-badge');
      const fav = mainImg.querySelector('.pd-fav');
      mainImg.innerHTML = svgHero(product.color, product.id + i * 3);
      if (badge) mainImg.appendChild(badge);
      if (fav) mainImg.appendChild(fav);
    });
  });

  /* ---------- Favorite toggle ---------- */
  document.getElementById('pdFav').addEventListener('click', (e) => {
    const nowSaved = toggleWishlist(product);
    e.currentTarget.classList.toggle('saved', nowSaved);
  });

  /* ---------- Quantity stepper ---------- */
  const qtyInput = document.getElementById('pdQtyInput');
  document.getElementById('pdQtyMinus').addEventListener('click', () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
  });
  document.getElementById('pdQtyPlus').addEventListener('click', () => {
    qtyInput.value = parseInt(qtyInput.value || '1', 10) + 1;
  });
  qtyInput.addEventListener('change', () => {
    if (!qtyInput.value || parseInt(qtyInput.value, 10) < 1) qtyInput.value = 1;
  });

  /* ---------- Add to cart ---------- */
  document.getElementById('pdAddBtn').addEventListener('click', (e) => {
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    addToCart(product, qty);
    const btn = e.currentTarget;
    btn.classList.add('added');
    const original = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12l4 4 10-10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Added to cart';
    setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = original; }, 1400);
  });

  /* ---------- Related products (same category) ---------- */
  const relatedGrid = document.getElementById('relatedGrid');
  const related = allProducts.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 8);
  relatedGrid.innerHTML = related.map((p, i) => `
    <div class="rel-card" data-id="${p.id}">
      <div class="rel-thumb" style="background:${p.color}12">
        ${svgThumb(p.color, i)}
        <span class="rel-price">$${p.price}</span>
      </div>
      <div class="rel-body">
        <div class="rel-title">${p.title}</div>
        <div class="rel-meta">${p.supplier}</div>
      </div>
    </div>`).join('');

  relatedGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.rel-card');
    if (card) {
      window.location.href = `product-details.html?id=${card.dataset.id}`;
      window.scrollTo({ top: 0 });
    }
  });

});
