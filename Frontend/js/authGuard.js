/* =========================================================
   OMETONG — DASHBOARD AUTH GUARD
   Include after supabaseClient.js and before the page's own
   dashboard script. Reads the required role from this script
   tag's data-role attribute.

   If Supabase isn't configured yet (placeholder credentials),
   this guard does nothing so the dashboard still works with
   its demo data during setup.
========================================================= */
(function () {
  "use strict";

  const thisScript = document.currentScript;
  const requiredRole = thisScript ? thisScript.getAttribute("data-role") : null;

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  async function guard() {
    if (!window.SUPABASE_URL || window.SUPABASE_URL.indexOf("YOUR_SUPABASE") === 0) {
      return; // Not configured yet — skip the guard, keep demo data visible.
    }
    if (!window.sb) return;

    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) {
      window.location.href = "authenticationpage.html";
      return;
    }

    const profile = await window.ometongGetProfile();
    if (!profile) {
      window.location.href = "authenticationpage.html";
      return;
    }

    if (requiredRole && profile.role !== requiredRole) {
      window.location.href = window.ometongDashboardForRole(profile.role);
      return;
    }

    const displayName = profile.business_name || profile.full_name || profile.email || "";
    const welcomeName = document.getElementById("welcomeName");
    const userChipName = document.getElementById("userChipName");
    const userAvatarInitials = document.getElementById("userAvatarInitials");
    const acctName = document.getElementById("acctName");
    const acctCompany = document.getElementById("acctCompany");
    const acctEmail = document.getElementById("acctEmail");

    if (welcomeName) welcomeName.textContent = displayName;
    if (userChipName) userChipName.textContent = displayName;
    if (userAvatarInitials) userAvatarInitials.textContent = initials(displayName);
    if (acctName) acctName.textContent = profile.full_name || displayName;
    if (acctCompany) acctCompany.textContent = profile.business_name || displayName;
    if (acctEmail) acctEmail.textContent = profile.email || "";
  }

  document.querySelectorAll(".logout-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (window.ometongLogout) {
        e.preventDefault();
        window.ometongLogout();
      }
    });
  });

  guard();
})();
