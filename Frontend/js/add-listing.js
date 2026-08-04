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
    const imagePreview = document.getElementById("imagePreview");
    const imagePreviewImg = document.getElementById("imagePreviewImg");
    const imagePreviewRemove = document.getElementById("imagePreviewRemove");

    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

    imageInput?.addEventListener("change", () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        imagePreview.hidden = true;
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        showError("Please choose a JPG, PNG or WEBP image.");
        imageInput.value = "";
        imagePreview.hidden = true;
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        showError("That image is too large — please choose one under 5MB.");
        imageInput.value = "";
        imagePreview.hidden = true;
        return;
      }
      clearError();
      imagePreviewImg.src = URL.createObjectURL(file);
      imagePreview.hidden = false;
    });

    imagePreviewRemove?.addEventListener("click", () => {
      imageInput.value = "";
      imagePreview.hidden = true;
    });

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.add("show");
    }
    function clearError() {
      errorEl.classList.remove("show");
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
      const price = parseFloat(form.price.value);
      const moq = form.moq.value ? parseInt(form.moq.value, 10) : null;
      const leadTime = form.leadTime.value ? parseInt(form.leadTime.value, 10) : null;
      const description = form.description.value.trim();

      if (!title) { showError("Please enter a product or service name."); return; }
      if (!category) { showError("Please select a category."); return; }
      if (isNaN(price) || price < 0) { showError("Please enter a valid price."); return; }

      setLoading(true);

      let imageUrl = null;
      const file = imageInput?.files && imageInput.files[0];
      if (file) {
        const ext = file.name.split(".").pop().toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await window.sb.storage
          .from("listing-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          setLoading(false);
          showError(uploadError.message || "Could not upload the photo. Please try again.");
          return;
        }
        const { data: publicUrlData } = window.sb.storage.from("listing-images").getPublicUrl(path);
        imageUrl = publicUrlData?.publicUrl || null;
      }

      const { error } = await window.sb.from("listings").insert({
        supplier_id: user.id,
        title,
        category,
        price,
        moq,
        lead_time_days: leadTime,
        description,
        image_url: imageUrl,
        status: "active"
      });
      setLoading(false);

      if (error) {
        showError(error.message || "Could not publish this listing. Please try again.");
        return;
      }

      form.style.display = "none";
      successEl.classList.add("show");
      setTimeout(() => {
        window.location.href = window.ometongDashboardForRole(currentRole || "supplier");
      }, 2400);
    });
  });
})();
