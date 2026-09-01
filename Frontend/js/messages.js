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

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

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

  // Same 2FA step-up check as authGuard.js and security.js — a
  // session stuck at aal1 with 2FA pending shouldn't reach a real
  // inbox any more than it should reach a dashboard.
  const { data: aal } = await window.sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    window.location.href = 'mfa-challenge.html?next=' + encodeURIComponent('messages.html');
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

  /* =========================================================
     OMETONG SUPPORT — a direct, two-way line to Ometong staff.
     Unlike the mediated inquiries above (buyer<->supplier, routed
     through staff because those two can't talk directly), this is
     just this account <-> Ometong, nobody to mediate between. See
     supabase/support_messages_schema.sql.
  ========================================================= */
  const supportShell = document.getElementById('supportShell');
  const supportListBody = document.getElementById('supportListBody');
  const supportListEmpty = document.getElementById('supportListEmpty');
  const supportThreadEmpty = document.getElementById('supportThreadEmpty');
  const supportThreadActive = document.getElementById('supportThreadActive');
  const supportThreadSubject = document.getElementById('supportThreadSubject');
  const supportBubbles = document.getElementById('supportBubbles');
  const supportComposer = document.getElementById('supportComposer');
  const supportComposerInput = document.getElementById('supportComposerInput');
  const supportNewBadge = document.getElementById('supportNewBadge');

  let supportThreads = [];
  let activeSupportThread = null;

  async function loadSupportThreads() {
    const { data, error } = await window.sb
      .from('support_threads')
      .select('*')
      .eq('user_id', myId)
      .order('last_message_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load support threads', error); return; }
    supportThreads = data || [];
    renderSupportList();
    const unreadTotal = supportThreads.reduce((sum, t) => sum + t.user_unread_count, 0);
    if (supportNewBadge) {
      supportNewBadge.hidden = unreadTotal === 0;
      supportNewBadge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
    }
  }

  function renderSupportList() {
    if (!supportThreads.length) {
      supportListBody.innerHTML = '';
      supportListEmpty.hidden = false;
      return;
    }
    supportListEmpty.hidden = true;
    supportListBody.innerHTML = supportThreads.map(t => `
      <button class="msg-row${activeSupportThread && activeSupportThread.id === t.id ? ' active' : ''}${t.status === 'closed' ? ' closed' : ''}" data-id="${t.id}">
        <div class="msg-row-top">
          <span class="msg-row-with">Ometong Support</span>
          ${t.user_unread_count > 0 ? `<span class="msg-row-badge">${t.user_unread_count}</span>` : ''}
        </div>
        <span class="msg-row-subject">${esc(t.subject || 'Support request')}</span>
        <span class="msg-row-time">${timeAgo(t.last_message_at)} ago${t.status === 'closed' ? ' · closed' : ''}</span>
      </button>
    `).join('');
    supportListBody.querySelectorAll('.msg-row').forEach(row => {
      row.addEventListener('click', () => openSupportThread(row.getAttribute('data-id')));
    });
  }

  async function openSupportThread(id) {
    const t = supportThreads.find(x => x.id === id);
    if (!t) return;
    activeSupportThread = t;
    supportShell.classList.add('thread-open');
    supportThreadEmpty.hidden = true;
    supportThreadActive.hidden = false;
    renderSupportList();

    supportThreadSubject.textContent = t.subject || 'Support request';

    supportBubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">Loading…</p>';
    const { data, error } = await window.sb
      .from('support_messages')
      .select('*')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: true });
    if (error) { console.error('Ometong: failed to load support messages', error); supportBubbles.innerHTML = ''; return; }

    renderSupportBubbles(data || []);

    if (t.user_unread_count > 0) {
      await window.sb.rpc('mark_support_thread_read', { p_thread_id: t.id, p_as_admin: false });
      t.user_unread_count = 0;
      renderSupportList();
      loadSupportThreads();
    }

    supportComposerInput.focus();
  }

  function renderSupportBubbles(messages) {
    if (!messages.length) {
      supportBubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">No messages yet — send the first one below.</p>';
      return;
    }
    supportBubbles.innerHTML = messages.map(m => {
      const mine = m.sender_role === 'user';
      const label = mine ? 'You' : 'Ometong Support';
      return `
        <div class="msg-bubble-row ${mine ? 'mine' : 'admin'}">
          <div class="msg-bubble">
            ${esc(m.body)}
            <span class="msg-bubble-meta">${label} · ${timeAgo(m.created_at)} ago</span>
          </div>
        </div>
      `;
    }).join('');
    supportBubbles.scrollTop = supportBubbles.scrollHeight;
  }

  document.getElementById('supportBack').addEventListener('click', () => {
    supportShell.classList.remove('thread-open');
  });

  async function startNewSupportThread() {
    const { data: threadId, error } = await window.sb.rpc('start_support_thread', {
      p_subject: 'Support request',
      p_first_message: null
    });
    if (error) { console.error('Ometong: failed to start support thread', error); return; }
    await loadSupportThreads();
    openSupportThread(threadId);
  }
  document.getElementById('supportNewBtn')?.addEventListener('click', startNewSupportThread);
  document.getElementById('supportStartBtn')?.addEventListener('click', startNewSupportThread);

  supportComposer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = supportComposerInput.value.trim();
    if (!body) return;
    supportComposerInput.disabled = true;

    if (!activeSupportThread) {
      // No thread open yet — the composer inside the empty state
      // shouldn't normally be reachable, but handle it gracefully
      // by starting one with this text as the first message.
      const { data: threadId, error } = await window.sb.rpc('start_support_thread', {
        p_subject: 'Support request',
        p_first_message: body
      });
      supportComposerInput.disabled = false;
      if (error) { console.error('Ometong: failed to start support thread', error); return; }
      supportComposerInput.value = '';
      await loadSupportThreads();
      openSupportThread(threadId);
      return;
    }

    const { error } = await window.sb.from('support_messages').insert({
      thread_id: activeSupportThread.id,
      sender_id: myId,
      sender_role: 'user',
      body
    });
    supportComposerInput.disabled = false;
    if (error) { console.error('Ometong: failed to send support message', error); return; }
    supportComposerInput.value = '';
    activeSupportThread.last_message_at = new Date().toISOString();
    openSupportThread(activeSupportThread.id);
    loadSupportThreads();
  });

  supportComposerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      supportComposer.requestSubmit();
    }
  });

  /* ---------- Tab switching ---------- */
  const tabInquiries = document.getElementById('tabInquiries');
  const tabSupport = document.getElementById('tabSupport');
  tabInquiries.addEventListener('click', () => {
    tabInquiries.classList.add('active');
    tabSupport.classList.remove('active');
    msgShell.hidden = false;
    supportShell.hidden = true;
  });
  tabSupport.addEventListener('click', () => {
    tabSupport.classList.add('active');
    tabInquiries.classList.remove('active');
    supportShell.hidden = false;
    msgShell.hidden = true;
  });

  /* =========================================================
     REALTIME — a new message pushes in instead of needing a manual
     refresh. Requires supabase/realtime_messaging.sql to have been
     run (adds these tables to the supabase_realtime publication);
     without that this just quietly never fires, same as before.
     RLS still governs what actually reaches this client — this only
     ever sees inserts on rows the current account could already
     SELECT anyway.
  ========================================================= */
  window.sb
    .channel('ometong-inquiry-messages-' + myId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiry_messages' }, async (payload) => {
      const row = payload.new;
      const openId = activeInquiry ? activeInquiry.id : null;
      await loadInquiries();
      if (openId && row.inquiry_id === openId) await openInquiry(openId);
    })
    .subscribe();

  window.sb
    .channel('ometong-support-messages-' + myId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, async (payload) => {
      const row = payload.new;
      const openId = activeSupportThread ? activeSupportThread.id : null;
      await loadSupportThreads();
      if (openId && row.thread_id === openId) await openSupportThread(openId);
    })
    .subscribe();

  /* ---------- Deep link from "Contact Supplier" (?inquiry=<id>) ---------- */
  await loadInquiries();
  await loadSupportThreads();
  const params = new URLSearchParams(window.location.search);
  const wantId = params.get('inquiry');
  if (wantId && inquiries.some(i => i.id === wantId)) {
    openInquiry(wantId);
  }
  if (params.get('tab') === 'support') {
    tabSupport.click();
  }
});
