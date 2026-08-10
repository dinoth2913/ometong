/* =========================================================
   OMETONG — SHARED TINY BAR CHART RENDERER
   Used by the "Analytics" section on the buyer, supplier, and
   manufacturer dashboards. Renders [{label, value}] as horizontal
   CSS bars — no chart library needed for numbers this simple, and
   it stays consistent with the rest of the site's vanilla-JS,
   no-build-tooling approach.
========================================================= */
(function () {
  "use strict";

  window.ometongRenderBarChart = function (container, rows, opts) {
    if (!container) return;
    opts = opts || {};
    const esc = window.ometongEscapeHTML || (s => String(s));
    const fmt = opts.format || (v => v);
    const emptyText = opts.emptyText || 'Not enough data yet.';

    if (!rows || !rows.length || rows.every(r => !r.value)) {
      container.innerHTML = `<p class="analytics-empty">${esc(emptyText)}</p>`;
      return;
    }

    const max = Math.max(...rows.map(r => r.value), 1);
    container.innerHTML = `<div class="bar-chart">${rows.map(r => `
      <div class="bar-chart-row">
        <span class="bar-chart-label">${esc(r.label)}</span>
        <span class="bar-chart-track"><span class="bar-chart-fill" style="width:${Math.max(r.value ? 3 : 0, Math.round((r.value / max) * 100))}%"></span></span>
        <span class="bar-chart-value">${esc(fmt(r.value))}</span>
      </div>`).join('')}</div>`;
  };
})();
