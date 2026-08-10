/* =========================================================
   OMETONG — ADMIN: PAYMENTS (read-only)
   public.payments already existed (orders_schema.sql) with an
   "Admins can view all payments" policy — this was never actually
   connected to any admin UI. Status changes (held/released/refunded/
   failed) are documented as staff/webhook-only, not client-editable,
   so this stays a read-only oversight view rather than adding edit
   controls that the RLS wouldn't allow to work anyway.
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

  const session = await getInitialSession();
  if (!session || !window.sb) return; // authGuard.js already redirects non-admins away
  const esc = window.ometongEscapeHTML || (s => s);

  const tableBody = document.getElementById('paymentsTableBody');
  const table = document.getElementById('paymentsTable');
  const emptyEl = document.getElementById('paymentsEmpty');
  if (!tableBody) return; // section not on this page

  const STATUS_CLS = { pending: 'processing', held: 'processing', released: 'delivered', refunded: 'cancelled', failed: 'cancelled' };

  async function loadPayments() {
    const { data, error } = await window.sb
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { console.error('Ometong: failed to load payments', error); return; }
    render(data || []);
  }

  function render(payments) {
    if (!payments.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    tableBody.innerHTML = payments.map(p => {
      const date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      return `
        <div class="admin-row admin-row--payments">
          <span>#${String(p.order_id).slice(0, 8).toUpperCase()}</span>
          <span>${esc(p.provider)}</span>
          <span>${esc(p.currency)} ${Number(p.amount).toLocaleString('en-US')}</span>
          <span class="order-status ${STATUS_CLS[p.status] || 'processing'}">${esc(p.status)}</span>
          <span>${date}</span>
        </div>`;
    }).join('');
  }

  await loadPayments();
});
