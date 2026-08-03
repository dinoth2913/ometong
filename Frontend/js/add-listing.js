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
      const { error } = await window.sb.from("listings").insert({
        supplier_id: user.id,
        title,
        category,
        price,
        moq,
        lead_time_days: leadTime,
        description,
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
