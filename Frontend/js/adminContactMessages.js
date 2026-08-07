/* =========================================================
   OMETONG — ADMIN: CONTACT US MESSAGES + INQUIRIES TAB SWITCH
   Contact Us submissions (public.contact_messages) are a separate,
   simpler system from the mediated buyer/supplier inquiries in
   adminInquiries.js: there's no back-and-forth panel here, because
   staff reply to the sender directly by real email/phone using the
   details they gave — not through the site. This file just lists
   them, shows the full message + contact details, and lets staff
   log that they've handled it.
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

  /* ---------- Tab switching (shared with adminInquiries.js's panel) ---------- */
  const tabMediated = document.getElementById('inqTabMediated');
  const tabContact = document.getElementById('inqTabContact');
  const mediatedShell = document.getElementById('adminMsgShell');
  const contactShell = document.getElementById('contactMsgShell');

  tabMediated?.addEventListener('click', () => {
    tabMediated.classList.add('active');
    tabContact?.classList.remove('active');
    if (mediatedShell) mediatedShell.hidden = false;
    if (contactShell) contactShell.hidden = true;
  });
  tabContact?.addEventListener('click', () => {
    tabContact.classList.add('active');
    tabMediated?.classList.remove('active');
    if (contactShell) contactShell.hidden = false;
    if (mediatedShell) mediatedShell.hidden = true;
  });

  const session = await getInitialSession();
  if (!session || !window.sb) return; // authGuard.js already redirects non-admins away
  const adminId = session.user.id;
  const esc = window.ometongEscapeHTML || (s => s);

  const listBody = document.getElementById('contactMsgListBody');
  const listEmpty = document.getElementById('contactMsgListEmpty');
  const threadEmpty = document.getElementById('contactMsgThreadEmpty');
  const threadActive = document.getElementById('contactMsgThreadActive');
  const shell = document.getElementById('contactMsgShell');
  const subjectEl = document.getElementById('contactMsgSubject');
  const fromEl = document.getElementById('contactMsgFrom');
  const textEl = document.getElementById('contactMsgText');
  const emailBtn = document.getElementById('contactMsgEmailBtn');
  const callBtn = document.getElementById('contactMsgCallBtn');
  const statusBadge = document.getElementById('contactMsgStatusBadge');
  const noteInput = document.getElementById('contactMsgNote');
  const markRepliedBtn = document.getElementById('contactMsgMarkRepliedBtn');
  const closeBtn = document.getElementById('contactMsgCloseBtn');
  const backBtn = document.getElementById('contactMsgBack');
  const newBadge = document.getElementById('contactNewBadge');
  if (!listBody) return; // section not on this page

  const ROUTE_LABELS = { general: 'General', sales: 'Sales', support: 'Support', partner: 'Become a Supplier' };

  let messages = [];
  let active = null;

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  async function loadMessages() {
    const { data, error } = await window.sb
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load contact messages', error); return; }
    messages = data || [];
    renderList();
    const newCount = messages.filter(m => m.status === 'new').length;
    if (newBadge) {
      newBadge.hidden = newCount === 0;
      newBadge.textContent = newCount;
    }
  }

  function renderList() {
    if (!messages.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listBody.innerHTML = messages.map(m => `
      <button class="msg-row${active && active.id === m.id ? ' active' : ''}${m.status !== 'new' ? ' closed' : ''}" data-id="${m.id}">
        <div class="msg-row-top">
          <span class="msg-row-with">${esc(m.name)}</span>
          ${m.status === 'new' ? '<span class="msg-row-badge">•</span>' : ''}
        </div>
        <span class="msg-row-subject">${esc(m.subject)}</span>
        <span class="msg-row-time">${ROUTE_LABELS[m.route] || m.route} · ${timeAgo(m.created_at)} ago${m.status !== 'new' ? ' · ' + m.status : ''}</span>
      </button>
    `).join('');
    listBody.querySelectorAll('.msg-row').forEach(row => {
      row.addEventListener('click', () => openMessage(row.getAttribute('data-id')));
    });
  }

  function openMessage(id) {
    const m = messages.find(x => x.id === id);
    if (!m) return;
    active = m;
    shell.classList.add('thread-open');
    threadEmpty.hidden = true;
    threadActive.hidden = false;
    renderList();

    subjectEl.textContent = m.subject;
    fromEl.textContent = `${m.name} · ${m.email}${m.company ? ' · ' + m.company : ''}`;
    textEl.textContent = m.message;

    const mailSubject = encodeURIComponent('Re: ' + m.subject);
    const mailBody = encodeURIComponent(`Hi ${m.name},\n\n`);
    emailBtn.href = `mailto:${m.email}?subject=${mailSubject}&body=${mailBody}`;

    if (m.phone) {
      callBtn.hidden = false;
      callBtn.href = `tel:${m.phone.replace(/\s+/g, '')}`;
    } else {
      callBtn.hidden = true;
    }

    statusBadge.textContent = m.status;
    statusBadge.className = 'contact-msg-status' + (m.status !== 'new' ? ' ' + m.status : '');
    noteInput.value = m.admin_note || '';
    markRepliedBtn.textContent = m.status === 'replied' ? 'Replied ✓' : 'Mark as replied';
    markRepliedBtn.disabled = m.status === 'replied';
  }

  backBtn?.addEventListener('click', () => shell.classList.remove('thread-open'));

  async function updateStatus(status) {
    if (!active) return;
    const patch = { status, admin_note: noteInput.value.trim() || null };
    if (status === 'replied') {
      patch.replied_by = adminId;
      patch.replied_at = new Date().toISOString();
    }
    const { error } = await window.sb.from('contact_messages').update(patch).eq('id', active.id);
    if (error) { console.error('Ometong: failed to update contact message', error); return; }
    Object.assign(active, patch);
    await loadMessages();
    openMessage(active.id);
  }

  markRepliedBtn?.addEventListener('click', () => updateStatus('replied'));
  closeBtn?.addEventListener('click', () => updateStatus('closed'));

  await loadMessages();
});
