/* ==========================================================================
   Cart.js — Ometong
   Handles: shared site chrome (loader, scroll progress, nav/mobile menu,
   announcement bar, back-to-top, footer year) plus all cart logic
   (render, quantity, remove, promo codes, totals, checkout, recommended
   add-to-cart). Cart state persists in localStorage so it survives reloads.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Config
     --------------------------------------------------------------------- */
  var STORAGE_KEY = "ometongCart";
  var PROMO_STORAGE_KEY = "ometongPromo";
  var TAX_RATE = 0.08;          // 8% estimated tax
  var FLAT_SHIPPING = 45;       // flat shipping fee
  var FREE_SHIPPING_THRESHOLD = 500; // subtotal at/above which shipping is free

  var PROMO_CODES = {
    "WELCOME10": { type: "percent", value: 10, label: "10% off" },
    "SAVE20": { type: "flat", value: 20, label: "$20 off" },
    "FREESHIP": { type: "shipping", value: 0, label: "Free shipping" }
  };

  // Seed data used only the very first time a visitor has no saved cart.
  var DEFAULT_ITEMS = [
    {
      id: "sensor-kit",
      name: "Industrial Sensor Kit",
      meta: "Apex Electronics",
      badge: "Verified",
      price: 212,
      qty: 2,
      color: "#FF743118"
    },
    {
      id: "poly-bags",
      name: "Woven Poly Bags",
      meta: "Horizon Supply Co.",
      badge: "New",
      price: 38,
      qty: 10,
      color: "#3A6FF718"
    },
    {
      id: "cnc-spindle",
      name: "CNC Spindle Unit",
      meta: "Lanka Industrial Group",
      badge: "Verified",
      price: 1240,
      qty: 1,
      color: "#8B5CF618"
    }
  ];

  /* ---------------------------------------------------------------------
     State
     --------------------------------------------------------------------- */
  var cart = loadCart();
  var appliedPromo = loadPromo(); // { code, ...PROMO_CODES[code] } or null

  /* ---------------------------------------------------------------------
     DOM refs (grabbed once DOM is ready)
     --------------------------------------------------------------------- */
  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheEls();
    initSharedChrome();
    initCart();
  });

  /* ---------------------------------------------------------------------
     Storage helpers
     --------------------------------------------------------------------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore malformed storage */ }
    return DEFAULT_ITEMS.slice();
  }

  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* storage full/unavailable */ }
    if (window.ometongSyncCartToServer) window.ometongSyncCartToServer(cart);
  }

  function loadPromo() {
    try {
      var raw = localStorage.getItem(PROMO_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function savePromo() {
    try {
      if (appliedPromo) localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(appliedPromo));
      else localStorage.removeItem(PROMO_STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------------
     Shared site chrome: loader, scroll progress, nav, announce, back-top
     --------------------------------------------------------------------- */
  function initSharedChrome() {
    // Loader
    var loader = document.getElementById("loader");
    window.addEventListener("load", function () {
      setTimeout(function () {
        if (loader) loader.classList.add("is-hidden");
      }, 250);
    });
    // Fallback in case 'load' already fired before listener attached
    if (document.readyState === "complete" && loader) {
      setTimeout(function () { loader.classList.add("is-hidden"); }, 250);
    }

    // Scroll progress bar
    var progress = document.getElementById("scrollProgress");
    function updateProgress() {
      if (!progress) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progress.style.width = pct + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    // Announcement bar dismiss (remember across visits)
    var announce = document.getElementById("announce");
    var announceClose = document.getElementById("announceClose");
    if (announce && localStorage.getItem("ometongAnnounceDismissed") === "1") {
      announce.classList.add("is-hidden");
    }
    if (announceClose) {
      announceClose.addEventListener("click", function () {
        announce.classList.add("is-hidden");
        try { localStorage.setItem("ometongAnnounceDismissed", "1"); } catch (e) { /* ignore */ }
      });
    }

    // Mobile hamburger menu
    var hamburger = document.getElementById("hamburger");
    var mobileMenu = document.getElementById("mobileMenu");
    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function () {
        mobileMenu.classList.toggle("is-open");
        hamburger.classList.toggle("is-active");
      });
    }

    // Back to top button
    var backTop = document.getElementById("backTop");
    if (backTop) {
      window.addEventListener("scroll", function () {
        if (window.scrollY > 400) backTop.classList.add("is-visible");
        else backTop.classList.remove("is-visible");
      }, { passive: true });
      backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Footer year
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Newsletter form (no backend wired up yet — just acknowledge the submit)
    var nlForm = document.querySelector(".nl-form");
    if (nlForm) {
      nlForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = nlForm.querySelector("input[type='email']");
        if (input && input.value) {
          input.value = "";
          input.placeholder = "Thanks — you're subscribed!";
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Cart: DOM cache
     --------------------------------------------------------------------- */
  function cacheEls() {
    els.cartList = document.getElementById("cartList");
    els.cartEmpty = document.getElementById("cartEmpty");
    els.clearCartBtn = document.getElementById("clearCartBtn");
    els.navCartCount = document.getElementById("navCartCount");
    els.navCartCountMobile = document.getElementById("navCartCountMobile");

    els.summaryItemCount = document.getElementById("summaryItemCount");
    els.summarySubtotal = document.getElementById("summarySubtotal");
    els.summaryTax = document.getElementById("summaryTax");
    els.summaryShipping = document.getElementById("summaryShipping");
    els.summaryDiscountRow = document.getElementById("summaryDiscountRow");
    els.summaryDiscount = document.getElementById("summaryDiscount");
    els.summaryPromoCode = document.getElementById("summaryPromoCode");
    els.summaryTotal = document.getElementById("summaryTotal");

    els.promoForm = document.getElementById("promoForm");
    els.promoInput = document.getElementById("promoInput");
    els.promoMsg = document.getElementById("promoMsg");

    els.checkoutBtn = document.getElementById("checkoutBtn");
    els.recoScroll = document.getElementById("recoScroll");
  }

  /* ---------------------------------------------------------------------
     Cart: init
     --------------------------------------------------------------------- */
  function initCart() {
    renderCart();
    updateTotals();
    updateNavCount();

    // Fires once cartSync.js finishes merging the account's saved cart
    // (from Supabase) with whatever was already in this browser. Without
    // this, the page would keep showing whatever loaded synchronously
    // before that async merge completed.
    document.addEventListener("ometongCartSynced", function (e) {
      cart = e.detail || [];
      renderCart();
      updateTotals();
      updateNavCount();
    });

    if (els.clearCartBtn) {
      els.clearCartBtn.addEventListener("click", function () {
        if (!cart.length) return;
        if (window.confirm("Remove all items from your cart?")) {
          cart = [];
          appliedPromo = null;
          saveCart();
          savePromo();
          renderCart();
          updateTotals();
          updateNavCount();
        }
      });
    }

    if (els.promoForm) {
      els.promoForm.addEventListener("submit", function (e) {
        e.preventDefault();
        applyPromoCode(els.promoInput.value);
      });
    }

    if (els.checkoutBtn) {
      els.checkoutBtn.addEventListener("click", function () {
        if (!cart.length) return;
        els.checkoutBtn.disabled = true;
        var originalText = els.checkoutBtn.textContent;
        els.checkoutBtn.textContent = "Redirecting to checkout…";
        setTimeout(function () {
          window.location.href = "checkout.html";
        }, 500);
        // Safety: re-enable if navigation doesn't happen (e.g. page not built yet)
        setTimeout(function () {
          els.checkoutBtn.disabled = false;
          els.checkoutBtn.textContent = originalText;
        }, 3000);
      });
    }

    if (els.recoScroll) {
      els.recoScroll.addEventListener("click", function (e) {
        var card = e.target.closest(".feat-card--reco");
        if (!card) return;
        addRecommendedItem(card);
      });
    }

    // Reflect an already-applied promo (e.g. after reload) in the summary
    if (appliedPromo && els.promoInput) {
      els.promoInput.value = appliedPromo.code;
    }
  }

  /* ---------------------------------------------------------------------
     Cart: rendering
     --------------------------------------------------------------------- */
  function renderCart() {
    if (!els.cartList) return;
    els.cartList.innerHTML = "";

    if (!cart.length) {
      els.cartEmpty.hidden = false;
      return;
    }
    els.cartEmpty.hidden = true;

    cart.forEach(function (item) {
      els.cartList.appendChild(buildCartItemEl(item));
    });
  }

  function buildCartItemEl(item) {
    var li = document.createElement("li");
    li.className = "cart-item";
    li.dataset.id = item.id;

    li.innerHTML =
      '<div class="cart-item-thumb" style="background:' + escapeAttr(item.color || "#3A6FF718") + '"></div>' +
      '<div class="cart-item-info">' +
        '<h3>' + escapeHtml(item.name) + '</h3>' +
        '<div class="cart-item-meta">' +
          (item.badge ? '<span class="cart-item-badge">' + escapeHtml(item.badge) + '</span>' : '') +
          '<span>' + escapeHtml(item.meta || "") + '</span>' +
        '</div>' +
        '<div class="cart-item-unit-price">' + formatCurrency(item.price) + ' / unit</div>' +
      '</div>' +
      '<div class="qty-stepper">' +
        '<button type="button" class="qty-dec" aria-label="Decrease quantity">&minus;</button>' +
        '<input type="number" class="qty-input" min="1" max="999" value="' + item.qty + '" aria-label="Quantity">' +
        '<button type="button" class="qty-inc" aria-label="Increase quantity">+</button>' +
      '</div>' +
      '<div class="cart-item-right">' +
        '<span class="cart-item-line-total">' + formatCurrency(item.price * item.qty) + '</span>' +
        '<button type="button" class="cart-item-remove">Remove</button>' +
      '</div>';

    li.querySelector(".qty-dec").addEventListener("click", function () {
      changeQty(item.id, -1);
    });
    li.querySelector(".qty-inc").addEventListener("click", function () {
      changeQty(item.id, 1);
    });
    li.querySelector(".qty-input").addEventListener("change", function (e) {
      setQty(item.id, e.target.value);
    });
    li.querySelector(".cart-item-remove").addEventListener("click", function () {
      removeItem(item.id);
    });

    return li;
  }

  /* ---------------------------------------------------------------------
     Cart: mutations
     --------------------------------------------------------------------- */
  function findItem(id) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id) return cart[i];
    }
    return null;
  }

  function changeQty(id, delta) {
    var item = findItem(id);
    if (!item) return;
    setQty(id, item.qty + delta);
  }

  function setQty(id, value) {
    var item = findItem(id);
    if (!item) return;
    var qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    item.qty = qty;
    saveCart();
    renderCart();
    updateTotals();
    updateNavCount();
  }

  function removeItem(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
    updateTotals();
    updateNavCount();
  }

  function addRecommendedItem(card) {
    var id = card.dataset.id;
    var existing = findItem(id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: id,
        name: card.dataset.name,
        meta: card.dataset.meta,
        badge: "Added",
        price: parseFloat(card.dataset.price) || 0,
        qty: 1,
        color: card.dataset.color || "#3A6FF718"
      });
    }
    saveCart();
    renderCart();
    updateTotals();
    updateNavCount();

    // Quick visual acknowledgement on the card itself
    var original = card.style.boxShadow;
    card.style.boxShadow = "0 0 0 2px #22C55E";
    setTimeout(function () { card.style.boxShadow = original; }, 500);
  }

  /* ---------------------------------------------------------------------
     Totals
     --------------------------------------------------------------------- */
  function getSubtotal() {
    return cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  }

  function getItemCount() {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function computeTotals() {
    var subtotal = getSubtotal();
    var tax = subtotal * TAX_RATE;
    var shipping = (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) ? 0 : FLAT_SHIPPING;
    var discount = 0;

    if (appliedPromo && subtotal > 0) {
      if (appliedPromo.type === "percent") {
        discount = subtotal * (appliedPromo.value / 100);
      } else if (appliedPromo.type === "flat") {
        discount = Math.min(appliedPromo.value, subtotal);
      } else if (appliedPromo.type === "shipping") {
        shipping = 0;
      }
    }

    var total = Math.max(0, subtotal + tax + shipping - discount);
    return { subtotal: subtotal, tax: tax, shipping: shipping, discount: discount, total: total };
  }

  function updateTotals() {
    var t = computeTotals();

    if (els.summaryItemCount) els.summaryItemCount.textContent = getItemCount();
    if (els.summarySubtotal) els.summarySubtotal.textContent = formatCurrency(t.subtotal);
    if (els.summaryTax) els.summaryTax.textContent = formatCurrency(t.tax);
    if (els.summaryShipping) els.summaryShipping.textContent = t.shipping === 0 ? "Free" : formatCurrency(t.shipping);
    if (els.summaryTotal) els.summaryTotal.textContent = formatCurrency(t.total);

    if (els.summaryDiscountRow) {
      if (t.discount > 0) {
        els.summaryDiscountRow.hidden = false;
        els.summaryDiscount.textContent = "−" + formatCurrency(t.discount);
        els.summaryPromoCode.textContent = appliedPromo.code;
      } else {
        els.summaryDiscountRow.hidden = true;
      }
    }

    if (els.checkoutBtn) els.checkoutBtn.disabled = cart.length === 0;
  }

  function updateNavCount() {
    var count = getItemCount();
    if (els.navCartCount) els.navCartCount.textContent = count;
    if (els.navCartCountMobile) els.navCartCountMobile.textContent = count;
  }

  /* ---------------------------------------------------------------------
     Promo codes
     --------------------------------------------------------------------- */
  function applyPromoCode(rawCode) {
    var code = (rawCode || "").trim().toUpperCase();
    if (!code) {
      showPromoMsg("Enter a code to apply.", false);
      return;
    }
    var promo = PROMO_CODES[code];
    if (!promo) {
      showPromoMsg("\"" + code + "\" isn't a valid code.", false);
      return;
    }
    appliedPromo = Object.assign({ code: code }, promo);
    savePromo();
    updateTotals();
    showPromoMsg("Applied: " + promo.label + ".", true);
  }

  function showPromoMsg(msg, success) {
    if (!els.promoMsg) return;
    els.promoMsg.textContent = msg;
    els.promoMsg.classList.toggle("is-success", !!success);
    els.promoMsg.classList.toggle("is-error", !success);
  }

  /* ---------------------------------------------------------------------
     Utilities
     --------------------------------------------------------------------- */
  function formatCurrency(n) {
    return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

})();