/* =========================================================
   OMETONG — ADMIN: CONTACT US MESSAGES
   Contact Us submissions (public.contact_messages) are a separate,
   simpler system from the mediated buyer/supplier inquiries in
   adminInquiries.js — a sender here usually isn't paired with a
   specific supplier, and often isn't even a registered account.
   Staff write a reply here (saved on the platform via admin_reply,
   see supabase/contact_messages_reply_schema.sql), which also opens
   ready to send by real email — there's no email-sending
   integration wired into this project, so the message still has to
   go out through the admin's own inbox.
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
  const saveNoteBtn = document.getElementById('contactMsgSaveNoteBtn');
  const closeBtn = document.getElementById('contactMsgCloseBtn');
  const backBtn = document.getElementById('contactMsgBack');
  const newBadge = document.getElementById('contactNewBadge');
  const replyBlock = document.getElementById('contactMsgReplyBlock');
  const replyTextEl = document.getElementById('contactMsgReplyText');
  const replyForm = document.getElementById('contactMsgReplyForm');
  const replyInput = document.getElementById('contactMsgReply');
  const replyToNameEl = document.getElementById('contactMsgReplyToName');
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

  function buildMailHref(m, bodyText) {
    const mailSubject = encodeURIComponent('Re: ' + m.subject);
    const mailBody = encodeURIComponent(bodyText || `Hi ${m.name},\n\n`);
    return `mailto:${m.email}?subject=${mailSubject}&body=${mailBody}`;
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
    replyToNameEl.textContent = m.name;

    emailBtn.href = buildMailHref(m);
    if (m.phone) {
      callBtn.hidden = false;
      callBtn.href = `tel:${m.phone.replace(/\s+/g, '')}`;
    } else {
      callBtn.hidden = true;
    }

    statusBadge.textContent = m.status;
    statusBadge.className = 'contact-msg-status' + (m.status !== 'new' ? ' ' + m.status : '');
    noteInput.value = m.admin_note || '';

    if (m.admin_reply) {
      replyBlock.hidden = false;
      replyTextEl.textContent = m.admin_reply;
      replyInput.value = m.admin_reply;
    } else {
      replyBlock.hidden = true;
      replyInput.value = '';
    }
  }

  backBtn?.addEventListener('click', () => shell.classList.remove('thread-open'));

  async function patchActive(patch) {
    if (!active) return false;
    const { error } = await window.sb.from('contact_messages').update(patch).eq('id', active.id);
    if (error) { console.error('Ometong: failed to update contact message', error); return false; }
    Object.assign(active, patch);
    await loadMessages();
    openMessage(active.id);
    return true;
  }

  replyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!active) return;
    const replyText = replyInput.value.trim();
    if (!replyText) return;
    const sendBtn = document.getElementById('contactMsgSendReplyBtn');
    sendBtn.disabled = true;
    const ok = await patchActive({
      admin_reply: replyText,
      status: 'replied',
      replied_by: adminId,
      replied_at: new Date().toISOString()
    });
    sendBtn.disabled = false;
    if (ok) {
      // The reply is now saved on the platform — open it ready to
      // actually send, since there's no automatic email delivery here.
      window.open(buildMailHref(active, `Hi ${active.name},\n\n${replyText}`), '_blank');
    }
  });

  saveNoteBtn?.addEventListener('click', () => {
    patchActive({ admin_note: noteInput.value.trim() || null });
  });

  closeBtn?.addEventListener('click', () => {
    patchActive({ status: 'closed', admin_note: noteInput.value.trim() || null });
  });

  await loadMessages();
});
