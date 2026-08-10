/* =========================================================
   OMETONG — SUPPLIER: BUSINESS VERIFICATION (KYB)
   Upload UI for public.supplier_verification_docs
   (marketplace_enhancements_schema.sql section 8) — the database
   side (table, RLS, private storage bucket, the trigger that flips
   profiles.is_verified once a license is approved) already existed
   with nothing anywhere to actually upload a document. Reviewed on
   the admin side by adminVerification.js.
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
  if (!session || !window.sb) return; // authGuard.js already redirects unauthenticated visitors away
  const myId = session.user.id;
  const esc = window.ometongEscapeHTML || (s => s);

  const form = document.getElementById('verifyUploadForm');
  const docTypeSelect = document.getElementById('verifyDocType');
  const fileInput = document.getElementById('verifyDocFile');
  const formMsg = document.getElementById('verifyFormMsg');
  const submitBtn = document.getElementById('verifySubmitBtn');
  const docsBody = document.getElementById('verifyDocsBody');
  const docsEmpty = document.getElementById('verifyDocsEmpty');
  const verifyPill = document.getElementById('verifyPill');
  if (!form) return; // section not on this page

  const MAX_BYTES = 8 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
  const DOC_TYPE_LABELS = {
    business_license: 'Business license',
    export_license: 'Export license',
    tax_certificate: 'Tax certificate',
    id_document: 'ID document',
    other: 'Other'
  };
  const STATUS_CLS = { pending: 'processing', approved: 'delivered', rejected: 'cancelled' };

  function showMsg(text, isError) {
    formMsg.textContent = text;
    formMsg.className = 'ot-msg ' + (isError ? 'error' : 'success');
    formMsg.hidden = false;
  }

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  async function loadPill() {
    if (!verifyPill) return;
    const { data: profile } = await window.sb.from('profiles').select('is_verified').eq('id', myId).single();
    if (profile && profile.is_verified) {
      verifyPill.classList.remove('pending');
      verifyPill.classList.add('verified');
      const label = verifyPill.querySelector('span[data-i18n], span:last-child');
      if (label) label.textContent = 'Verified';
    }
  }

  async function loadDocs() {
    const { data, error } = await window.sb
      .from('supplier_verification_docs')
      .select('*')
      .eq('supplier_id', myId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load verification docs', error); return; }
    render(data || []);
  }

  function render(docs) {
    if (!docs.length) {
      docsBody.innerHTML = '';
      docsEmpty.hidden = false;
      return;
    }
    docsEmpty.hidden = true;
    docsBody.innerHTML = docs.map(d => `
      <div class="verify-doc-row">
        <span>${esc(DOC_TYPE_LABELS[d.doc_type] || d.doc_type)}</span>
        <span class="order-status ${STATUS_CLS[d.status] || 'processing'}">${esc(d.status)}</span>
        <span class="verify-doc-time">${timeAgo(d.created_at)} ago</span>
        ${d.review_note ? `<span class="verify-doc-note">${esc(d.review_note)}</span>` : ''}
      </div>
    `).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.hidden = true;

    const file = fileInput.files && fileInput.files[0];
    if (!file) { showMsg('Choose a file to upload.', true); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { showMsg('Please choose a JPG, PNG, WEBP or PDF file.', true); return; }
    if (file.size > MAX_BYTES) { showMsg('That file is too large — please choose one under 8MB.', true); return; }

    submitBtn.disabled = true;

    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${myId}/${Date.now()}.${ext}`;
    const upload = await window.sb.storage.from('verification-docs').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upload.error) {
      submitBtn.disabled = false;
      showMsg(upload.error.message || 'Could not upload this file. Please try again.', true);
      return;
    }

    const { error } = await window.sb.from('supplier_verification_docs').insert({
      supplier_id: myId,
      doc_type: docTypeSelect.value,
      file_url: path
    });
    submitBtn.disabled = false;

    if (error) {
      console.error('Ometong: failed to record verification doc', error);
      showMsg(error.message || 'Could not submit this document. Please try again.', true);
      return;
    }

    showMsg('Document submitted — our team will review it shortly.', false);
    form.reset();
    loadDocs();
  });

  await Promise.all([loadPill(), loadDocs()]);
});
