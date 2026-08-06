/* =========================================================
   OMETONG — BUYER DASHBOARD SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Dark mode (shared "theme" preference with marketplace.html) ---------- */
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
    apparel: [
      { title: 'Cotton Crew T-Shirt', min: 4, max: 18 },
      { title: 'Oxford Formal Shirt', min: 9, max: 34 },
      { title: 'Slim-Fit Chino Trousers', min: 12, max: 42 },
      { title: 'Padded Winter Jacket', min: 22, max: 95 },
      { title: 'Performance Training Tee', min: 6, max: 24 },
      { title: 'Silk-Blend Blouse', min: 11, max: 40 },
      { title: 'Printed Summer Dress', min: 14, max: 55 },
      { title: 'High-Waist Trousers', min: 13, max: 46 },
      { title: 'Seamless Gym Leggings', min: 8, max: 30 },
      { title: 'Tailored Office Blazer', min: 25, max: 90 },
      { title: 'Kids Cotton Set', min: 5, max: 20 },
      { title: 'Industrial Work Uniform', min: 10, max: 38 },
      { title: 'Canvas Sneakers', min: 9, max: 36 },
      { title: 'Leather Tote Bag', min: 16, max: 70 },
    ],
    textiles: [
      { title: 'Cotton Fabric Roll', min: 15, max: 120 },
      { title: 'Jersey Knit Roll', min: 18, max: 130 },
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
    apparel: ['Shahi Exports', 'Epic Group', 'Crystal Intl', 'Youngor', 'Esquel'],
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
  function saveWishlist(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    if (window.ometongSyncWishlistToServer) window.ometongSyncWishlistToServer(ids);
  }

  // Ids from the generated demo catalog are numbers; real listings use
  // Supabase UUID strings and aren't in allProducts, so they need a
  // separate lookup — without this, a saved real product would silently
  // never appear here.
  async function loadRealWishlistItems(ids) {
    if (!window.sb || !ids.length) return [];
    const { data, error } = await window.sb
      .from('listings')
      .select('id, title, price, image_url')
      .in('id', ids);
    if (error || !data) return [];
    return data.map((row, i) => ({
      id: row.id,
      title: row.title,
      price: Number(row.price),
      color: palette[i % palette.length],
      image: row.image_url || null
    }));
  }

  const wishlistGrid = document.getElementById('wishlistGrid');
  const wishlistEmpty = document.getElementById('wishlistEmpty');
  const statSaved = document.getElementById('statSaved');

  async function renderWishlist() {
    const ids = getWishlist();
    const demoItems = ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
    const realIds = ids.filter(id => !allProducts.some(p => p.id === id));
    const realItems = await loadRealWishlistItems(realIds);

    const byId = new Map();
    demoItems.forEach(p => byId.set(String(p.id), p));
    realItems.forEach(p => byId.set(String(p.id), p));
    const items = ids.map(id => byId.get(String(id))).filter(Boolean);

    statSaved.textContent = items.length;

    if (items.length === 0) {
      wishlistGrid.innerHTML = '';
      wishlistGrid.style.display = 'none';
      wishlistEmpty.hidden = false;
      return;
    }
    wishlistGrid.style.display = 'grid';
    wishlistEmpty.hidden = true;
    const esc2 = window.ometongEscapeHTML || (s => s);
    wishlistGrid.innerHTML = items.map(p => `
      <div class="wish-card" data-id="${p.id}">
        <div class="wish-thumb" style="background:${p.color}12">
          ${p.image ? `<img src="${esc2(p.image)}" alt="${esc2(p.title)}" style="width:100%;height:100%;object-fit:cover;">` : svgThumb(p.color)}
          <button class="wish-remove" data-remove="${p.id}" aria-label="Remove from saved items">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="wish-body">
          <div class="wish-title">${esc2(p.title)}</div>
          <div class="wish-price">$${p.price} <small>/unit</small></div>
        </div>
      </div>
    `).join('');
  }
  renderWishlist();

  // cartSync.js merges the account's saved wishlist in after login —
  // refresh instead of leaving whatever rendered before that finished.
  document.addEventListener('ometongWishlistSynced', renderWishlist);

  wishlistGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const removeId = btn.dataset.remove;
    const ids = getWishlist().filter(x => String(x) !== removeId);
    saveWishlist(ids);
    renderWishlist();
  });

  /* ---------- Recent orders ----------
     Real orders placed via checkout.js, pulled from Supabase. RLS
     ("Buyers can view their own orders") already scopes this to the
     logged-in account, so a fresh account genuinely starts empty. */
  const ORDER_STATUS_MAP = {
    pending: { cls: 'processing', label: 'Pending payment' },
    paid: { cls: 'processing', label: 'Paid' },
    processing: { cls: 'processing', label: 'Processing' },
    shipped: { cls: 'transit', label: 'Shipped' },
    delivered: { cls: 'delivered', label: 'Delivered' },
    completed: { cls: 'delivered', label: 'Completed' },
    cancelled: { cls: 'cancelled', label: 'Cancelled' },
    refunded: { cls: 'cancelled', label: 'Refunded' }
  };
  const orderColors = ['#3A6FF7', '#8B5CF6', '#22C55E', '#FFC24D', '#FF7431'];

  const esc = window.ometongEscapeHTML || (s => s);
  let orders = [];
  let reviewedItemIds = new Set();
  let currentUserId = null;

  async function loadOrders() {
    if (!window.sb) return;
    const user = await window.ometongGetUser();
    if (!user) return;
    currentUserId = user.id;

    const [ordersRes, reviewsRes] = await Promise.all([
      window.sb.from('orders').select('*, order_items(*)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
      window.sb.from('reviews').select('order_item_id').eq('buyer_id', user.id)
    ]);

    if (ordersRes.error) {
      console.error('Ometong: failed to load orders', ordersRes.error);
      return;
    }
    if (reviewsRes.error) console.error('Ometong: failed to load reviews', reviewsRes.error);
    reviewedItemIds = new Set((reviewsRes.data || []).map(r => r.order_item_id));

    orders = (ordersRes.data || []).map((o, i) => {
      const items = o.order_items || [];
      const firstItem = items[0];
      const title = items.length > 1
        ? `${firstItem ? firstItem.title : 'Order'} +${items.length - 1} more`
        : (firstItem ? firstItem.title : 'Order');
      const statusInfo = ORDER_STATUS_MAP[o.status] || { cls: 'processing', label: o.status };
      const canReview = (o.status === 'delivered' || o.status === 'completed')
        && items.some(it => !reviewedItemIds.has(it.id));
      return {
        id: o.id,
        title,
        supplier: items.length ? `${items.length} item${items.length > 1 ? 's' : ''}` : '',
        date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        amount: Number(o.total) || 0,
        status: statusInfo.cls,
        statusLabel: statusInfo.label,
        color: orderColors[i % orderColors.length],
        items,
        canReview
      };
    });
  }

  const ordersList = document.getElementById('ordersList');
  const ordersHead = document.getElementById('ordersHead');
  const ordersEmpty = document.getElementById('ordersEmpty');
  const statActiveOrders = document.getElementById('statActiveOrders');
  const statInTransit = document.getElementById('statInTransit');
  const statTotalSpent = document.getElementById('statTotalSpent');

  function renderOrders() {
    if (orders.length === 0) {
      ordersList.innerHTML = '';
      if (ordersHead) ordersHead.style.display = 'none';
      if (ordersEmpty) ordersEmpty.hidden = false;
      statActiveOrders.textContent = '0';
      statInTransit.textContent = '0';
      statTotalSpent.textContent = '$0';
      return;
    }

    if (ordersHead) ordersHead.style.display = '';
    if (ordersEmpty) ordersEmpty.hidden = true;
    ordersList.innerHTML = orders.map(o => `
      <div class="order-row">
        <div class="order-product">
          <div class="order-thumb" style="background:${o.color}22"></div>
          <div>
            <div class="order-product-name">${esc(o.title)}</div>
            <div class="order-product-sub">${esc(o.supplier)}</div>
          </div>
        </div>
        <span class="order-date">${esc(o.date)}</span>
        <span class="order-amount">$${o.amount.toLocaleString()}</span>
        <span class="order-status ${o.status}">${esc(o.statusLabel)}</span>
        <span>${o.canReview ? `<button class="order-track" data-rate="${o.id}">Rate</button>` : ''}</span>
      </div>
    `).join('');

    ordersList.querySelectorAll('[data-rate]').forEach(btn => {
      btn.addEventListener('click', () => openRateModal(btn.getAttribute('data-rate')));
    });

    const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const inTransit = orders.filter(o => o.status === 'transit').length;
    const totalSpent = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.amount, 0);
    statActiveOrders.textContent = active;
    statInTransit.textContent = inTransit;
    statTotalSpent.textContent = '$' + totalSpent.toLocaleString();
  }

  /* ---------- Rate modal ---------- */
  const rateModal = document.getElementById('rateModal');
  const rateModalItems = document.getElementById('rateModalItems');
  const rateModalError = document.getElementById('rateModalError');
  const rateModalClose = document.getElementById('rateModalClose');
  const rateModalSubmit = document.getElementById('rateModalSubmit');
  let rateModalOrderId = null;

  function starPickerHTML(itemId) {
    return `<div class="star-picker" data-item="${itemId}">` +
      [1, 2, 3, 4, 5].map(n => `<button type="button" class="star-btn" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('') +
      `</div>`;
  }

  function openRateModal(orderId) {
    if (!rateModal) return;
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    rateModalOrderId = orderId;
    const toRate = order.items.filter(it => !reviewedItemIds.has(it.id));
    rateModalItems.innerHTML = toRate.map(it => `
      <div class="rate-item" data-order-item="${it.id}">
        <div class="rate-item-title">${esc(it.title)}</div>
        ${starPickerHTML(it.id)}
        <textarea class="rate-comment" rows="2" placeholder="Optional comment…"></textarea>
      </div>
    `).join('');
    rateModalItems.querySelectorAll('.star-picker').forEach(picker => {
      picker.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = Number(btn.dataset.star);
          picker.dataset.value = val;
          picker.querySelectorAll('.star-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.star) <= val));
        });
      });
    });
    if (rateModalError) { rateModalError.textContent = ''; rateModalError.classList.remove('show'); }
    rateModal.classList.add('show');
  }

  function closeRateModal() {
    rateModal?.classList.remove('show');
    rateModalOrderId = null;
  }
  rateModalClose?.addEventListener('click', closeRateModal);
  rateModal?.addEventListener('click', (e) => { if (e.target === rateModal) closeRateModal(); });

  rateModalSubmit?.addEventListener('click', async () => {
    if (!rateModalOrderId || !window.sb || !currentUserId) return;
    const rows = [];
    let missing = false;
    rateModalItems.querySelectorAll('.rate-item').forEach(row => {
      const picker = row.querySelector('.star-picker');
      const rating = Number(picker.dataset.value || 0);
      const comment = row.querySelector('.rate-comment').value.trim();
      if (rating < 1) { missing = true; return; }
      rows.push({
        order_id: rateModalOrderId,
        order_item_id: picker.dataset.item,
        buyer_id: currentUserId,
        rating,
        comment: comment || null
      });
    });
    if (missing || rows.length === 0) {
      rateModalError.textContent = 'Please choose a star rating for every item before submitting.';
      rateModalError.classList.add('show');
      return;
    }

    // Attach listing_id/supplier_id from the order's items so reviews
    // can be queried directly without joining back through orders.
    const order = orders.find(o => String(o.id) === String(rateModalOrderId));
    rows.forEach(row => {
      const item = order?.items.find(it => it.id === row.order_item_id);
      row.listing_id = item?.listing_id || null;
      row.supplier_id = item?.supplier_id || null;
    });

    rateModalSubmit.disabled = true;
    rateModalSubmit.textContent = 'Submitting…';
    const { error } = await window.sb.from('reviews').insert(rows);
    rateModalSubmit.disabled = false;
    rateModalSubmit.textContent = 'Submit rating';

    if (error) {
      rateModalError.textContent = error.message || 'Could not submit your rating. Please try again.';
      rateModalError.classList.add('show');
      return;
    }

    closeRateModal();
    await loadOrders();
    renderOrders();
  });

  (async () => {
    await loadOrders();
    renderOrders();
  })();

});
