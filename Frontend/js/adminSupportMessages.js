/* =========================================================
   OMETONG — ADMIN: CUSTOMER SUPPORT
   Direct, two-way conversations between a logged-in customer and
   Ometong staff (public.support_threads / support_messages, see
   supabase/support_messages_schema.sql) — different from the
   Inquiries panel, which mediates buyer<->supplier. Here staff ARE
   the other party, so it's a normal single-channel reply thread.
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

  const listBody = document.getElementById('adminSupportListBody');
  const listEmpty = document.getElementById('adminSupportListEmpty');
  const threadEmpty = document.getElementById('adminSupportThreadEmpty');
  const threadActive = document.getElementById('adminSupportThreadActive');
  const shell = document.getElementById('adminSupportShell');
  const subjectEl = document.getElementById('adminSupportSubject');
  const metaEl = document.getElementById('adminSupportMeta');
  const bubbles = document.getElementById('adminSupportBubbles');
  const composer = document.getElementById('adminSupportComposer');
  const closeBtn = document.getElementById('adminSupportCloseBtn');
  const backBtn = document.getElementById('adminSupportBack');
  const newBadge = document.getElementById('supportNewBadge');
  if (!listBody) return; // section not on this page

  let threads = [];
  let profileMap = {};
  let active = null;

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  function customerName(userId) {
    const p = profileMap[userId];
    return (p && (p.business_name || p.full_name || p.email)) || 'Customer';
  }

  async function loadThreads() {
    const { data, error } = await window.sb
      .from('support_threads')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load support threads', error); return; }
    threads = data || [];

    const userIds = [...new Set(threads.map(t => t.user_id))];
    if (userIds.length) {
      const { data: profiles, error: profErr } = await window.sb
        .from('profiles')
        .select('id, business_name, full_name, email, role')
        .in('id', userIds);
      if (profErr) console.error('Ometong: failed to load customer profiles', profErr);
      profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }

    render();
    const unreadTotal = threads.reduce((sum, t) => sum + t.admin_unread_count, 0);
    if (newBadge) {
      newBadge.hidden = unreadTotal === 0;
      newBadge.textContent = unreadTotal > 9 ? '9+' : unreadTotal;
    }
  }

  function render() {
    if (!threads.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listBody.innerHTML = threads.map(t => `
      <button class="msg-row${active && active.id === t.id ? ' active' : ''}${t.status === 'closed' ? ' closed' : ''}" data-id="${t.id}">
        <div class="msg-row-top">
          <span class="msg-row-with">${esc(customerName(t.user_id))}</span>
          ${t.admin_unread_count > 0 ? `<span class="msg-row-badge">${t.admin_unread_count}</span>` : ''}
        </div>
        <span class="msg-row-subject">${esc(t.subject || 'Support request')}</span>
        <span class="msg-row-time">${timeAgo(t.last_message_at)} ago${t.status === 'closed' ? ' · closed' : ''}</span>
      </button>
    `).join('');
    listBody.querySelectorAll('.msg-row').forEach(row => {
      row.addEventListener('click', () => openThread(row.getAttribute('data-id')));
    });
  }

  async function openThread(id) {
    const t = threads.find(x => x.id === id);
    if (!t) return;
    active = t;
    shell.classList.add('thread-open');
    threadEmpty.hidden = true;
    threadActive.hidden = false;
    render();

    subjectEl.textContent = t.subject || 'Support request';
    const p = profileMap[t.user_id];
    metaEl.textContent = `${customerName(t.user_id)}${p && p.role ? ' · ' + p.role : ''}${p && p.email ? ' · ' + p.email : ''}`;
    closeBtn.textContent = t.status === 'closed' ? 'Reopen conversation' : 'Close conversation';

    bubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">Loading…</p>';
    const { data, error } = await window.sb
      .from('support_messages')
      .select('*')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: true });
    if (error) { console.error('Ometong: failed to load support messages', error); bubbles.innerHTML = ''; return; }

    renderBubbles(data || []);

    if (t.admin_unread_count > 0) {
      await window.sb.rpc('mark_support_thread_read', { p_thread_id: t.id, p_as_admin: true });
      t.admin_unread_count = 0;
      loadThreads();
    }
  }

  function renderBubbles(messages) {
    if (!messages.length) {
      bubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">No messages yet.</p>';
      return;
    }
    bubbles.innerHTML = messages.map(m => {
      const mine = m.sender_role === 'admin';
      const label = mine ? 'You' : customerName(active.user_id);
      return `
        <div class="msg-bubble-row ${mine ? 'mine' : 'admin'}">
          <div class="msg-bubble">
            ${esc(m.body)}
            <span class="msg-bubble-meta">${esc(label)} · ${timeAgo(m.created_at)} ago</span>
          </div>
        </div>
      `;
    }).join('');
    bubbles.scrollTop = bubbles.scrollHeight;
  }

  backBtn?.addEventListener('click', () => shell.classList.remove('thread-open'));

  closeBtn?.addEventListener('click', async () => {
    if (!active) return;
    const nextStatus = active.status === 'closed' ? 'open' : 'closed';
    const { error } = await window.sb.from('support_threads').update({ status: nextStatus }).eq('id', active.id);
    if (error) { console.error('Ometong: failed to update support thread status', error); return; }
    active.status = nextStatus;
    closeBtn.textContent = nextStatus === 'closed' ? 'Reopen conversation' : 'Close conversation';
    loadThreads();
  });

  composer?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!active) return;
    const textarea = composer.querySelector('textarea');
    const body = textarea.value.trim();
    if (!body) return;
    textarea.disabled = true;
    const { error } = await window.sb.from('support_messages').insert({
      thread_id: active.id,
      sender_id: adminId,
      sender_role: 'admin',
      body
    });
    textarea.disabled = false;
    if (error) { console.error('Ometong: failed to send support reply', error); return; }
    textarea.value = '';
    openThread(active.id);
    loadThreads();
  });
  composer?.querySelector('textarea').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      composer.requestSubmit();
    }
  });

  await loadThreads();
});
