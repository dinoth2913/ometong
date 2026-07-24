/* =========================================================
   OMEGO MARKET — CART & CHECKOUT SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Theme toggle (same behavior as marketplace.js, so
     the dark/light choice carries over between the two pages) ---------- */
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
  if (savedTheme) setTheme(savedTheme);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  else setTheme('light');

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Cart storage (shared with marketplace.js via localStorage) ---------- */
  const CART_KEY = 'omego_cart';
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
  function cartTotalQty(items) { return items.reduce((sum, i) => sum + i.qty, 0); }

  const cartCountEl = document.getElementById('cartCount');
  function updateCartBadge() {
    if (cartCountEl) cartCountEl.textContent = cartTotalQty(getCart());
  }

  /* ---------- Views ---------- */
  const cartView = document.getElementById('cartView');
  const checkoutView = document.getElementById('checkoutView');
  const successView = document.getElementById('successView');
  const cartSubline = document.getElementById('cartSubline');

  function showView(view) {
    [cartView, checkoutView, successView].forEach(v => v.style.display = 'none');
    view.style.display = 'block';
  }
  showView(cartView);

  /* ---------- Pricing helpers ---------- */
  function calcTotals(items) {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const shipping = items.length === 0 ? 0 : (subtotal > 500 ? 0 : 25);
    return { subtotal, shipping, total: subtotal + shipping };
  }
  const money = (n) => `$${n.toLocaleString()}`;

  /* ---------- Render cart ---------- */
  const cartItemsEl = document.getElementById('cartItems');
  const cartEmptyEl = document.getElementById('cartEmpty');
  const checkoutBtn = document.getElementById('checkoutBtn');

  function itemRowHTML(item) {
    return `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-thumb" style="background:${item.color}22"></div>
      <div class="cart-item-body">
        <span class="ci-cat">${item.cat}</span>
        <h4 class="ci-title">${item.title}</h4>
        <span class="ci-supplier">${item.supplier}</span>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
        <span class="qty-val">${item.qty}</span>
        <button type="button" class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
      </div>
      <div class="ci-price">$${(item.price * item.qty).toLocaleString()}</div>
      <button type="button" class="cart-remove" data-action="remove" aria-label="Remove item">
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>
      </button>
    </div>`;
  }

  function renderCart() {
    const items = getCart();
    const empty = items.length === 0;
    cartEmptyEl.style.display = empty ? 'flex' : 'none';
    cartItemsEl.style.display = empty ? 'none' : 'flex';
    cartItemsEl.innerHTML = items.map(itemRowHTML).join('');

    const { subtotal, shipping, total } = calcTotals(items);
    document.getElementById('sumSubtotal').textContent = money(subtotal);
    document.getElementById('sumShipping').textContent = shipping === 0 ? 'Free' : money(shipping);
    document.getElementById('sumTotal').textContent = money(total);

    if (cartSubline) {
      const qty = cartTotalQty(items);
      cartSubline.textContent = empty ? 'Your cart is empty.' : `${qty} item${qty === 1 ? '' : 's'} in your cart.`;
    }
    if (checkoutBtn) checkoutBtn.disabled = empty;
    updateCartBadge();
  }

  renderCart();

  /* ---------- Cart item interactions (qty +/-, remove) ---------- */
  cartItemsEl.addEventListener('click', (e) => {
    const row = e.target.closest('.cart-item');
    if (!row) return;
    const id = parseInt(row.dataset.id, 10);
    const items = getCart();
    const item = items.find(i => i.id === id);
    if (!item) return;

    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'inc') item.qty++;
    if (action === 'dec') item.qty = Math.max(1, item.qty - 1);
    if (action === 'remove') {
      const idx = items.indexOf(item);
      items.splice(idx, 1);
    }
    saveCart(items);
    renderCart();
  });

  /* ---------- Promo code (visual only — no backend to validate against) ---------- */
  document.getElementById('promoBtn')?.addEventListener('click', () => {
    const input = document.getElementById('promoInput');
    if (input.value.trim()) {
      input.placeholder = 'Code not recognized';
      input.value = '';
    }
  });

  /* ---------- Go to checkout ---------- */
  checkoutBtn?.addEventListener('click', () => {
    if (getCart().length === 0) return;
    renderCheckoutSummary();
    showView(checkoutView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('backToCart')?.addEventListener('click', () => {
    showView(cartView);
  });

  /* ---------- Payment option selection styling ---------- */
  document.querySelectorAll('.pay-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input').checked = true;
    });
  });

  /* ---------- Checkout order summary ---------- */
  function renderCheckoutSummary() {
    const items = getCart();
    const lineWrap = document.getElementById('checkoutLineItems');
    lineWrap.innerHTML = items.map(i => `
      <div class="co-line"><span>${i.qty}× ${i.title}</span><span>$${(i.price * i.qty).toLocaleString()}</span></div>
    `).join('');
    const { subtotal, shipping, total } = calcTotals(items);
    document.getElementById('coSubtotal').textContent = money(subtotal);
    document.getElementById('coShipping').textContent = shipping === 0 ? 'Free' : money(shipping);
    document.getElementById('coTotal').textContent = money(total);
  }

  /* ---------- Place order (simulated backend routing to suppliers) ---------- */
  const checkoutForm = document.getElementById('checkoutForm');
  checkoutForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('placeOrderBtn');
    btn.querySelector('span').textContent = 'Placing order…';
    btn.disabled = true;

    setTimeout(() => {
      const items = getCart();
      const orderNo = 'OM-' + Math.floor(100000 + Math.random() * 900000);
      
      // Save simulated transactions for suppliers
      const transactions = JSON.parse(localStorage.getItem('omego_transactions')) || [];
      const timestamp = new Date().toISOString();
      
      items.forEach(item => {
        transactions.push({
          orderId: orderNo,
          productId: item.id,
          productTitle: item.title,
          supplier: item.supplier,
          price: item.price,
          qty: item.qty,
          total: item.price * item.qty,
          status: 'pending',
          date: timestamp
        });
      });
      
      localStorage.setItem('omego_transactions', JSON.stringify(transactions));

      document.getElementById('orderNumber').textContent = '#' + orderNo;
      saveCart([]);
      updateCartBadge();
      showView(successView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 800);
  });

});
