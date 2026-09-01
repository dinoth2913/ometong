/* =========================================================
   OMETONG — ADMIN INQUIRIES PANEL
   The only place both sides of a mediated inquiry are ever visible
   at once — see supabase/marketplace_enhancements_schema.sql
   section 1. Reads/writes both public.inquiries channels directly;
   RLS only allows this for accounts with role = 'admin'.
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

  const listBody = document.getElementById('adminMsgListBody');
  const listEmpty = document.getElementById('adminMsgListEmpty');
  const threadEmpty = document.getElementById('adminMsgThreadEmpty');
  const threadActive = document.getElementById('adminMsgThreadActive');
  const subjectEl = document.getElementById('adminMsgSubject');
  const withEl = document.getElementById('adminMsgWith');
  const buyerBubbles = document.getElementById('adminMsgBuyerBubbles');
  const supplierBubbles = document.getElementById('adminMsgSupplierBubbles');
  const closeBtn = document.getElementById('adminMsgCloseBtn');
  const backBtn = document.getElementById('adminMsgBack');
  const shell = document.getElementById('adminMsgShell');
  if (!listBody) return; // section not on this page

  let inquiries = [];
  let active = null;

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  async function loadInquiries() {
    const { data, error } = await window.sb
      .from('inquiries')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load inquiries', error); return; }
    inquiries = data || [];
    renderList();
  }

  function renderList() {
    if (!inquiries.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listBody.innerHTML = inquiries.map(inq => `
      <button class="msg-row${active && active.id === inq.id ? ' active' : ''}${inq.status === 'closed' ? ' closed' : ''}" data-id="${inq.id}">
        <div class="msg-row-top">
          <span class="msg-row-with">${esc(inq.buyer_name || 'Buyer')} ↔ ${esc(inq.supplier_name || 'Supplier')}</span>
        </div>
        <span class="msg-row-subject">${esc(inq.subject || 'Inquiry')}</span>
        <span class="msg-row-time">${timeAgo(inq.last_message_at)} ago${inq.status === 'closed' ? ' · closed' : ''}</span>
      </button>
    `).join('');
    listBody.querySelectorAll('.msg-row').forEach(row => {
      row.addEventListener('click', () => openInquiry(row.getAttribute('data-id')));
    });
  }

  function renderBubbles(container, messages, otherLabel) {
    if (!messages.length) {
      container.innerHTML = '<p style="color:var(--ink-faint);font-size:.82rem;">No messages on this side yet.</p>';
      return;
    }
    container.innerHTML = messages.map(m => {
      const mine = m.sender_role === 'admin';
      const label = mine ? 'You' : otherLabel;
      return `
        <div class="msg-bubble-row ${mine ? 'mine' : 'admin'}">
          <div class="msg-bubble">
            ${esc(m.body)}
            <span class="msg-bubble-meta">${label} · ${timeAgo(m.created_at)} ago</span>
          </div>
        </div>
      `;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  async function openInquiry(id) {
    const inq = inquiries.find(i => i.id === id);
    if (!inq) return;
    active = inq;
    shell.classList.add('thread-open');
    threadEmpty.hidden = true;
    threadActive.hidden = false;
    renderList();

    subjectEl.textContent = inq.subject || 'Inquiry';
    withEl.textContent = `${inq.buyer_name || 'Buyer'} ↔ ${inq.supplier_name || 'Supplier'}${inq.listing_ref ? ' · listing #' + inq.listing_ref : ''}`;
    if (closeBtn) closeBtn.textContent = inq.status === 'closed' ? 'Reopen case' : 'Close case';

    const { data, error } = await window.sb
      .from('inquiry_messages')
      .select('*')
      .eq('inquiry_id', inq.id)
      .order('created_at', { ascending: true });
    if (error) { console.error('Ometong: failed to load inquiry messages', error); return; }

    const all = data || [];
    renderBubbles(buyerBubbles, all.filter(m => m.channel === 'buyer_admin'), inq.buyer_name || 'Buyer');
    renderBubbles(supplierBubbles, all.filter(m => m.channel === 'supplier_admin'), inq.supplier_name || 'Supplier');
  }

  backBtn?.addEventListener('click', () => shell.classList.remove('thread-open'));

  closeBtn?.addEventListener('click', async () => {
    if (!active) return;
    const nextStatus = active.status === 'closed' ? 'open' : 'closed';
    const { error } = await window.sb.from('inquiries').update({ status: nextStatus }).eq('id', active.id);
    if (error) { console.error('Ometong: failed to update inquiry status', error); return; }
    active.status = nextStatus;
    closeBtn.textContent = nextStatus === 'closed' ? 'Reopen case' : 'Close case';
    loadInquiries();
  });

  document.querySelectorAll('.msg-composer[data-channel]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!active) return;
      const channel = form.getAttribute('data-channel');
      const textarea = form.querySelector('textarea');
      const body = textarea.value.trim();
      if (!body) return;
      textarea.disabled = true;
      const { error } = await window.sb.from('inquiry_messages').insert({
        inquiry_id: active.id,
        channel,
        sender_id: adminId,
        sender_role: 'admin',
        body
      });
      textarea.disabled = false;
      if (error) { console.error('Ometong: failed to send relay message', error); return; }
      textarea.value = '';
      openInquiry(active.id);
      loadInquiries();
    });
    form.querySelector('textarea').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  });

  /* ---------- Realtime — see supabase/realtime_messaging.sql ---------- */
  window.sb
    .channel('ometong-admin-inquiry-messages-' + adminId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiry_messages' }, async (payload) => {
      const openId = active ? active.id : null;
      await loadInquiries();
      if (openId && payload.new.inquiry_id === openId) await openInquiry(openId);
    })
    .subscribe();

  await loadInquiries();
});
