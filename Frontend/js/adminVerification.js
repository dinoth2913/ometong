/* =========================================================
   OMETONG — ADMIN: SUPPLIER VERIFICATION DOCUMENTS (KYB review)
   Reviews what suppliers/manufacturers submit from
   supplierVerification.js. Approving a business_license or
   export_license auto-flips profiles.is_verified via the trigger
   already defined in marketplace_enhancements_schema.sql — this
   file only ever changes supplier_verification_docs.status.

   file_url is a path in the private 'verification-docs' bucket, not
   a public URL — "View file" generates a short-lived signed URL on
   click rather than trying to render/link it directly.
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

  const tableBody = document.getElementById('verificationDocsTableBody');
  const table = document.getElementById('verificationDocsTable');
  const emptyEl = document.getElementById('verificationDocsEmpty');
  const pendingHint = document.getElementById('verificationPendingHint');
  if (!tableBody) return; // section not on this page

  const DOC_TYPE_LABELS = {
    business_license: 'Business license',
    export_license: 'Export license',
    tax_certificate: 'Tax certificate',
    id_document: 'ID document',
    other: 'Other'
  };
  const STATUS_CLS = { pending: 'processing', approved: 'delivered', rejected: 'cancelled' };

  let docs = [];
  let profileMap = {};

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  async function loadDocs() {
    const [docsRes, profilesRes] = await Promise.all([
      window.sb.from('supplier_verification_docs').select('*').order('created_at', { ascending: false }),
      window.sb.from('profiles').select('id, business_name, full_name')
    ]);
    if (docsRes.error) { console.error('Ometong: failed to load verification docs', docsRes.error); return; }
    if (profilesRes.error) console.error('Ometong: failed to load profiles', profilesRes.error);

    profileMap = {};
    (profilesRes.data || []).forEach(p => { profileMap[p.id] = p; });
    docs = docsRes.data || [];
    render();
  }

  function supplierName(id) {
    const p = profileMap[id];
    return (p && (p.business_name || p.full_name)) || 'Unknown';
  }

  function render() {
    if (!docs.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      pendingHint.textContent = 'Nothing pending';
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    const pendingCount = docs.filter(d => d.status === 'pending').length;
    pendingHint.textContent = pendingCount ? `${pendingCount} awaiting review` : 'Nothing pending';

    tableBody.innerHTML = docs.map(d => {
      let actions = `<button data-view="${d.id}">View file</button>`;
      if (d.status === 'pending') {
        actions += ` <button class="btn-approve" data-approve="${d.id}">Approve</button>
          <button class="btn-reject" data-reject="${d.id}">Reject</button>`;
      }
      return `
        <div class="admin-row admin-row--verification">
          <span>${esc(supplierName(d.supplier_id))}</span>
          <span>${esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type)}</span>
          <span>${timeAgo(d.created_at)} ago</span>
          <span class="order-status ${STATUS_CLS[d.status] || 'processing'}">${esc(d.status)}</span>
          <span class="admin-row-actions">${actions}</span>
        </div>`;
    }).join('');

    tableBody.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => viewFile(btn.getAttribute('data-view'), btn));
    });
    tableBody.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-approve'), 'approved', btn));
    });
    tableBody.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => decide(btn.getAttribute('data-reject'), 'rejected', btn));
    });
  }

  async function viewFile(id, btn) {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    btn.disabled = true;
    const { data, error } = await window.sb.storage.from('verification-docs').createSignedUrl(doc.file_url, 60);
    btn.disabled = false;
    if (error || !data) { console.error('Ometong: failed to sign verification file URL', error); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  async function decide(id, status, btn) {
    let note = null;
    if (status === 'rejected') {
      note = window.prompt('Optional note for your own records on why this was declined:', '');
      if (note === null) return; // cancelled
    }
    btn.disabled = true;
    const patch = { status };
    if (note) patch.review_note = note;
    const { error } = await window.sb.from('supplier_verification_docs').update(patch).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to update verification doc', error); return; }
    await loadDocs();
  }

  await loadDocs();
});
