/* =========================================================
   OMETONG — MESSAGES / INQUIRIES INBOX (buyer + supplier + manufacturer)

   Every case lives as one row in public.inquiries with two
   one-sided channels (buyer_admin / supplier_admin) in
   public.inquiry_messages. This page never lets the current user
   see the other party's channel — that's enforced by RLS on the
   database side, this file just renders whatever the database
   actually hands back for "my" side of each case. See
   supabase/marketplace_enhancements_schema.sql section 1.
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- Chrome: hamburger, scroll progress ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('mainNav');
  function onScroll() {
    const top = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (top / docHeight) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    nav?.classList.toggle('scrolled', top > 40);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  const esc = window.ometongEscapeHTML || (s => s);

  /* ---------- Auth ---------- */
  function getInitialSession() {
    return new Promise((resolve) => {
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          sub.subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  if (!window.sb) return;
  const session = await getInitialSession();
  if (!session) {
    window.location.href = 'authenticationpage.html';
    return;
  }
  const profile = await window.ometongGetProfile();
  if (!profile) {
    window.location.href = 'authenticationpage.html';
    return;
  }
  if (profile.role === 'admin') {
    // Admins use the two-way inquiries panel on the admin dashboard,
    // not this single-sided inbox.
    window.location.href = 'admindashboard.html#inquiries';
    return;
  }

  const myId = profile.id;
  const displayName = profile.business_name || profile.full_name || profile.email || 'Account';
  const dashHref = window.ometongDashboardForRole ? window.ometongDashboardForRole(profile.role) : 'buyerdashboard.html';
  document.getElementById('dashboardLink').href = dashHref;
  document.getElementById('dashboardLinkMobile').href = dashHref;
  document.getElementById('userChipName').textContent = displayName;
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('userAvatarInitials').textContent = initials || '?';

  /* ---------- State ---------- */
  const msgShell = document.getElementById('msgShell');
  const msgListBody = document.getElementById('msgListBody');
  const msgListEmpty = document.getElementById('msgListEmpty');
  const msgThreadEmpty = document.getElementById('msgThreadEmpty');
  const msgThreadActive = document.getElementById('msgThreadActive');
  const msgThreadSubject = document.getElementById('msgThreadSubject');
  const msgThreadWith = document.getElementById('msgThreadWith');
  const msgBubbles = document.getElementById('msgBubbles');
  const msgComposer = document.getElementById('msgComposer');
  const msgComposerInput = document.getElementById('msgComposerInput');

  let inquiries = [];
  let activeInquiry = null;

  function myRoleIn(inq) { return inq.buyer_id === myId ? 'buyer' : 'supplier'; }
  function myChannelIn(inq) { return myRoleIn(inq) === 'buyer' ? 'buyer_admin' : 'supplier_admin'; }
  function otherPartyName(inq) { return myRoleIn(inq) === 'buyer' ? inq.supplier_name : inq.buyer_name; }
  function myUnread(inq) { return myRoleIn(inq) === 'buyer' ? inq.buyer_unread_count : inq.supplier_unread_count; }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    const days = Math.round(hrs / 24);
    if (days < 7) return days + 'd';
    return new Date(iso).toLocaleDateString();
  }

  /* ---------- Load inquiries list ---------- */
  async function loadInquiries() {
    const { data, error } = await window.sb
      .from('inquiries')
      .select('*')
      .or(`buyer_id.eq.${myId},supplier_id.eq.${myId}`)
      .order('last_message_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load inquiries', error); return; }
    inquiries = data || [];
    renderList();
  }

  function renderList() {
    if (!inquiries.length) {
      msgListBody.innerHTML = '';
      msgListEmpty.hidden = false;
      return;
    }
    msgListEmpty.hidden = true;
    msgListBody.innerHTML = inquiries.map(inq => `
      <button class="msg-row${activeInquiry && activeInquiry.id === inq.id ? ' active' : ''}${inq.status === 'closed' ? ' closed' : ''}" data-id="${inq.id}">
        <div class="msg-row-top">
          <span class="msg-row-with">${esc(otherPartyName(inq) || 'Ometong')}</span>
          ${myUnread(inq) > 0 ? `<span class="msg-row-badge">${myUnread(inq)}</span>` : ''}
        </div>
        <span class="msg-row-subject">${esc(inq.subject || 'Inquiry')}</span>
        <span class="msg-row-time">${timeAgo(inq.last_message_at)} ago${inq.status === 'closed' ? ' · closed' : ''}</span>
      </button>
    `).join('');
    msgListBody.querySelectorAll('.msg-row').forEach(row => {
      row.addEventListener('click', () => openInquiry(row.getAttribute('data-id')));
    });
  }

  /* ---------- Open a thread ---------- */
  async function openInquiry(id) {
    const inq = inquiries.find(i => i.id === id);
    if (!inq) return;
    activeInquiry = inq;
    msgShell.classList.add('thread-open');
    msgThreadEmpty.hidden = true;
    msgThreadActive.hidden = false;
    renderList();

    msgThreadSubject.textContent = inq.subject || 'Inquiry';
    msgThreadWith.textContent = `Via Ometong · re: ${otherPartyName(inq) || 'your inquiry'}`;

    msgBubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">Loading…</p>';
    const channel = myChannelIn(inq);
    const { data, error } = await window.sb
      .from('inquiry_messages')
      .select('*')
      .eq('inquiry_id', inq.id)
      .eq('channel', channel)
      .order('created_at', { ascending: true });
    if (error) { console.error('Ometong: failed to load messages', error); msgBubbles.innerHTML = ''; return; }

    renderBubbles(data || []);

    if (myUnread(inq) > 0) {
      await window.sb.rpc('mark_inquiry_read', { p_inquiry_id: inq.id });
      if (myRoleIn(inq) === 'buyer') inq.buyer_unread_count = 0; else inq.supplier_unread_count = 0;
      renderList();
    }

    msgComposerInput.focus();
  }

  function renderBubbles(messages) {
    if (!messages.length) {
      msgBubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">No messages yet — send the first one below.</p>';
      return;
    }
    msgBubbles.innerHTML = messages.map(m => {
      const mine = m.sender_role !== 'admin';
      const label = m.sender_role === 'admin' ? 'Ometong team' : 'You';
      return `
        <div class="msg-bubble-row ${mine ? 'mine' : 'admin'}">
          <div class="msg-bubble">
            ${esc(m.body)}
            <span class="msg-bubble-meta">${label} · ${timeAgo(m.created_at)} ago</span>
          </div>
        </div>
      `;
    }).join('');
    msgBubbles.scrollTop = msgBubbles.scrollHeight;
  }

  document.getElementById('msgBack').addEventListener('click', () => {
    msgShell.classList.remove('thread-open');
  });

  /* ---------- Send ---------- */
  msgComposer.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeInquiry) return;
    const body = msgComposerInput.value.trim();
    if (!body) return;
    const channel = myChannelIn(activeInquiry);
    const senderRole = myRoleIn(activeInquiry);
    msgComposerInput.disabled = true;
    const { error } = await window.sb.from('inquiry_messages').insert({
      inquiry_id: activeInquiry.id,
      channel,
      sender_id: myId,
      sender_role: senderRole,
      body
    });
    msgComposerInput.disabled = false;
    if (error) { console.error('Ometong: failed to send message', error); return; }
    msgComposerInput.value = '';
    activeInquiry.last_message_at = new Date().toISOString();
    openInquiry(activeInquiry.id);
    loadInquiries();
  });

  msgComposerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      msgComposer.requestSubmit();
    }
  });

  /* ---------- Deep link from "Contact Supplier" (?inquiry=<id>) ---------- */
  await loadInquiries();
  const params = new URLSearchParams(window.location.search);
  const wantId = params.get('inquiry');
  if (wantId && inquiries.some(i => i.id === wantId)) {
    openInquiry(wantId);
  }
});
