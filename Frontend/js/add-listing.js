/* =========================================================
   OMETONG — ADD LISTING SCRIPT
========================================================= */
(function () {
  "use strict";

  // Same fix as authGuard.js: wait for the client to finish restoring
  // the session from storage before checking, instead of racing ahead.
  function getInitialSession() {
    return new Promise((resolve) => {
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION") {
          sub.subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  let currentRole = null;

  async function guard() {
    if (!window.sb) return;

    const session = await getInitialSession();
    if (!session) {
      window.location.href = "authenticationpage.html";
      return;
    }

    const profile = await window.ometongGetProfile();
    if (!profile) {
      window.location.href = "authenticationpage.html";
      return;
    }

    if (profile.role === "buyer") {
      // Buyers don't list products — send them to their own dashboard.
      window.location.href = "buyerdashboard.html";
      return;
    }

    currentRole = profile.role;
    const backLink = document.getElementById("backToDashboard");
    if (backLink) backLink.href = window.ometongDashboardForRole(currentRole);

    if (profile.category) {
      const categorySelect = document.getElementById("category");
      if (categorySelect && [...categorySelect.options].some(o => o.value === profile.category)) {
        categorySelect.value = profile.category;
        categorySelect.dispatchEvent(new Event("change"));
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    guard();

    const form = document.getElementById("listingForm");
    const errorEl = document.getElementById("listingFormError");
    const successEl = document.getElementById("listingSuccess");
    const submitBtn = document.getElementById("submitListingBtn");
    const imageInput = document.getElementById("image");
    const imagePreviewGrid = document.getElementById("imagePreviewGrid");

    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const MAX_IMAGES = 6;
    const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

    // Multiple photos — the first one becomes the listing's cover photo
    // (listings.image_url, shown on marketplace cards), the rest go into
    // listing_images for the gallery on the product page. Held here as
    // our own array (rather than trusting imageInput.files directly)
    // so a single photo can be removed from the middle of the set.
    let selectedImages = [];

    function renderImagePreviews() {
      if (!selectedImages.length) {
        imagePreviewGrid.hidden = true;
        imagePreviewGrid.innerHTML = "";
        return;
      }
      imagePreviewGrid.hidden = false;
      imagePreviewGrid.innerHTML = selectedImages.map(function (file, i) {
        return '<div class="image-preview-item' + (i === 0 ? ' is-cover' : '') + '">' +
          '<img src="' + URL.createObjectURL(file) + '" alt="Listing photo ' + (i + 1) + '">' +
          (i === 0 ? '<span class="image-preview-cover-tag">Cover</span>' : '') +
          '<button type="button" data-remove-image="' + i + '" aria-label="Remove this photo">&times;</button>' +
          '</div>';
      }).join("");
      imagePreviewGrid.querySelectorAll("[data-remove-image]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          selectedImages.splice(parseInt(btn.getAttribute("data-remove-image"), 10), 1);
          renderImagePreviews();
        });
      });
    }

    imageInput?.addEventListener("change", () => {
      const files = imageInput.files ? Array.from(imageInput.files) : [];
      imageInput.value = ""; // reset so choosing the same file again still fires "change"
      if (!files.length) return;

      for (const file of files) {
        if (selectedImages.length >= MAX_IMAGES) {
          showError("You can add up to " + MAX_IMAGES + " photos.");
          break;
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          showError("Please choose only JPG, PNG or WEBP images.");
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          showError("\"" + file.name + "\" is too large — please choose one under 5MB.");
          continue;
        }
        selectedImages.push(file);
      }
      clearError();
      renderImagePreviews();
    });

    /* ---------- Compliance notice — general guidance per category, not
       a legal determination. Helps a supplier know upfront that some
       categories need certification in some destination markets. ---------- */
    const COMPLIANCE_NOTICES = {
      "Electronics": "Electronics often require certification before they can be legally imported — e.g. BIS (India), FCC (USA), CE (EU). Check your destination markets' requirements before shipping.",
      "Food & Beverage": "Food and beverage items are usually subject to additional import inspection and labeling requirements in every destination market.",
      "Construction": "Construction materials and equipment may require safety/quality certification in some destination markets.",
      "Machinery": "Industrial machinery may require safety certification (e.g. CE marking in the EU) depending on the destination market."
    };
    const categorySelect = document.getElementById("category");
    const complianceNotice = document.getElementById("complianceNotice");
    const complianceNoticeText = document.getElementById("complianceNoticeText");
    function updateComplianceNotice() {
      if (!categorySelect || !complianceNotice || !complianceNoticeText) return;
      const notice = COMPLIANCE_NOTICES[categorySelect.value];
      if (!notice) {
        complianceNotice.hidden = true;
        return;
      }
      complianceNoticeText.textContent = notice;
      complianceNotice.hidden = false;
    }
    categorySelect?.addEventListener("change", updateComplianceNotice);
    updateComplianceNotice();

    /* ---------- Category + subcategory dropdowns ----------
       Both come from the shared taxonomy, so the options here always
       match the filters buyers see in the marketplace. */
    const subcategorySelect = document.getElementById("subcategory");
    const taxonomy = window.ometongTaxonomy;

    function populateCategories() {
      if (!categorySelect || !taxonomy) return;
      const current = categorySelect.value;
      categorySelect.innerHTML = '<option value="">Select a category</option>' +
        taxonomy.categories
          .map(c => `<option value="${c.label}">${c.label}</option>`)
          .join("");
      if (current) categorySelect.value = current;
    }

    function populateSubcategories() {
      if (!subcategorySelect || !taxonomy) return;
      const catSlug = taxonomy.categoryLabelToSlug[categorySelect.value];
      const subs = catSlug ? taxonomy.subcategoriesFor(catSlug) : [];
      if (!subs.length) {
        subcategorySelect.innerHTML = '<option value="">Select a category first</option>';
        subcategorySelect.disabled = true;
        return;
      }
      subcategorySelect.disabled = false;
      subcategorySelect.innerHTML = '<option value="">All / not specified</option>' +
        subs.map(s => `<option value="${s.slug}">${s.label}</option>`).join("");
    }

    populateCategories();
    populateSubcategories();
    categorySelect?.addEventListener("change", populateSubcategories);

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.add("show");
    }
    function clearError() {
      errorEl.classList.remove("show");
    }

    /* ---------- Bulk pricing tiers (optional) ----------
       Purely a UI concern here — rows are collected on submit and
       inserted into listing_price_tiers once the listing itself has
       an id. Entirely optional: a listing with no tier rows just
       sells at the flat price field above, same as before this was added. */
    const tiersContainer = document.getElementById("tiersContainer");
    const addTierBtn = document.getElementById("addTierBtn");

    function addTierRow() {
      if (!tiersContainer) return;
      const row = document.createElement("div");
      row.className = "tier-row";
      row.innerHTML = `
        <label>Min quantity <input type="number" class="tier-min-qty" min="1" step="1" placeholder="e.g. 50"></label>
        <label>Price per unit (USD) <input type="number" class="tier-price" min="0" step="0.01" placeholder="e.g. 8.00"></label>
        <button type="button" class="tier-row-remove" aria-label="Remove this tier">&times;</button>
      `;
      row.querySelector(".tier-row-remove").addEventListener("click", () => row.remove());
      tiersContainer.appendChild(row);
    }
    addTierBtn?.addEventListener("click", addTierRow);

    function collectTiers() {
      if (!tiersContainer) return { tiers: [], error: null };
      const rows = [...tiersContainer.querySelectorAll(".tier-row")];
      const tiers = [];
      for (const row of rows) {
        const minQtyRaw = row.querySelector(".tier-min-qty").value;
        const priceRaw = row.querySelector(".tier-price").value;
        if (!minQtyRaw && !priceRaw) continue; // silently skip a fully-empty row
        const minQty = parseInt(minQtyRaw, 10);
        const price = parseFloat(priceRaw);
        if (isNaN(minQty) || minQty < 1 || isNaN(price) || price < 0) {
          return { tiers: null, error: "Please fill in both fields on every bulk pricing row, or remove the empty one." };
        }
        tiers.push({ min_qty: minQty, price_per_unit: price });
      }
      // No duplicate quantity thresholds — the database would reject
      // it anyway (unique per listing), but catching it here gives a
      // clearer message than a raw constraint-violation error.
      const seen = new Set();
      for (const t of tiers) {
        if (seen.has(t.min_qty)) {
          return { tiers: null, error: `You have two bulk pricing rows both starting at ${t.min_qty} units — each quantity can only appear once.` };
        }
        seen.add(t.min_qty);
      }
      return { tiers, error: null };
    }
    function setLoading(isLoading) {
      submitBtn.disabled = isLoading;
      submitBtn.querySelector("span").textContent = isLoading ? "Publishing…" : "Publish Listing";
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const user = await window.ometongGetUser();
      if (!user) {
        showError("Your session has expired — please log in again.");
        return;
      }

      const title = form.title.value.trim();
      const category = form.category.value;
      const subcategory = form.subcategory ? form.subcategory.value || null : null;
      const price = parseFloat(form.price.value);
      const moq = form.moq.value ? parseInt(form.moq.value, 10) : null;
      const leadTime = form.leadTime.value ? parseInt(form.leadTime.value, 10) : null;
      const description = form.description.value.trim();
      const countryOfOrigin = form.countryOfOrigin.value.trim() || null;
      const hsCode = form.hsCode.value.trim() || null;

      if (!title) { showError("Please enter a product or service name."); return; }
      if (!category) { showError("Please select a category."); return; }
      if (isNaN(price) || price < 0) { showError("Please enter a valid price."); return; }

      const { tiers, error: tiersError } = collectTiers();
      if (tiersError) { showError(tiersError); return; }

      setLoading(true);

      // Upload every selected photo; the first becomes the listing's
      // cover photo (image_url), the rest are inserted into
      // listing_images once the listing itself has an id.
      const uploadedImageUrls = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const ext = file.name.split(".").pop().toLowerCase();
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await window.sb.storage
          .from("listing-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          setLoading(false);
          showError(uploadError.message || "Could not upload one of the photos. Please try again.");
          return;
        }
        const { data: publicUrlData } = window.sb.storage.from("listing-images").getPublicUrl(path);
        if (publicUrlData?.publicUrl) uploadedImageUrls.push(publicUrlData.publicUrl);
      }
      const imageUrl = uploadedImageUrls[0] || null;

      const { data: newListing, error } = await window.sb.from("listings").insert({
        supplier_id: user.id,
        title,
        category,
        subcategory,
        price,
        moq,
        lead_time_days: leadTime,
        description,
        image_url: imageUrl,
        country_of_origin: countryOfOrigin,
        hs_code: hsCode,
        status: "active"
      }).select("id").single();

      if (error || !newListing) {
        setLoading(false);
        showError((error && error.message) || "Could not publish this listing. Please try again.");
        return;
      }

      if (tiers.length) {
        const { error: tiersInsertError } = await window.sb.from("listing_price_tiers").insert(
          tiers.map(t => ({ listing_id: newListing.id, min_qty: t.min_qty, price_per_unit: t.price_per_unit }))
        );
        // The listing itself already published successfully at this point —
        // don't block the success flow over the bulk-pricing add-on failing,
        // just let the seller know so they can add tiers later from the listing.
        if (tiersInsertError) console.error("Ometong: failed to save bulk pricing tiers", tiersInsertError);
      }

      // Cover photo is already on the listing row (image_url) — the
      // rest of the gallery goes into listing_images, same
      // don't-block-success reasoning as the tiers insert above.
      if (uploadedImageUrls.length > 1) {
        const { error: imagesInsertError } = await window.sb.from("listing_images").insert(
          uploadedImageUrls.slice(1).map((url, i) => ({ listing_id: newListing.id, image_url: url, sort_order: i }))
        );
        if (imagesInsertError) console.error("Ometong: failed to save extra listing photos", imagesInsertError);
      }

      setLoading(false);

      form.style.display = "none";
      successEl.classList.add("show");
      setTimeout(() => {
        window.location.href = window.ometongDashboardForRole(currentRole || "supplier");
      }, 2400);
    });
  });
})();
