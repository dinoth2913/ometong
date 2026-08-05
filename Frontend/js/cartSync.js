/* =========================================================
   OMETONG — CART SYNC
   Ties the cart to the logged-in account instead of just the
   browser. Include after supabaseClient.js on any page that reads
   or writes the cart (marketplace, product details, cart, checkout).

   - Logged out: cart is whatever's in this browser's localStorage
     only (a guest cart) — nothing server-side involved.
   - Logging in: fetches this account's saved cart from Supabase,
     merges in anything the guest added in this browser session
     (so nothing already in the cart gets lost), saves the merged
     result back, and fires "ometongCartSynced" so the page's own
     cart script (cart.js/marketplace.js/etc.) can refresh what it's
     showing instead of displaying stale data.
   - Logging out: clears the local cart, so the next person to use
     this browser doesn't see the previous account's cart.
========================================================= */
(function () {
  "use strict";

  var CART_KEY = "ometongCart";
  var PROMO_KEY = "ometongPromo";

  function getLocalCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function setLocalCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* ignore */ }
  }

  function mergeCarts(serverCart, localCart) {
    var merged = Array.isArray(serverCart) ? serverCart.map(function (i) { return Object.assign({}, i); }) : [];
    (localCart || []).forEach(function (item) {
      var existing = merged.find(function (m) { return String(m.id) === String(item.id); });
      if (existing) existing.qty = (existing.qty || 0) + (item.qty || 0);
      else merged.push(item);
    });
    return merged;
  }

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

  // Other cart scripts call this after every local cart mutation so the
  // account's saved cart in Supabase stays in step with what's on screen.
  // No-ops silently if the visitor isn't logged in — the guest cart just
  // stays local until (if ever) they log in.
  window.ometongSyncCartToServer = async function (cart) {
    if (!window.sb) return;
    var user = await window.ometongGetUser();
    if (!user) return;
    await window.sb.from("profiles").update({ cart: cart }).eq("id", user.id);
  };

  async function init() {
    var session = await getInitialSession();
    if (!session) return; // guest — local cart stands as-is, nothing to merge

    var user = session.user;
    var { data: profile, error } = await window.sb
      .from("profiles")
      .select("cart")
      .eq("id", user.id)
      .single();
    if (error) return;

    var serverCart = Array.isArray(profile && profile.cart) ? profile.cart : [];
    var localCart = getLocalCart();
    var merged = mergeCarts(serverCart, localCart);

    setLocalCart(merged);
    await window.ometongSyncCartToServer(merged);

    document.dispatchEvent(new CustomEvent("ometongCartSynced", { detail: merged }));
  }

  // Clears the on-screen cart on logout so the next visitor to this
  // browser doesn't inherit the previous account's items. The account's
  // saved cart in Supabase is untouched — it'll come right back the next
  // time this same account logs in.
  window.ometongClearLocalCartOnLogout = function () {
    try {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(PROMO_KEY);
    } catch (e) { /* ignore */ }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
