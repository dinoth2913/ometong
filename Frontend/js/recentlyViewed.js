/* =========================================================
   OMETONG — RECENTLY VIEWED PRODUCTS
   Shared by product-details.js (records a view) and marketplace.js /
   product-details.js (renders the row). Persisted in localStorage —
   same no-account-needed pattern as the wishlist and cart, so it
   works for guests too, not just logged-in buyers.

   A lightweight snapshot of the product is stored at view time
   (title, price, thumbnail color/image, supplier) rather than just
   an id, so rendering the row never needs a second lookup or a
   network round trip — it works identically for the demo catalog
   and real listings, and still renders instantly even if a listing
   was since removed.
========================================================= */
(function () {
  "use strict";

  const RV_KEY = "ometong_recently_viewed";
  const MAX_ITEMS = 12;

  function getRecentlyViewed() {
    try { return JSON.parse(localStorage.getItem(RV_KEY)) || []; }
    catch { return []; }
  }

  function track(product) {
    if (!product || product.id == null) return;
    try {
      let list = getRecentlyViewed().filter(p => String(p.id) !== String(product.id));
      list.unshift({
        id: product.id,
        title: product.title,
        price: product.price,
        supplier: product.supplier || product.brand || "",
        color: product.color || "#FF7431",
        image: product.image || null,
        viewedAt: Date.now()
      });
      if (list.length > MAX_ITEMS) list = list.slice(0, MAX_ITEMS);
      localStorage.setItem(RV_KEY, JSON.stringify(list));
    } catch { /* localStorage unavailable (private browsing, quota, etc.) — just skip tracking */ }
  }

  function svgThumb(color) {
    return `<svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="220" height="140" fill="${color}" opacity="0.16"/>
      <circle cx="60" cy="70" r="34" fill="${color}" opacity="0.35"/>
      <rect x="120" y="40" width="70" height="70" rx="10" fill="${color}" opacity="0.5"/>
    </svg>`;
  }

  /* ---------- Render into a section ----------
     `section` is the wrapping <section> to hide entirely when
     there's nothing to show; `grid` is the element cards go into.
     `excludeId` leaves the product currently being viewed out of
     its own "recently viewed" row. */
  function renderInto(section, grid, excludeId) {
    if (!section || !grid) return;
    const esc = window.ometongEscapeHTML || (s => String(s));
    const items = getRecentlyViewed().filter(p => excludeId == null || String(p.id) !== String(excludeId));

    if (!items.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    grid.innerHTML = items.map(p => `
      <div class="rel-card" data-id="${esc(p.id)}">
        <div class="rel-thumb" style="background:${p.color}12">
          ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;">` : svgThumb(p.color)}
          <span class="rel-price">$${p.price}</span>
        </div>
        <div class="rel-body">
          <div class="rel-title">${esc(p.title)}</div>
          <div class="rel-meta">${esc(p.supplier)}</div>
        </div>
      </div>`).join("");

    grid.querySelectorAll(".rel-card").forEach(card => {
      card.addEventListener("click", () => {
        window.location.href = `product-details.html?id=${encodeURIComponent(card.dataset.id)}`;
      });
    });
  }

  window.ometongRecentlyViewed = { get: getRecentlyViewed, track, renderInto };
})();
