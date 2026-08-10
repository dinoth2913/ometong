/* =========================================================
   OMETONG — SHARED SUPABASE CLIENT
   Requires supabaseConfig.js and the Supabase JS SDK (CDN)
   to be loaded first. Exposes window.sb as the shared client
   and a few small auth helpers used across pages.
========================================================= */
(function () {
  "use strict";

  // Escapes user-supplied text before it's interpolated into an
  // innerHTML template (listing titles/descriptions, business names,
  // etc.) — without this, a listing title like "<img src=x onerror=...>"
  // would execute for every visitor who views it. Defined before the
  // Supabase checks below so it's always available regardless of
  // whether the client itself loads successfully.
  window.ometongEscapeHTML = function (str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Ometong: Supabase SDK not loaded. Check the script tag order in this page.");
    return;
  }
  if (!window.SUPABASE_URL || window.SUPABASE_URL.indexOf("YOUR_SUPABASE") === 0) {
    console.warn("Ometong: supabaseConfig.js still has placeholder credentials — auth will not work until you fill in your real Project URL and anon key.");
  }

  window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  /* ---------- "Remember me" ----------
     Supabase's client always persists the session in localStorage by
     default (that's what makes sessions survive a page reload/browser
     restart in the first place) — there's no per-login "store this one
     differently" switch, since the storage mechanism is fixed on the
     client at creation time, before we know what the user will choose
     on the login form.

     Rather than fight that, this layers a lightweight tripwire on top:
     a "don't remember me" login sets a flag in localStorage AND a
     marker in sessionStorage. sessionStorage is wiped when the browser
     (or that tab) closes, but the flag in localStorage survives. So on
     the next page load, if the flag says "don't remember" but the
     tab-session marker is gone, that means the browser was actually
     closed and reopened since then — the stale persisted session gets
     signed out immediately, before any page treats the visitor as
     logged in.

     Trade-off worth knowing: sessionStorage is scoped per browser tab,
     not per "the browser is still open" — opening the site in a brand
     new tab after a "don't remember me" login will also sign out,
     even though the original tab is still open. That's the same
     behavior many security-conscious sites use for this exact
     checkbox, and it's the honest limit of what's achievable with
     client-side storage APIs alone (no server-side session table here). */
  const REMEMBER_FLAG_KEY = "ometong_remember_me";
  const SESSION_ACTIVE_KEY = "ometong_session_active";

  window.ometongSetRememberMe = function (remember) {
    try {
      if (remember) {
        localStorage.removeItem(REMEMBER_FLAG_KEY);
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      } else {
        localStorage.setItem(REMEMBER_FLAG_KEY, "0");
        sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
      }
    } catch (e) { /* storage unavailable (private browsing etc) — fail open */ }
  };

  (async function enforceRememberMe() {
    try {
      const remembered = localStorage.getItem(REMEMBER_FLAG_KEY) !== "0";
      if (remembered) return; // default behavior — nothing to enforce
      if (sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1") return; // same tab-session as the "don't remember" login

      // Flag says "don't remember" and this tab-session has no active
      // marker — the browser/tab was closed and reopened since login.
      // Sign out the session Supabase already restored from localStorage.
      const { data } = await window.sb.auth.getSession();
      if (data && data.session) await window.sb.auth.signOut();
      localStorage.removeItem(REMEMBER_FLAG_KEY);
    } catch (e) { /* storage unavailable — fail open, don't block the page */ }
  })();

  /* ---------- Shared auth helpers ---------- */

  // Returns the current session's user, or null if logged out.
  window.ometongGetUser = async function () {
    const { data, error } = await window.sb.auth.getUser();
    if (error) return null;
    return data.user || null;
  };

  // Returns the profile row (role, name, business info) for the current user, or null.
  window.ometongGetProfile = async function () {
    const user = await window.ometongGetUser();
    if (!user) return null;
    const { data, error } = await window.sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) {
      console.error("Ometong: failed to load profile", error);
      return null;
    }
    return data;
  };

  // Redirects to the correct dashboard for a role.
  window.ometongDashboardForRole = function (role) {
    if (role === "admin") return "admindashboard.html";
    if (role === "buyer") return "buyerdashboard.html";
    if (role === "manufacturer") return "manufacturerdashboard.html";
    return "supplierdashboard.html";
  };

  // Signs out and sends the user back to the login page. Clears the
  // on-screen cart first (if cartSync.js is loaded on this page) so a
  // different account logging in on this same browser next doesn't see
  // the previous account's cart — their own saved cart comes back from
  // Supabase automatically the next time they log in.
  window.ometongLogout = async function () {
    if (window.ometongClearLocalCartOnLogout) window.ometongClearLocalCartOnLogout();
    if (window.ometongSetRememberMe) window.ometongSetRememberMe(true); // reset for whoever logs in next on this browser
    await window.sb.auth.signOut();
    window.location.href = "authenticationpage.html";
  };
})();
