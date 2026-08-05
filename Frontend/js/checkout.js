/* =========================================================
   OMETONG — CHECKOUT SCRIPT
   Reads the same cart (localStorage "ometongCart") used by
   cart.js/marketplace.js/product-details.js, requires login,
   and on submit writes a real order + order_items + payment
   row to Supabase (escrow "pending" until a real payment
   provider is wired in).
========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "ometongCart";
  var PROMO_STORAGE_KEY = "ometongPromo";
  var TAX_RATE = 0.08;
  var FLAT_SHIPPING = 45;
  var FREE_SHIPPING_THRESHOLD = 500;

  var PROMO_CODES = {
    "WELCOME10": { type: "percent", value: 10, label: "10% off" },
    "SAVE20": { type: "flat", value: 20, label: "$20 off" },
    "FREESHIP": { type: "shipping", value: 0, label: "Free shipping" }
  };

  var cart = loadCart();
  var appliedPromo = loadPromo();
  var els = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheEls();
    initSharedChrome();
    guard();
  });

  /* ---------------------------------------------------------------------
     Storage helpers (shared shape/key with cart.js)
     --------------------------------------------------------------------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore malformed storage */ }
    return [];
  }
  function loadPromo() {
    try {
      var raw = localStorage.getItem(PROMO_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }
  function clearCartStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PROMO_STORAGE_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------------
     Shared chrome (loader, scroll progress, footer year)
     --------------------------------------------------------------------- */
  function initSharedChrome() {
    var loader = document.getElementById("loader");
    window.addEventListener("load", function () {
      setTimeout(function () { if (loader) loader.classList.add("is-hidden"); }, 250);
    });
    if (document.readyState === "complete" && loader) {
      setTimeout(function () { loader.classList.add("is-hidden"); }, 250);
    }

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

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------------------
     Customs & import notice — general guidance only, per destination
     country. Not a calculated duty amount (that needs a real backend
     with HS codes + a customs API), just honest expectation-setting so
     buyers aren't surprised by a bill after checkout.
     --------------------------------------------------------------------- */
  var CUSTOMS_NOTICES = {
    "United States": "US shipments no longer have a duty-free threshold — every order, regardless of value, may be subject to US import tariffs collected on delivery.",
    "Canada": "Canadian customs duty and taxes apply to imported goods based on their value and category, collected on delivery.",
    "United Kingdom": "UK-bound orders may be subject to import VAT and customs duty on delivery, depending on the item's value and category.",
    "Germany": "As of July 2026, EU imports are subject to a flat customs handling fee plus VAT, regardless of order value.",
    "France": "As of July 2026, EU imports are subject to a flat customs handling fee plus VAT, regardless of order value.",
    "Other EU": "As of July 2026, EU imports are subject to a flat customs handling fee plus VAT, regardless of order value.",
    "Sri Lanka": "Sri Lankan customs duty applies to imported goods based on their value and category, collected on delivery.",
    "India": "Indian imports are subject to Basic Customs Duty, surcharge, and IGST — commonly 30–55% of the item's value combined, collected on delivery. Some electronics also require BIS certification to clear customs.",
    "Other": "Import duties and taxes may apply on delivery, depending on your country's customs rules."
  };

  function updateCustomsNotice() {
    var notice = document.getElementById("customsNotice");
    var text = document.getElementById("customsNoticeText");
    if (!notice || !text || !els.form) return;
    var country = els.form.country.value;
    if (!country || !CUSTOMS_NOTICES[country]) {
      notice.hidden = true;
      return;
    }
    text.textContent = CUSTOMS_NOTICES[country];
    notice.hidden = false;
  }

  function cacheEls() {
    els.form = document.getElementById("checkoutForm");
    els.formError = document.getElementById("checkoutFormError");
    els.reviewList = document.getElementById("checkoutReviewList");
    els.placeOrderBtn = document.getElementById("placeOrderBtn");

    els.summaryItemCount = document.getElementById("summaryItemCount");
    els.summarySubtotal = document.getElementById("summarySubtotal");
    els.summaryTax = document.getElementById("summaryTax");
    els.summaryShipping = document.getElementById("summaryShipping");
    els.summaryDiscountRow = document.getElementById("summaryDiscountRow");
    els.summaryDiscount = document.getElementById("summaryDiscount");
    els.summaryPromoCode = document.getElementById("summaryPromoCode");
    els.summaryTotal = document.getElementById("summaryTotal");
  }

  /* ---------------------------------------------------------------------
     Auth guard — same INITIAL_SESSION pattern used elsewhere on the site
     --------------------------------------------------------------------- */
  function getInitialSession() {
    return new Promise(function (resolve) {
      if (!window.sb) { resolve(null); return; }
      var sub = window.sb.auth.onAuthStateChange(function (event, session) {
        if (event === "INITIAL_SESSION") {
          sub.data.subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  var currentUser = null;

  // Waits for cartSync.js to finish merging the account's saved cart in
  // (fires "ometongCartSynced"), with a short fallback timeout in case
  // cartSync.js isn't present on this page for some reason — otherwise
  // checkout could redirect to an empty cart page before that merge
  // ever gets a chance to run.
  function waitForCartSync() {
    return new Promise(function (resolve) {
      var done = false;
      function finish(detail) {
        if (done) return;
        done = true;
        resolve(detail);
      }
      document.addEventListener("ometongCartSynced", function (e) { finish(e.detail); }, { once: true });
      setTimeout(function () { finish(null); }, 1500);
    });
  }

  async function guard() {
    if (!window.sb) {
      showError("Checkout is unavailable right now — please try again shortly.");
      return;
    }

    var session = await getInitialSession();
    if (!session) {
      window.location.href = "authenticationpage.html";
      return;
    }
    currentUser = session.user;

    var synced = await waitForCartSync();
    if (synced) cart = synced;
    else cart = loadCart();

    if (!cart.length) {
      window.location.href = "cart.html";
      return;
    }

    renderReview();
    updateTotals();
    initForm();
  }

  /* ---------------------------------------------------------------------
     Order review + totals (mirrors cart.js's math)
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
      if (appliedPromo.type === "percent") discount = subtotal * (appliedPromo.value / 100);
      else if (appliedPromo.type === "flat") discount = Math.min(appliedPromo.value, subtotal);
      else if (appliedPromo.type === "shipping") shipping = 0;
    }

    var total = Math.max(0, subtotal + tax + shipping - discount);
    return { subtotal: subtotal, tax: tax, shipping: shipping, discount: discount, total: total };
  }

  function renderReview() {
    if (!els.reviewList) return;
    var esc = window.ometongEscapeHTML || function (s) { return s; };
    els.reviewList.innerHTML = cart.map(function (item) {
      return '<li class="checkout-review-row">' +
        '<span class="cri-name">' + esc(item.name) + ' <span style="font-weight:400;color:inherit">×' + item.qty + '</span></span>' +
        '<strong>' + formatCurrency(item.price * item.qty) + '</strong>' +
        '</li>';
    }).join('');
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
  }

  /* ---------------------------------------------------------------------
     Submit — writes order + order_items + payment to Supabase
     --------------------------------------------------------------------- */
  function initForm() {
    if (!els.form) return;
    els.form.country.addEventListener("change", updateCustomsNotice);
    updateCustomsNotice();
    els.form.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearError();

      var fullName = els.form.fullName.value.trim();
      var phone = els.form.phone.value.trim();
      var address = els.form.address.value.trim();
      var city = els.form.city.value.trim();
      var country = els.form.country.value.trim();
      var notes = els.form.notes.value.trim();

      if (!fullName || !phone || !address || !city || !country) {
        showError("Please fill in all required shipping details.");
        return;
      }
      if (!cart.length) {
        showError("Your cart is empty.");
        return;
      }

      setLoading(true);

      var t = computeTotals();

      var orderInsert = await window.sb.from("orders").insert({
        buyer_id: currentUser.id,
        status: "pending",
        subtotal: round2(t.subtotal),
        tax: round2(t.tax),
        shipping: round2(t.shipping),
        discount: round2(t.discount),
        total: round2(t.total),
        promo_code: appliedPromo ? appliedPromo.code : null,
        shipping_address: { fullName: fullName, phone: phone, address: address, city: city, country: country, notes: notes }
      }).select("id").single();

      if (orderInsert.error || !orderInsert.data) {
        setLoading(false);
        showError(orderInsert.error ? orderInsert.error.message : "Could not create your order. Please try again.");
        return;
      }

      var orderId = orderInsert.data.id;

      var itemRows = cart.map(function (item) {
        return {
          order_id: orderId,
          listing_id: item.listingId || null,
          supplier_id: item.supplierId || null,
          title: item.name,
          price: item.price,
          qty: item.qty,
          line_total: round2(item.price * item.qty)
        };
      });

      var itemsInsert = await window.sb.from("order_items").insert(itemRows);
      if (itemsInsert.error) {
        setLoading(false);
        showError(itemsInsert.error.message || "Could not save your order items. Please try again.");
        return;
      }

      var paymentInsert = await window.sb.from("payments").insert({
        order_id: orderId,
        provider: "manual",
        amount: round2(t.total),
        currency: "USD",
        status: "pending"
      });
      if (paymentInsert.error) {
        setLoading(false);
        showError(paymentInsert.error.message || "Could not record payment for your order. Please try again.");
        return;
      }

      clearCartStorage();
      cart = [];
      renderPlacedState();
    });
  }

  function renderPlacedState() {
    if (els.form) els.form.style.display = "none";
    var reviewBlock = document.getElementById("orderReview");
    if (reviewBlock) {
      reviewBlock.innerHTML = '<h2>Order placed</h2>' +
        '<p>Your order has been submitted and your payment is held securely until delivery is confirmed. ' +
        'Redirecting you to your dashboard…</p>';
    }
    if (els.placeOrderBtn) {
      els.placeOrderBtn.disabled = true;
      els.placeOrderBtn.textContent = "Order placed";
    }
    setTimeout(async function () {
      var profile = window.ometongGetProfile ? await window.ometongGetProfile() : null;
      var dest = (profile && window.ometongDashboardForRole) ? window.ometongDashboardForRole(profile.role) : "buyerdashboard.html";
      window.location.href = dest;
    }, 2200);
  }

  function setLoading(isLoading) {
    if (!els.placeOrderBtn) return;
    els.placeOrderBtn.disabled = isLoading;
    els.placeOrderBtn.textContent = isLoading ? "Placing order…" : "Place Order";
  }

  function showError(msg) {
    if (!els.formError) return;
    els.formError.textContent = msg;
    els.formError.classList.add("show");
  }
  function clearError() {
    if (!els.formError) return;
    els.formError.classList.remove("show");
  }

  /* ---------------------------------------------------------------------
     Utilities
     --------------------------------------------------------------------- */
  function round2(n) { return Math.round(n * 100) / 100; }
  function formatCurrency(n) {
    return "$" + round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
})();
