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

  // Signs out and sends the user back to the login page.
  window.ometongLogout = async function () {
    await window.sb.auth.signOut();
    window.location.href = "authenticationpage.html";
  };
})();
