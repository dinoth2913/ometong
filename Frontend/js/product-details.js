/* =========================================================
   OMETONG — PRODUCT DETAILS SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- Mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

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
    apparel: [
      { title: 'Cotton Crew T-Shirt', min: 4, max: 18, sub: 'mens-t-shirts' },
      { title: 'Oxford Formal Shirt', min: 9, max: 34, sub: 'mens-shirts' },
      { title: 'Slim-Fit Chino Trousers', min: 12, max: 42, sub: 'mens-trousers' },
      { title: 'Padded Winter Jacket', min: 22, max: 95, sub: 'mens-outerwear' },
      { title: 'Performance Training Tee', min: 6, max: 24, sub: 'mens-activewear' },
      { title: 'Silk-Blend Blouse', min: 11, max: 40, sub: 'womens-tops' },
      { title: 'Printed Summer Dress', min: 14, max: 55, sub: 'womens-dresses' },
      { title: 'High-Waist Trousers', min: 13, max: 46, sub: 'womens-trousers' },
      { title: 'Seamless Gym Leggings', min: 8, max: 30, sub: 'womens-activewear' },
      { title: 'Tailored Office Blazer', min: 25, max: 90, sub: 'womens-officewear' },
      { title: 'Kids Cotton Set', min: 5, max: 20, sub: 'kids-clothing' },
      { title: 'Industrial Work Uniform', min: 10, max: 38, sub: 'uniforms-workwear' },
      { title: 'Canvas Sneakers', min: 9, max: 36, sub: 'footwear' },
      { title: 'Leather Tote Bag', min: 16, max: 70, sub: 'bags-accessories' },
    ],
    textiles: [
      { title: 'Cotton Fabric Roll', min: 15, max: 120, sub: 'woven-fabrics' },
      { title: 'Jersey Knit Roll', min: 18, max: 130, sub: 'knitted-fabrics' },
      { title: 'Denim Bulk Lot', min: 200, max: 900, sub: 'denim' },
      { title: 'Technical Mesh Cloth', min: 25, max: 150, sub: 'technical-textiles' },
      { title: 'Dye-Ready Yarn', min: 30, max: 200, sub: 'yarn-thread' },
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

  /* Maps the category label used on the Add Listing form to the
     lowercase slug used internally here (e.g. "Food & Beverage" -> food). */
  const categoryLabelToSlug = {
    'Electronics': 'electronics', 'Textiles': 'textiles', 'Machinery': 'machinery',
    'Food & Beverage': 'food', 'Construction': 'construction', 'Packaging': 'packaging',
    'Services': 'services', 'Logistics': 'logistics'
  };

  // Real listing ids are UUID strings, not the numeric ids used by the
  // generated catalog — this turns any id into a stable number so the
  // existing thumbnail/hero art generators (which do id % N) still work.
  function numericSeed(id) {
    if (typeof id === 'number') return id;
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return hash;
  }

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

  const descriptions = {
    electronics: 'Precision-tested components sourced from certified manufacturing lines, ready for bulk industrial integration. Every batch is inspected before it leaves the factory, and full spec sheets are available on request so your engineering team can verify fit before you commit to a bulk order.',
    apparel: 'Factory-direct garments made to spec, with full size grading, fabric and colour options, and private-label branding available on bulk orders. Pre-production samples can be requested so you can approve fit and finish before committing to a run.',
    textiles: 'Mill-direct material, quality-checked for weight, weave and colorfastness before it ever leaves the warehouse. Sample swatches can be requested ahead of a bulk purchase so you can confirm hand-feel and color match under your own lighting.',
    machinery: 'Heavy-duty industrial equipment built for continuous operation, with full spec sheets, wiring diagrams, and maintenance schedules available on request. Installation guidance is provided by the manufacturer\'s technical team.',
    food: 'Export-grade produce handled under cold-chain and food-safety compliance from farm to freight, with batch-level traceability documentation supplied for every shipment.',
    construction: 'Site-ready materials meeting standard structural and safety certifications for commercial projects, with test certificates available for import compliance.',
    packaging: 'Custom-fit packaging engineered for shipping durability and shelf presentation alike, with sample units available before committing to a full production run.',
    rubber: 'Sri Lanka is one of the world\'s leading natural rubber exporters — tires, gloves and industrial rubber goods produced to international quality standards.',
    gems: 'Sri Lanka — historically known as Ceylon — is world-renowned for fine gemstones, especially blue sapphires, ethically sourced and certified.',
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

  // Mirrors the same mapping in marketplace.js so a demo product's
  // detail page shows the same "Ships from" country as its card did
  // on the marketplace grid.
  const DEMO_SUPPLIER_ORIGIN = {
    'Ceylon Traders Ltd': 'Sri Lanka',
    'Horizon Supply Co.': 'China',
    'Lanka Industrial Group': 'Sri Lanka',
    'Spice Route Exports': 'China',
    'Island Manufacturing': 'Sri Lanka',
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
          const supplierName = ['Ceylon Traders Ltd', 'Horizon Supply Co.', 'Lanka Industrial Group', 'Spice Route Exports', 'Island Manufacturing'][id % 5];
          list.push({
            id, cat,
            title: `${brand} ${def.title}`,
            brand,
            supplier: supplierName,
            countryOfOrigin: DEMO_SUPPLIER_ORIGIN[supplierName] || 'China',
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

  /* ---------- Sri Lankan export specialties ----------
     Mirrors the same explicit, always-Sri-Lanka-origin product list
     in marketplace.js (same ids, 90000+) so a card's "View full
     details" link resolves correctly on this page too. */
  const SRI_LANKA_PRODUCTS = [
    { title: 'Knitted & Crocheted Clothing', cat: 'textiles', sub: 'knitted-fabrics', min: 6, max: 28 },
    { title: 'Intimate Apparel & Sportswear', cat: 'apparel', sub: 'womens-activewear', min: 5, max: 24 },
    { title: 'Non-Knit Clothing', cat: 'textiles', sub: 'woven-fabrics', min: 6, max: 30 },
    { title: 'Pure Ceylon Tea', cat: 'food', sub: 'tea-coffee', min: 3, max: 22 },
    { title: 'Industrial & Solid Rubber Tires', cat: 'rubber', sub: 'solid-industrial-tires', min: 40, max: 420 },
    { title: 'Pneumatic Tires', cat: 'rubber', sub: 'pneumatic-tires', min: 35, max: 260 },
    { title: 'Medical & Industrial Rubber Gloves', cat: 'rubber', sub: 'rubber-gloves', min: 4, max: 30 },
    { title: 'Ceylon Cinnamon', cat: 'food', sub: 'spices-seasonings', min: 5, max: 32 },
    { title: 'Black Pepper', cat: 'food', sub: 'spices-seasonings', min: 4, max: 26 },
    { title: 'Cloves', cat: 'food', sub: 'spices-seasonings', min: 6, max: 34 },
    { title: 'Nutmeg', cat: 'food', sub: 'spices-seasonings', min: 5, max: 30 },
    { title: 'Cardamom', cat: 'food', sub: 'spices-seasonings', min: 8, max: 45 },
    { title: 'Desiccated Coconut', cat: 'food', sub: 'nuts-dried-fruit', min: 2, max: 14 },
    { title: 'Virgin Coconut Oil', cat: 'food', sub: 'edible-oils', min: 3, max: 20 },
    { title: 'Coir-based Fiber Products', cat: 'textiles', sub: 'home-textiles', min: 3, max: 18 },
    { title: 'Blue Sapphires', cat: 'gems', sub: 'sapphires', min: 200, max: 8500 },
    { title: 'Cut & Polished Diamonds', cat: 'gems', sub: 'diamonds', min: 500, max: 12000 },
    { title: 'Electrical Machinery & Components', cat: 'machinery', sub: 'spare-parts', min: 20, max: 650 },
    { title: 'Fresh & Frozen Seafood', cat: 'food', sub: 'seafood', min: 6, max: 40 },
  ];
  const SRI_LANKA_SUPPLIERS = ['Ceylon Traders Ltd', 'Lanka Industrial Group', 'Island Manufacturing', 'Ceylon Export Co.', 'Lanka Global Exports'];

  function buildSriLankaProducts() {
    return SRI_LANKA_PRODUCTS.map((def, i) => {
      const id = 90000 + i;
      const cat = def.cat;
      const ci = categories.indexOf(cat);
      const span = def.max - def.min;
      return {
        id,
        cat,
        title: def.title,
        brand: 'Ceylon Export',
        supplier: SRI_LANKA_SUPPLIERS[i % SRI_LANKA_SUPPLIERS.length],
        countryOfOrigin: 'Sri Lanka',
        price: Math.round(def.min + ((id * 13) % (span || 1))),
        rating: (3.8 + ((id * 7) % 12) / 10).toFixed(1),
        reviews: 12 + (id * 5) % 200,
        color: palette[(ci >= 0 ? ci : 0) % palette.length],
        badge: 'Verified',
        description: descriptions[cat] || '',
        moq: 20 + (id * 17) % 180,
        leadTime: 5 + (id * 3) % 15,
      };
    });
  }

  // Demo/placeholder catalog is no longer shown on the marketplace — see
  // the matching change in marketplace.js. Left generating nothing here
  // too, so a stale numeric-id link doesn't quietly show a demo product
  // that no longer exists anywhere else on the site.
  const allProducts = [];

  /* ---------- Real listing lookup (a supplier/manufacturer's own product) ---------- */
  async function loadRealListing(id) {
    if (!window.sb) return null;
    const { data: row, error } = await window.sb
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .eq('is_approved', true)
      .single();
    if (error || !row) return null;

    const cat = categoryLabelToSlug[row.category] || 'services';
    const ci = categories.indexOf(cat);
    const { data: profileRows } = await window.sb
      .rpc('get_public_supplier_profiles', { supplier_ids: [row.supplier_id] });
    const profile = profileRows && profileRows[0];
    const supplierName = (profile && (profile.business_name || profile.full_name)) || 'Verified Seller';

    const { data: tierRows } = await window.sb
      .from('listing_price_tiers')
      .select('min_qty, price_per_unit')
      .eq('listing_id', row.id)
      .order('min_qty', { ascending: true });

    const { data: imageRows } = await window.sb
      .from('listing_images')
      .select('image_url')
      .eq('listing_id', row.id)
      .order('sort_order', { ascending: true });

    const { data: variantRows } = await window.sb
      .from('product_variants')
      .select('id, variant_name, sku, price, available_quantity')
      .eq('listing_id', row.id)
      .order('created_at', { ascending: true });

    const { data: certRows } = await window.sb
      .from('certifications')
      .select('id, name, issuing_body, certificate_number, status, expires_at')
      .eq('listing_id', row.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    // Cover photo (image_url) first, then the rest of the gallery —
    // mirrors how add-listing.js saves them (first upload = cover,
    // rest go into listing_images).
    const gallery = [row.image_url, ...(imageRows || []).map(r => r.image_url)].filter(Boolean);

    return {
      id: row.id,
      cat,
      title: row.title,
      brand: supplierName,
      supplier: supplierName,
      supplierId: row.supplier_id,
      price: Number(row.price),
      rating: null,
      reviews: 0,
      color: palette[(ci >= 0 ? ci : 0) % palette.length],
      image: row.image_url || null,
      gallery,
      badge: 'Verified',
      description: row.description || descriptions[cat] || '',
      moq: row.moq || null,
      leadTime: row.lead_time_days || null,
      availableQuantity: row.available_quantity, // null = not tracked (unlimited); a number = real, enforced stock
      countryOfOrigin: row.country_of_origin || null,
      hsCode: row.hs_code || null,
      warranty: row.warranty || null,
      specs: Array.isArray(row.specs) ? row.specs : [],
      priceTiers: tierRows || [],
      variants: variantRows || [],
      certifications: certRows || [],
      isReal: true
    };
  }

  /* ---------- Bulk pricing: resolve the unit price for a given qty ----------
     Mirrors get_bulk_unit_price() in bulk_pricing_schema.sql — kept as a
     plain client-side lookup here since the tiers are already loaded,
     rather than a round-trip per quantity change. */
  function unitPriceForQty(product, qty) {
    if (!product.priceTiers || !product.priceTiers.length) return product.price;
    let applicable = null;
    for (const tier of product.priceTiers) {
      if (tier.min_qty <= qty) applicable = tier;
      else break; // tiers are sorted ascending — nothing further qualifies
    }
    return applicable ? Number(applicable.price_per_unit) : product.price;
  }

  /* ---------- Cart (shared with marketplace.js / cart.html / checkout.html) ---------- */
  const CART_KEY = 'ometongCart';
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    if (window.ometongSyncCartToServer) window.ometongSyncCartToServer(items);
  }
  function cartTotalQty(items) { return items.reduce((sum, i) => sum + i.qty, 0); }
  function addToCart(product, qty) {
    const items = getCart();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
      // Re-resolve the unit price for the new total quantity — a
      // buyer adding more of the same bulk item may have just
      // crossed into a cheaper price tier.
      existing.price = unitPriceForQty(product, existing.qty);
    } else items.push({
      id: product.id,
      name: product.title,
      meta: product.supplier,
      badge: product.badge || 'New',
      price: unitPriceForQty(product, qty),
      qty,
      color: product.color,
      listingId: product.isReal ? product.id : null,
      supplierId: product.supplierId || null
    });
    saveCart(items);
    updateCartBadge();
  }
  function updateCartBadge() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = cartTotalQty(getCart());
  }
  updateCartBadge();
  // cartSync.js merges the account's saved cart in after login and
  // rewrites localStorage — refresh the badge once that's done instead
  // of leaving it showing whatever loaded before that merge finished.
  document.addEventListener('ometongCartSynced', updateCartBadge);

  /* ---------- Wishlist (shared with marketplace.js / buyerdashboard.js) ---------- */
  const WISHLIST_KEY = 'ometong_wishlist';
  function getWishlist() { try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; } catch { return []; } }
  function saveWishlist(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    if (window.ometongSyncWishlistToServer) window.ometongSyncWishlistToServer(ids);
  }
  function toggleWishlist(product) {
    const ids = getWishlist();
    const idx = ids.indexOf(product.id);
    if (idx === -1) ids.push(product.id); else ids.splice(idx, 1);
    saveWishlist(ids);
    return idx === -1;
  }

  /* ---------- Resolve product from URL ----------
     Numeric ids resolve against the generated catalog; anything else
     (a UUID) is a real listing, fetched from Supabase. */
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id');
  let product = null;
  let realListingFailed = false;
  if (rawId && /^\d+$/.test(rawId)) {
    product = allProducts.find(p => p.id === parseInt(rawId, 10)) || null;
  } else if (rawId) {
    product = await loadRealListing(rawId);
    if (!product) realListingFailed = true;
  }
  if (!product) product = allProducts[0];

  // Nothing resolved at all (no demo catalog exists to fall back to
  // any more, and either no id was given or the real listing genuinely
  // doesn't exist) — show a clean "not found" state instead of letting
  // the rest of this handler crash on a null product.
  if (!product) {
    const pdMain = document.getElementById('pdMain');
    if (pdMain) {
      pdMain.innerHTML = `
        <div class="container" style="padding:80px 24px;text-align:center;">
          <h1 style="margin-bottom:12px;">Product not found</h1>
          <p style="color:var(--ink-soft);margin-bottom:24px;">This product may have been removed, or the link is incorrect.</p>
          <a href="marketplace.html" class="btn-pill">Back to Marketplace</a>
        </div>`;
    }
    return;
  }

  // A real listing link (?id=<uuid>) that didn't resolve — either it
  // genuinely doesn't exist/isn't approved, or the fetch just failed
  // — used to silently swap in an unrelated demo product with no
  // indication anything was wrong. Show a clear notice instead so
  // it's obvious this isn't the product that was linked to.
  if (realListingFailed) {
    const breadcrumb = document.getElementById('breadcrumb');
    const notice = document.createElement('p');
    notice.className = 'ometong-load-state ometong-load-state--error';
    notice.style.textAlign = 'left';
    notice.textContent = "We couldn't load that specific product — it may have been removed, or something went wrong loading it. Showing a similar item instead.";
    breadcrumb?.insertAdjacentElement('afterend', notice);
  }
  const catLabel = product.cat.charAt(0).toUpperCase() + product.cat.slice(1);

  // Record this as a "recently viewed" product — rendered further
  // down, once the DOM section for it exists.
  window.ometongRecentlyViewed?.track(product);

  /* ---------- Reviews (open to any logged-in user, on any product) ----------
     Keyed by product_ref, which is just the product's id as text, so this
     works for both real listings (uuid) and the generated demo catalog. */
  const productRef = String(product.id);
  let reviewList = [];
  let currentUser = null;
  let myReview = null;

  async function loadReviews() {
    if (!window.sb) return;
    const { data: rows, error } = await window.sb
      .from('product_reviews')
      .select('*')
      .eq('product_ref', productRef)
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load reviews', error); return; }
    reviewList = rows || [];

    // profiles are private, so names come from a function that exposes
    // only a display name for exactly these reviewers
    const ids = [...new Set(reviewList.map(r => r.user_id))];
    if (ids.length) {
      const { data: authors } = await window.sb.rpc('get_review_authors', { user_ids: ids });
      const nameById = {};
      (authors || []).forEach(a => { nameById[a.id] = a.display_name; });
      reviewList.forEach(r => { r.authorName = nameById[r.user_id] || 'Ometong user'; });
    }
    myReview = currentUser ? reviewList.find(r => r.user_id === currentUser.id) || null : null;
  }

  if (window.ometongGetUser) currentUser = await window.ometongGetUser();
  await loadReviews();

  // Real ratings replace the demo catalog's generated ones as soon as
  // anyone actually reviews the product.
  if (reviewList.length) {
    product.rating = (reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length).toFixed(1);
    product.reviews = reviewList.length;
  }

  /* ---------- Breadcrumb ---------- */
  document.getElementById('crumbCat').textContent = catLabel;
  document.getElementById('crumbTitle').textContent = product.title;
  document.title = `${product.title} | Ometong`;

  /* ---------- Render main product panel ---------- */
  const pdGrid = document.getElementById('pdGrid');
  const esc = window.ometongEscapeHTML;
  // Real listings with more than one uploaded photo (add-listing.js's
  // multi-photo upload -> public.listing_images) get a real thumbnail
  // strip that swaps the actual images; everything else keeps the
  // existing single-image / synthetic-thumbnail behavior.
  const realGallery = product.gallery && product.gallery.length ? product.gallery : (product.image ? [product.image] : []);
  pdGrid.innerHTML = `
    <div class="pd-gallery">
      <div class="pd-main-image" id="pdMainImage" style="background:${product.color}10">
        ${realGallery.length ? `<img src="${esc(realGallery[0])}" alt="${esc(product.title)}" style="width:100%;height:100%;object-fit:cover;">` : svgHero(product.color, numericSeed(product.id))}
        ${product.badge ? `<span class="pd-badge">${esc(product.badge)}</span>` : ''}
        <button class="pd-fav${getWishlist().includes(product.id) ? ' saved' : ''}" id="pdFav" aria-label="Save item">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>
        </button>
      </div>
      ${realGallery.length > 1 ? `<div class="pd-thumb-strip" id="pdThumbStrip">
        ${realGallery.map((url, i) => `<button class="${i === 0 ? 'active' : ''}" data-real-thumb="${esc(url)}" style="background:${product.color}10"><img src="${esc(url)}" alt="" style="width:100%;height:100%;object-fit:cover;"></button>`).join('')}
      </div>` : (realGallery.length === 0 ? `<div class="pd-thumb-strip" id="pdThumbStrip">
        ${[0, 1, 2, 3].map(i => `<button class="${i === 0 ? 'active' : ''}" data-thumb="${i}" style="background:${product.color}10">${svgThumb(product.color, numericSeed(product.id) + i)}</button>`).join('')}
      </div>` : '')}
    </div>

    <div class="pd-info">
      <span class="pd-cat-tag">${catLabel}</span>
      <h1 class="pd-title">${esc(product.title)}</h1>
      <div class="pd-rating-row">
        ${product.rating != null
          ? `<span class="pd-stars"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z"/></svg>${product.rating}</span>
        <span class="pd-reviews-count">${product.reviews} reviews</span>`
          : `<span class="pd-stars pd-stars-new">New listing</span>`}
        <span class="pd-supplier-link">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
          ${esc(product.supplier)}
        </span>
      </div>

      <div class="pd-price-row">
        <span class="pd-price" id="pdPrice">$${product.price}</span>
        <span class="pd-price-unit">/ unit</span>
      </div>

      ${product.variants && product.variants.length ? `
      <div class="pd-variants" id="pdVariants">
        <span class="pd-variants-label">Choose an option</span>
        <div class="pd-variant-options" id="pdVariantOptions">
          ${product.variants.map((v, i) => `
            <button type="button" class="pd-variant-btn${i === 0 ? ' active' : ''}" data-variant-id="${esc(v.id)}"${v.available_quantity === 0 ? ' disabled' : ''}>
              ${esc(v.variant_name)}${v.available_quantity === 0 ? ' (Out of stock)' : ''}
            </button>`).join('')}
        </div>
      </div>` : ''}

      ${product.priceTiers && product.priceTiers.length ? `
      <div class="pd-bulk-pricing">
        <span class="pd-bulk-pricing-label">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M20.6 12l-8-8H4v8.6l8 8 8.6-8.6z"/><circle cx="8" cy="8" r="1.4"/></svg>
          Bulk pricing
        </span>
        <div class="pd-bulk-tiers" id="pdBulkTiers">
          <div class="pd-bulk-tier" data-min-qty="1">
            <span>1${product.priceTiers[0].min_qty > 1 ? '–' + (product.priceTiers[0].min_qty - 1) : ''}</span>
            <strong>$${product.price}</strong>
          </div>
          ${product.priceTiers.map((t, i) => {
            const next = product.priceTiers[i + 1];
            const range = next ? `${t.min_qty}–${next.min_qty - 1}` : `${t.min_qty}+`;
            return `<div class="pd-bulk-tier" data-min-qty="${t.min_qty}"><span>${range}</span><strong>$${Number(t.price_per_unit)}</strong></div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="pd-specs-grid">
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 9l9-6 9 6-9 6-9-6zM3 9v9l9 6M21 9v9l-9 6"/></svg></div>
          <span class="pd-spec-label">MOQ</span>
          <span class="pd-spec-value">${product.moq ? product.moq + ' units' : 'Contact seller'}</span>
        </div>
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></div>
          <span class="pd-spec-label">Lead time</span>
          <span class="pd-spec-value">${product.leadTime != null ? product.leadTime + ' days' : 'Contact seller'}</span>
        </div>
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></div>
          <span class="pd-spec-label">Condition</span>
          <span class="pd-spec-value">${esc(product.badge) || 'Standard'}</span>
        </div>
        ${product.countryOfOrigin ? `
        <div class="pd-spec-card">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></div>
          <span class="pd-spec-label">Origin</span>
          <span class="pd-spec-value">${esc(product.countryOfOrigin)}${product.hsCode ? ' · HS ' + esc(product.hsCode) : ''}</span>
        </div>` : ''}
        ${product.availableQuantity != null ? `
        <div class="pd-spec-card${product.availableQuantity <= 0 ? ' pd-spec-out-of-stock' : ''}">
          <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 018 0v2"/></svg></div>
          <span class="pd-spec-label">Stock</span>
          <span class="pd-spec-value">${product.availableQuantity > 0 ? product.availableQuantity.toLocaleString('en-US') + ' available' : 'Out of stock'}</span>
        </div>` : ''}
      </div>

      <p class="pd-desc">${esc(product.description)}</p>

      ${product.certifications && product.certifications.length ? `
      <div class="pd-certifications" id="pdCertifications">
        ${product.certifications.map(c => `
          <span class="pd-cert-badge" title="${esc(c.issuing_body || '')}${c.certificate_number ? ' · ' + esc(c.certificate_number) : ''}">
            <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
            ${esc(c.name)}
          </span>`).join('')}
      </div>` : ''}

      <div class="pd-trust-row">
        <span class="pd-trust-item"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>Escrow-protected purchase</span>
        <span class="pd-trust-item"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 16V9h9v7M12 16h9v-4l-3-3h-6M6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z"/></svg>Logistics included</span>
      </div>

      <div class="pd-actions">
        <div class="pd-qty">
          <button type="button" id="pdQtyMinus" aria-label="Decrease quantity">–</button>
          <input type="number" id="pdQtyInput" value="1" min="1"${product.availableQuantity != null ? ` max="${Math.max(product.availableQuantity, 0)}"` : ''}>
          <button type="button" id="pdQtyPlus" aria-label="Increase quantity">+</button>
        </div>
        <button class="pd-add-btn" id="pdAddBtn"${product.availableQuantity != null && product.availableQuantity <= 0 ? ' disabled' : ''}>
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>
          ${product.availableQuantity != null && product.availableQuantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
        ${product.isReal ? `
        <button class="pd-contact-btn" id="pdContactBtn" type="button" title="Sent to our team, who relay it to the seller — buyers and sellers don't message each other directly on Ometong">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 4h16v12H7l-3 3V4z"/></svg>
          Contact Supplier
        </button>` : ''}
      </div>
    </div>
  `;

  /* ---------- Product details (warranty + seller-added specs) ----------
     Only real listings can have these (add-listing.js) — the demo
     catalog has neither, so the section stays hidden for those,
     exactly like the small marketplace card, which is untouched. */
  const pdMoreDetailsSection = document.getElementById('pdMoreDetailsSection');
  const pdMoreDetailsGrid = document.getElementById('pdMoreDetailsGrid');
  if (pdMoreDetailsSection && pdMoreDetailsGrid) {
    const specRows = Array.isArray(product.specs) ? product.specs : [];
    if (product.warranty || specRows.length) {
      pdMoreDetailsSection.hidden = false;
      const cards = [];
      if (product.warranty) {
        cards.push(`
          <div class="pd-spec-card">
            <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg></div>
            <span class="pd-spec-label">Warranty</span>
            <span class="pd-spec-value">${esc(product.warranty)}</span>
          </div>`);
      }
      specRows.forEach(s => {
        if (!s || !s.label || !s.value) return;
        cards.push(`
          <div class="pd-spec-card">
            <div class="pd-spec-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></div>
            <span class="pd-spec-label">${esc(s.label)}</span>
            <span class="pd-spec-value">${esc(s.value)}</span>
          </div>`);
      });
      pdMoreDetailsGrid.innerHTML = cards.join('');
    } else {
      pdMoreDetailsSection.hidden = true;
    }
  }

  /* ---------- Reviews (real listings only) ---------- */
  const pdReviewsSection = document.getElementById('pdReviewsSection');
  const pdReviewsList = document.getElementById('pdReviewsList');
  const pdReviewForm = document.getElementById('pdReviewForm');
  const pdReviewSummary = document.getElementById('pdReviewSummary');

  function renderReviewSummary() {
    if (!pdReviewSummary) return;
    if (!reviewList.length) {
      pdReviewSummary.textContent = 'No reviews yet — be the first to rate this.';
      return;
    }
    const avg = (reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length).toFixed(1);
    pdReviewSummary.innerHTML =
      `<span class="pd-review-avg">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span>` +
      `<strong>${avg}</strong> out of 5 · ${reviewList.length} review${reviewList.length === 1 ? '' : 's'}`;
  }

  function renderReviewList() {
    if (!pdReviewsList) return;
    if (!reviewList.length) { pdReviewsList.innerHTML = ''; return; }
    pdReviewsList.innerHTML = reviewList.map(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      const isMine = currentUser && r.user_id === currentUser.id;
      return `
        <div class="pd-review-row">
          <div class="pd-review-head">
            <span class="pd-review-stars">${stars}</span>
            <span class="pd-review-author">${esc(r.authorName || 'Ometong user')}</span>
            ${r.is_verified_purchase ? '<span class="pd-review-verified">Verified Buyer</span>' : ''}
            ${isMine ? '<span class="pd-review-mine">You</span>' : ''}
            <span class="pd-review-date">${date}</span>
          </div>
          ${r.comment ? `<p class="pd-review-comment">${esc(r.comment)}</p>` : ''}
          ${isMine ? '<button type="button" class="pd-review-delete" id="pdReviewDelete">Delete my review</button>' : ''}
        </div>`;
    }).join('');

    const del = document.getElementById('pdReviewDelete');
    if (del) del.addEventListener('click', deleteMyReview);
  }

  function renderReviewForm() {
    if (!pdReviewForm) return;
    if (!currentUser) {
      pdReviewForm.innerHTML =
        `<p class="pd-review-signin">
           <a href="authenticationpage.html">Log in</a> to rate this product and leave a comment.
         </p>`;
      return;
    }
    const existing = myReview;
    const startRating = existing ? existing.rating : 0;
    pdReviewForm.innerHTML = `
      <h3>${existing ? 'Edit your review' : 'Write a review'}</h3>
      <p class="pd-review-error" id="pdReviewError"></p>
      <div class="pd-star-picker" id="pdStarPicker" data-value="${startRating}">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="pd-star-btn${n <= startRating ? ' active' : ''}" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
      </div>
      <textarea id="pdReviewComment" rows="3" placeholder="Share what you thought of this product (optional)…">${existing && existing.comment ? esc(existing.comment) : ''}</textarea>
      <button type="button" class="btn-primary-sm" id="pdReviewSubmit">${existing ? 'Update review' : 'Submit review'}</button>
    `;

    const picker = document.getElementById('pdStarPicker');
    picker.querySelectorAll('.pd-star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.dataset.star);
        picker.dataset.value = val;
        picker.querySelectorAll('.pd-star-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.star) <= val));
      });
    });
    document.getElementById('pdReviewSubmit').addEventListener('click', submitReview);
  }

  async function submitReview() {
    const picker = document.getElementById('pdStarPicker');
    const errorEl = document.getElementById('pdReviewError');
    const submitBtn = document.getElementById('pdReviewSubmit');
    const rating = Number(picker.dataset.value || 0);
    const comment = document.getElementById('pdReviewComment').value.trim();

    if (rating < 1) {
      errorEl.textContent = 'Please choose a star rating first.';
      errorEl.classList.add('show');
      return;
    }
    errorEl.classList.remove('show');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    // one review per person per product, so re-submitting edits theirs
    const { error } = await window.sb
      .from('product_reviews')
      .upsert({
        product_ref: productRef,
        user_id: currentUser.id,
        rating,
        comment: comment || null
      }, { onConflict: 'product_ref,user_id' });

    submitBtn.disabled = false;
    if (error) {
      errorEl.textContent = error.message || 'Could not save your review. Please try again.';
      errorEl.classList.add('show');
      renderReviewForm();
      return;
    }
    await loadReviews();
    renderAllReviews();
  }

  async function deleteMyReview() {
    if (!currentUser || !window.confirm('Delete your review?')) return;
    const { error } = await window.sb
      .from('product_reviews')
      .delete()
      .eq('product_ref', productRef)
      .eq('user_id', currentUser.id);
    if (error) { console.error('Ometong: failed to delete review', error); return; }
    await loadReviews();
    renderAllReviews();
  }

  function renderAllReviews() {
    renderReviewSummary();
    renderReviewList();
    renderReviewForm();
  }

  if (pdReviewsSection) {
    pdReviewsSection.hidden = false;
    renderAllReviews();
  }

  /* ---------- Thumbnail swap ----------
     Two flavors: a real uploaded photo (data-real-thumb, swaps the
     main image to that actual URL) or the synthetic demo-catalog
     thumbnail (data-thumb, different generated angle/tint) — only
     one flavor is ever rendered per product, see realGallery above. */
  document.querySelectorAll('#pdThumbStrip button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pdThumbStrip button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mainImg = document.getElementById('pdMainImage');
      const badge = mainImg.querySelector('.pd-badge');
      const fav = mainImg.querySelector('.pd-fav');
      const realUrl = btn.getAttribute('data-real-thumb');
      if (realUrl) {
        mainImg.innerHTML = `<img src="${esc(realUrl)}" alt="${esc(product.title)}" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        const i = parseInt(btn.dataset.thumb, 10);
        mainImg.innerHTML = svgHero(product.color, numericSeed(product.id) + i * 3);
      }
      if (badge) mainImg.appendChild(badge);
      if (fav) mainImg.appendChild(fav);
    });
  });

  /* ---------- Favorite toggle ---------- */
  document.getElementById('pdFav').addEventListener('click', (e) => {
    const nowSaved = toggleWishlist(product);
    e.currentTarget.classList.toggle('saved', nowSaved);
  });
  // cartSync.js merges the account's saved wishlist in after login —
  // reflect that on this product's heart icon instead of leaving
  // whatever rendered before that merge finished.
  document.addEventListener('ometongWishlistSynced', (e) => {
    const ids = e.detail || [];
    const fav = document.getElementById('pdFav');
    if (fav) fav.classList.toggle('saved', ids.some(x => String(x) === String(product.id)));
  });

  /* ---------- Variant selector ----------
     A flat price on the selected variant overrides bulk-pricing tiers
     (tiers belong to the base product); no price on the variant means
     it just inherits whatever the base product/tiers already resolve to. */
  let selectedVariant = product.variants && product.variants.length ? product.variants[0] : null;
  const pdVariantOptions = document.getElementById('pdVariantOptions');
  pdVariantOptions?.querySelectorAll('.pd-variant-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      pdVariantOptions.querySelectorAll('.pd-variant-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedVariant = product.variants.find(v => String(v.id) === btn.dataset.variantId) || null;
      refreshPriceForQty();
    });
  });

  /* ---------- Quantity stepper (+ live bulk-price update) ---------- */
  const qtyInput = document.getElementById('pdQtyInput');
  const pdPriceEl = document.getElementById('pdPrice');
  const pdBulkTiers = document.getElementById('pdBulkTiers');

  function refreshPriceForQty() {
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    const unitPrice = (selectedVariant && selectedVariant.price != null) ? Number(selectedVariant.price) : unitPriceForQty(product, qty);
    if (pdPriceEl) pdPriceEl.textContent = '$' + unitPrice;
    if (pdBulkTiers) {
      const tierEls = [...pdBulkTiers.querySelectorAll('.pd-bulk-tier')];
      let activeEl = tierEls[0];
      tierEls.forEach(el => {
        if (parseInt(el.dataset.minQty, 10) <= qty) activeEl = el;
      });
      tierEls.forEach(el => el.classList.toggle('active', el === activeEl));
    }
  }

  // When this listing tracks stock, qtyInput carries a `max` attribute
  // (set in the HTML above) — clamp every path that changes the value
  // to that ceiling so a buyer can't spin the stepper past what's
  // actually available. Listings that don't track stock have no
  // `max` attribute at all, so this is a no-op for them.
  function clampQty(value) {
    const max = qtyInput.max !== '' ? parseInt(qtyInput.max, 10) : null;
    if (max != null && value > max) return max;
    return value;
  }

  document.getElementById('pdQtyMinus').addEventListener('click', () => {
    qtyInput.value = Math.max(1, parseInt(qtyInput.value || '1', 10) - 1);
    refreshPriceForQty();
  });
  document.getElementById('pdQtyPlus').addEventListener('click', () => {
    qtyInput.value = clampQty(parseInt(qtyInput.value || '1', 10) + 1);
    refreshPriceForQty();
  });
  qtyInput.addEventListener('change', () => {
    if (!qtyInput.value || parseInt(qtyInput.value, 10) < 1) qtyInput.value = 1;
    else qtyInput.value = clampQty(parseInt(qtyInput.value, 10));
    refreshPriceForQty();
  });
  qtyInput.addEventListener('input', refreshPriceForQty);
  refreshPriceForQty();

  /* ---------- Add to cart ---------- */
  document.getElementById('pdAddBtn').addEventListener('click', (e) => {
    const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
    if (selectedVariant) {
      const hasOwnPrice = selectedVariant.price != null;
      addToCart({
        ...product,
        id: product.id + ':' + selectedVariant.id,
        title: product.title + ' — ' + selectedVariant.variant_name,
        price: hasOwnPrice ? Number(selectedVariant.price) : product.price,
        // a variant's own flat price overrides bulk-pricing tiers entirely — see refreshPriceForQty()
        priceTiers: hasOwnPrice ? [] : product.priceTiers,
        listingId: product.id, // the real order_items.listing_id still points at the base listing — variants aren't tracked there yet
      }, qty);
    } else {
      addToCart(product, qty);
    }
    const btn = e.currentTarget;
    btn.classList.add('added');
    const original = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12l4 4 10-10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Added to cart';
    setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = original; }, 1400);
  });

  /* ---------- Contact Supplier (mediated — never a direct line) ----------
     Buyers and suppliers don't message each other on Ometong; this opens
     (or reuses) an inquiry routed through Ometong staff, then hands off
     to messages.html where the buyer types their first message. See
     supabase/marketplace_enhancements_schema.sql section 1. */
  const pdContactBtn = document.getElementById('pdContactBtn');
  pdContactBtn?.addEventListener('click', async () => {
    if (!window.sb) return;
    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) {
      window.location.href = 'authenticationpage.html';
      return;
    }
    pdContactBtn.disabled = true;
    const original = pdContactBtn.innerHTML;
    pdContactBtn.innerHTML = 'Opening…';
    const { data: inquiryId, error } = await window.sb.rpc('start_inquiry', {
      p_supplier_id: product.supplierId,
      p_listing_ref: String(product.id),
      p_order_id: null,
      p_subject: `Re: ${product.title}`,
      p_first_message: null
    });
    if (error) {
      console.error('Ometong: failed to start inquiry', error);
      pdContactBtn.disabled = false;
      pdContactBtn.innerHTML = original;
      return;
    }
    window.location.href = `messages.html?inquiry=${inquiryId}`;
  });

  /* ---------- Related products (same category) ---------- */
  const relatedGrid = document.getElementById('relatedGrid');
  const relatedSection = document.getElementById('relatedSection');
  const related = allProducts.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 8);
  if (relatedSection) relatedSection.hidden = related.length === 0;
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

  /* ---------- Recently viewed (everything but this product) ---------- */
  window.ometongRecentlyViewed?.renderInto(
    document.getElementById('recentlyViewedSection'),
    document.getElementById('recentlyViewedGrid'),
    product.id
  );

});
