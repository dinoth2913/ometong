/* =========================================================
   OMETONG — SHARED LOADING / ERROR STATE HELPERS
   Small helpers so every dashboard/marketplace list shows a
   "Loading…" message while data is in flight, and a real
   "couldn't load, try again" message (with a working retry button)
   instead of silently staying blank when a Supabase query fails.
   No new markup structure required — these just set innerHTML on
   whatever container you already render your list rows into.
========================================================= */
(function () {
  "use strict";

  const esc = window.ometongEscapeHTML || (s => String(s));

  window.ometongShowLoading = function (container, message) {
    if (!container) return;
    container.innerHTML = `<p class="ometong-load-state ometong-load-state--loading">${esc(message || "Loading…")}</p>`;
  };

  // `retry` is an optional function — if given, a "Try again" button
  // is shown and calls it on click.
  window.ometongShowError = function (container, message, retry) {
    if (!container) return;
    const btnId = "ometongRetry" + Math.random().toString(36).slice(2, 8);
    container.innerHTML = `
      <p class="ometong-load-state ometong-load-state--error">
        ${esc(message || "Something went wrong loading this — please try again.")}
        ${retry ? `<button type="button" class="link-inline" id="${btnId}">Try again</button>` : ""}
      </p>`;
    if (retry) {
      const btn = document.getElementById(btnId);
      if (btn) btn.addEventListener("click", retry);
    }
  };
})();
