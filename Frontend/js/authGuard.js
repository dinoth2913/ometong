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

  // Hide the page immediately, before the async role check below has
  // any chance to run. Without this, a visitor who opens the wrong
  // dashboard URL could see that page's shell (and briefly, its own
  // account's data loading into it) for a moment before the redirect
  // below fires — the redirect always did happen, but it looked like
  // "this login works on every dashboard" instead of "this page flashed
  // then bounced you to the right one". Revealed again only once the
  // guard actually confirms the role is correct (or isn't needed).
  if (document.body) document.body.style.visibility = "hidden";

  const thisScript = document.currentScript;
  const requiredRole = thisScript ? thisScript.getAttribute("data-role") : null;

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  // On a fresh page load, the Supabase client needs a moment to restore
  // the session from storage. Calling getSession() immediately can race
  // ahead of that and return null even when the user is actually logged
  // in. Waiting for the one-time INITIAL_SESSION event is the documented
  // way to know the client has finished checking storage.
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

  function reveal() {
    if (document.body) document.body.style.visibility = "visible";
  }

  async function guard() {
    if (!window.SUPABASE_URL || window.SUPABASE_URL.indexOf("YOUR_SUPABASE") === 0) {
      reveal(); // Not configured yet — skip the guard, keep demo data visible.
      return;
    }
    if (!window.sb) { reveal(); return; }

    const session = await getInitialSession();
    if (!session) {
      window.location.href = "authenticationpage.html";
      return; // stays hidden — page is navigating away
    }

    const profile = await window.ometongGetProfile();
    if (!profile) {
      window.location.href = "authenticationpage.html";
      return; // stays hidden — page is navigating away
    }

    if (requiredRole && profile.role !== requiredRole) {
      window.location.href = window.ometongDashboardForRole(profile.role);
      return; // stays hidden — page is navigating away
    }

    reveal();

    const displayName = profile.business_name || profile.full_name || profile.email || "";
    const welcomeName = document.getElementById("welcomeName");
    const userChipName = document.getElementById("userChipName");
    const userAvatarInitials = document.getElementById("userAvatarInitials");
    const acctName = document.getElementById("acctName");
    const acctCompany = document.getElementById("acctCompany");
    const acctEmail = document.getElementById("acctEmail");
    const acctCategory = document.getElementById("acctCategory");

    if (welcomeName) welcomeName.textContent = displayName;
    if (userChipName) userChipName.textContent = displayName;
    if (userAvatarInitials) userAvatarInitials.textContent = initials(displayName);
    if (acctName) acctName.textContent = profile.full_name || displayName;
    if (acctCompany) acctCompany.textContent = profile.business_name || displayName;
    if (acctEmail) acctEmail.textContent = profile.email || "";
    if (acctCategory) acctCategory.textContent = profile.category || "Not set";
  }

  document.querySelectorAll(".logout-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (window.ometongLogout) {
        e.preventDefault();
        window.ometongLogout();
      }
    });
  });

  // If guard() throws for any unexpected reason, fail open on the
  // visibility toggle rather than leaving the page permanently blank —
  // the actual role check already happened by the time anything past
  // it could throw, so this only guards against a rendering bug, not
  // a security check.
  guard().catch((err) => {
    console.error("Ometong: authGuard error", err);
    reveal();
  });
})();
