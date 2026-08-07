/* =========================================================
   OMETONG — ADMIN: SUPPLIER APPLICATIONS
   See supabase/supplier_applications_schema.sql. Approving/rejecting
   only ever changes supplier_applications.status/admin_note — it
   does not create or promote any account, since an applicant may
   not have signed up on Ometong at all yet. Staff follow up with
   next steps by emailing the applicant directly (a "become a
   supplier" account is created the normal way, through signup).
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

  const tableBody = document.getElementById('applicationsTableBody');
  const table = document.getElementById('applicationsTable');
  const emptyEl = document.getElementById('applicationsEmpty');
  const pendingHint = document.getElementById('applicationsPendingHint');
  if (!tableBody) return; // section not on this page

  const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
  const STATUS_CLS = { pending: 'processing', approved: 'delivered', rejected: 'cancelled' };

  let applications = [];

  async function loadApplications() {
    const { data, error } = await window.sb
      .from('supplier_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load supplier applications', error); return; }
    applications = data || [];
    render();
  }

  function render() {
    if (!applications.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      pendingHint.textContent = 'Nothing pending';
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    const pendingCount = applications.filter(a => a.status === 'pending').length;
    pendingHint.textContent = pendingCount ? `${pendingCount} awaiting review` : 'Nothing pending';

    tableBody.innerHTML = applications.map(a => {
      const mailSubject = encodeURIComponent('Your Ometong supplier application — ' + a.company_name);
      const mailHref = `mailto:${a.contact_email}?subject=${mailSubject}`;
      let actions = `<a class="order-track" href="${mailHref}" target="_blank" rel="noopener">Email</a>`;
      if (a.status === 'pending') {
        actions += ` <button class="btn-approve" data-approve="${a.id}">Approve</button>
          <button class="btn-reject" data-reject="${a.id}">Reject</button>`;
      }
      const details = a.details ? (a.details.length > 70 ? a.details.slice(0, 70) + '…' : a.details) : '—';
      return `
        <div class="admin-row admin-row--applications">
          <span>${esc(a.company_name)}<br><span style="font-weight:400;color:var(--ink-faint);font-size:.78rem;">${esc(a.contact_email)}</span></span>
          <span>${esc(a.category)}</span>
          <span title="${esc(a.details || '')}">${esc(details)}</span>
          <span class="order-status ${STATUS_CLS[a.status] || 'processing'}">${STATUS_LABELS[a.status] || a.status}</span>
          <span class="admin-row-actions">${actions}</span>
        </div>`;
    }).join('');

    tableBody.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-approve'), 'approved', btn));
    });
    tableBody.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-reject'), 'rejected', btn));
    });
  }

  async function decide(id, status, btn) {
    let note = null;
    if (status === 'rejected') {
      note = window.prompt('Optional note for your own records on why this was declined:', '');
      if (note === null) return; // cancelled
    }
    btn.disabled = true;
    const patch = { status };
    if (note) patch.admin_note = note;
    const { error } = await window.sb.from('supplier_applications').update(patch).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to update supplier application', error); return; }
    await loadApplications();
  }

  await loadApplications();
});
