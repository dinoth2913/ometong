/* =========================================================
   OMETONG — CART & WISHLIST SYNC
   Ties the cart and wishlist to the logged-in account instead of
   just the browser. Include after supabaseClient.js on any page
   that reads or writes either one (marketplace, product details,
   cart, checkout, buyer dashboard).

   - Logged out: cart/wishlist are whatever's in this browser's
     localStorage only (guest state) — nothing server-side involved.
   - Logging in: fetches this account's saved cart and wishlist from
     Supabase, merges in anything the guest added in this browser
     session (so nothing already there gets lost), saves the merged
     result back, and fires "ometongCartSynced" / "ometongWishlistSynced"
     so the page's own script can refresh what it's showing instead
     of displaying stale pre-merge data.
   - Logging out: clears both locally, so the next person to use
     this browser doesn't inherit the previous account's cart/saves.
========================================================= */
(function () {
  "use strict";

  var CART_KEY = "ometongCart";
  var PROMO_KEY = "ometongPromo";
  var WISHLIST_KEY = "ometong_wishlist";

  function getLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  }
  function setLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
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

  function mergeWishlists(serverIds, localIds) {
    var merged = Array.isArray(serverIds) ? serverIds.slice() : [];
    (localIds || []).forEach(function (id) {
      if (!merged.some(function (m) { return String(m) === String(id); })) merged.push(id);
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

  // Other scripts call these after every local mutation so the account's
  // saved cart/wishlist in Supabase stays in step with what's on screen.
  // No-ops silently if the visitor isn't logged in — guest state just
  // stays local until (if ever) they log in.
  window.ometongSyncCartToServer = async function (cart) {
    if (!window.sb) return;
    var user = await window.ometongGetUser();
    if (!user) return;
    await window.sb.from("profiles").update({ cart: cart }).eq("id", user.id);
  };
  window.ometongSyncWishlistToServer = async function (ids) {
    if (!window.sb) return;
    var user = await window.ometongGetUser();
    if (!user) return;
    await window.sb.from("profiles").update({ wishlist: ids }).eq("id", user.id);
  };

  async function init() {
    var session = await getInitialSession();
    if (!session) return; // guest — local state stands as-is, nothing to merge

    var user = session.user;
    var { data: profile, error } = await window.sb
      .from("profiles")
      .select("cart, wishlist")
      .eq("id", user.id)
      .single();
    if (error) return;

    var serverCart = Array.isArray(profile && profile.cart) ? profile.cart : [];
    var localCart = getLocal(CART_KEY, []);
    var mergedCart = mergeCarts(serverCart, localCart);
    setLocal(CART_KEY, mergedCart);
    await window.ometongSyncCartToServer(mergedCart);
    document.dispatchEvent(new CustomEvent("ometongCartSynced", { detail: mergedCart }));

    var serverWishlist = Array.isArray(profile && profile.wishlist) ? profile.wishlist : [];
    var localWishlist = getLocal(WISHLIST_KEY, []);
    var mergedWishlist = mergeWishlists(serverWishlist, localWishlist);
    setLocal(WISHLIST_KEY, mergedWishlist);
    await window.ometongSyncWishlistToServer(mergedWishlist);
    document.dispatchEvent(new CustomEvent("ometongWishlistSynced", { detail: mergedWishlist }));
  }

  // Clears the on-screen cart/wishlist on logout so the next visitor to
  // this browser doesn't inherit the previous account's items. The
  // account's saved data in Supabase is untouched — it'll come right
  // back the next time this same account logs in.
  window.ometongClearLocalCartOnLogout = function () {
    try {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(PROMO_KEY);
      localStorage.removeItem(WISHLIST_KEY);
    } catch (e) { /* ignore */ }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
