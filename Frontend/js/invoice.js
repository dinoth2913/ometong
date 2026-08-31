/* =========================================================
   OMETONG — INVOICE VIEW
   Read-only: shows the invoice auto-created for an order (see
   supabase/frontend_wireup_triggers.sql) plus that order's line
   items. RLS (invoices/orders/order_items "buyer can view their own")
   is what actually keeps this private — this page doesn't add its
   own access check beyond the standard session/2FA guard.
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  function getInitialSession() {
    return new Promise((resolve) => {
      if (!window.sb) { resolve(null); return; }
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          sub.subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  const loadingEl = document.getElementById('invLoading');
  const cardEl = document.getElementById('invCard');
  const errorEl = document.getElementById('invError');

  function showError(text) {
    loadingEl.hidden = true;
    cardEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = text;
  }

  if (!window.sb) { showError('Could not connect. Please try again.'); return; }
  const session = await getInitialSession();
  if (!session) {
    window.location.href = 'authenticationpage.html';
    return;
  }

  const { data: aal } = await window.sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    window.location.href = 'mfa-challenge.html?next=' + encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
    return;
  }

  const profile = await window.ometongGetProfile();
  if (!profile) {
    window.location.href = 'authenticationpage.html';
    return;
  }
  const dashHref = window.ometongDashboardForRole ? window.ometongDashboardForRole(profile.role) : 'buyerdashboard.html';
  const dashboardLink = document.getElementById('dashboardLink');
  if (dashboardLink) dashboardLink.href = dashHref;

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  if (!orderId) { showError('No order specified.'); return; }

  const esc = window.ometongEscapeHTML || ((s) => s);

  const { data: order, error: orderErr } = await window.sb.from('orders').select('*').eq('id', orderId).single();
  if (orderErr || !order) {
    showError('Could not find this invoice — it may not exist, or you may not have access to it.');
    return;
  }

  const { data: invoice, error: invErr } = await window.sb.from('invoices').select('*').eq('order_id', orderId).maybeSingle();
  if (invErr || !invoice) {
    showError('No invoice has been generated for this order yet.');
    return;
  }

  const { data: items } = await window.sb.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });

  let currencySymbol = '$';
  const { data: currencyRow } = await window.sb.from('currencies').select('symbol').eq('code', invoice.currency).maybeSingle();
  if (currencyRow && currencyRow.symbol) currencySymbol = currencyRow.symbol;

  function money(n) {
    return currencySymbol + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  document.title = invoice.invoice_number + ' | Ometong';
  document.getElementById('invNumber').textContent = invoice.invoice_number;
  const statusEl = document.getElementById('invStatus');
  statusEl.textContent = invoice.status;
  statusEl.className = 'inv-status-pill ' + invoice.status;

  const addr = order.shipping_address || {};
  const billToLines = [addr.fullName, addr.address, [addr.city, addr.country].filter(Boolean).join(', '), addr.phone]
    .filter(Boolean).map(esc).join('\n');
  document.getElementById('invBillTo').textContent = billToLines || '—';
  document.getElementById('invIssued').textContent = fmtDate(invoice.issued_at);
  document.getElementById('invOrderRef').textContent = '#' + String(order.id).slice(0, 8).toUpperCase();

  const itemsBody = document.getElementById('invItemsBody');
  itemsBody.innerHTML = (items || []).map(it => `
    <tr>
      <td>${esc(it.title)}</td>
      <td>${Number(it.qty).toLocaleString('en-US')}</td>
      <td>${money(it.price)}</td>
      <td>${money(it.line_total)}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="color:var(--ink-faint);">No items recorded.</td></tr>';

  document.getElementById('invSubtotal').textContent = money(invoice.subtotal);
  document.getElementById('invShipping').textContent = money(order.shipping);
  document.getElementById('invTax').textContent = money(invoice.tax);
  document.getElementById('invDiscount').textContent = order.discount > 0 ? '−' + money(order.discount) : money(0);
  document.getElementById('invTotal').textContent = money(invoice.total);

  loadingEl.hidden = true;
  cardEl.hidden = false;

  document.getElementById('invPrintBtn')?.addEventListener('click', () => window.print());
});
