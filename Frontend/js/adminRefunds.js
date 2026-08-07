/* =========================================================
   OMETONG — ADMIN: REFUND REQUESTS
   See supabase/refunds_schema.sql. Approving/rejecting only ever
   changes refund_requests.status — the trigger there is what
   actually flips orders.status / payments.status to 'refunded'
   once staff marks a request 'processed' (i.e. the money has
   genuinely been sent back, manually, since no payment gateway is
   wired in yet).
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

  const tableBody = document.getElementById('refundsTableBody');
  const table = document.getElementById('refundsTable');
  const emptyEl = document.getElementById('refundsEmpty');
  const pendingHint = document.getElementById('refundsPendingHint');
  if (!tableBody) return; // section not on this page

  const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', processed: 'Refunded' };
  const STATUS_CLS = { pending: 'processing', approved: 'transit', rejected: 'cancelled', processed: 'delivered' };

  let requests = [];

  async function loadRequests() {
    const { data, error } = await window.sb
      .from('refund_requests')
      .select('*, orders(shipping_address)')
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load refund requests', error); return; }
    requests = data || [];
    render();
  }

  function render() {
    if (!requests.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      pendingHint.textContent = 'Nothing pending';
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    pendingHint.textContent = pendingCount ? `${pendingCount} awaiting review` : 'Nothing pending';

    tableBody.innerHTML = requests.map(r => {
      const buyerName = (r.orders && r.orders.shipping_address && r.orders.shipping_address.fullName) || 'Buyer';
      let actions = '';
      if (r.status === 'pending') {
        actions = `
          <button class="btn-approve" data-approve="${r.id}">Approve</button>
          <button class="btn-reject" data-reject="${r.id}">Reject</button>`;
      } else if (r.status === 'approved') {
        actions = `<button class="btn-approve" data-process="${r.id}">Mark refunded</button>`;
      }
      return `
        <div class="admin-row admin-row--refunds">
          <span>#${String(r.order_id).slice(0, 8).toUpperCase()}</span>
          <span>${esc(buyerName)}</span>
          <span title="${esc(r.reason)}">${esc(r.reason.length > 60 ? r.reason.slice(0, 60) + '…' : r.reason)}</span>
          <span>$${Number(r.requested_amount).toLocaleString('en-US')}</span>
          <span class="order-status ${STATUS_CLS[r.status] || 'processing'}">${STATUS_LABELS[r.status] || r.status}</span>
          <span class="admin-row-actions">${actions}</span>
        </div>`;
    }).join('');

    tableBody.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-approve'), 'approved', btn));
    });
    tableBody.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-reject'), 'rejected', btn));
    });
    tableBody.querySelectorAll('[data-process]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-process'), 'processed', btn));
    });
  }

  async function decide(id, status, btn) {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    if (status === 'rejected') {
      const note = window.prompt('Optional note for the buyer on why this was declined:', '');
      if (note === null) return; // cancelled
      await applyDecision(id, status, note || null, btn);
      return;
    }
    if (status === 'processed' && !window.confirm('Confirm the refund has actually been sent back to the buyer? This marks the order refunded.')) {
      return;
    }
    const patch = { status };
    if (status === 'approved') patch.approved_amount = req.requested_amount;
    await applyDecision(id, status, null, btn, patch);
  }

  async function applyDecision(id, status, note, btn, extraPatch) {
    btn.disabled = true;
    const patch = Object.assign({ status }, extraPatch || {});
    if (note !== null && note !== undefined) patch.admin_note = note;
    const { error } = await window.sb.from('refund_requests').update(patch).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to update refund request', error); return; }
    await loadRequests();
  }

  await loadRequests();
});
