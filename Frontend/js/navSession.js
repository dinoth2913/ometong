/* =========================================================
   OMETONG — SHARED NAV SESSION AWARENESS
   Include on any public page (after supabaseClient.js) so a
   logged-in visitor never sees "Login" — the nav updates to point
   straight to their dashboard, and stays logged in as they move
   between pages, since the Supabase session already persists in
   localStorage across the whole site.
========================================================= */
(function () {
  "use strict";

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

  async function run() {
    if (!window.SUPABASE_URL || window.SUPABASE_URL.indexOf("YOUR_SUPABASE") === 0) return;
    if (!window.sb) return;

    const session = await getInitialSession();
    if (!session) return; // not logged in — leave Login / Create Account as-is

    const profile = await window.ometongGetProfile();
    if (!profile) return;

    const dashboardUrl = window.ometongDashboardForRole(profile.role);

    document.querySelectorAll('a[href="authenticationpage.html"], a[href^="authenticationpage.html?"]').forEach((link) => {
      const text = link.textContent.trim();
      if (text === "Login" || text === "Log in") {
        link.href = dashboardUrl;
        link.textContent = "Dashboard";
      } else if (text === "Create Account" || text === "Create account") {
        link.removeAttribute("href");
        link.setAttribute("role", "button");
        link.style.cursor = "pointer";
        link.textContent = "Log out";
        link.addEventListener("click", (e) => {
          e.preventDefault();
          window.ometongLogout();
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", run);
})();
