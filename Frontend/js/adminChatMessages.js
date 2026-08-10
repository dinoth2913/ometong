/* =========================================================
   OMETONG — ADMIN: LIVE CHAT MESSAGES
   Reads public.chat_conversations / chat_messages (chat_schema.sql)
   — written to by chatWidget.js on every page for both guests
   (user_id null) and logged-in visitors (user_id set). RLS already
   restricted reading these to admins; this was simply never
   connected to any UI before now. Read-only transcript viewer —
   the widget itself has no live polling for a staff reply, so this
   doesn't add a reply box (that would need chatWidget.js changes
   too, out of scope for "make these visible to admin").
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

  const listBody = document.getElementById('chatMsgListBody');
  const listEmpty = document.getElementById('chatMsgListEmpty');
  const threadEmpty = document.getElementById('chatMsgThreadEmpty');
  const threadActive = document.getElementById('chatMsgThreadActive');
  const shell = document.getElementById('chatMsgShell');
  const visitorEl = document.getElementById('chatMsgVisitor');
  const metaEl = document.getElementById('chatMsgMeta');
  const bubbles = document.getElementById('chatMsgBubbles');
  const backBtn = document.getElementById('chatMsgBack');
  if (!listBody) return; // section not on this page

  const SENDER_LABEL = { user: 'Visitor', bot: 'Ometong AI', agent: 'Staff' };

  let conversations = [];
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

  function visitorLabel(conv) {
    if (conv.visitor_name) return conv.visitor_name;
    if (conv.user_id) {
      const p = profileMap[conv.user_id];
      if (p) return p.business_name || p.full_name || p.email || 'Logged-in visitor';
      return 'Logged-in visitor';
    }
    return 'Guest';
  }

  async function loadConversations() {
    const { data, error } = await window.sb
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(100);
    if (error) { console.error('Ometong: failed to load chat conversations', error); return; }
    conversations = data || [];

    const userIds = [...new Set(conversations.map(c => c.user_id).filter(Boolean))];
    if (userIds.length) {
      const { data: profiles, error: profErr } = await window.sb
        .from('profiles')
        .select('id, business_name, full_name, email')
        .in('id', userIds);
      if (profErr) console.error('Ometong: failed to load visitor profiles', profErr);
      profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    render();
  }

  function render() {
    if (!conversations.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listBody.innerHTML = conversations.map(c => `
      <button class="msg-row${active && active.id === c.id ? ' active' : ''}" data-id="${c.id}">
        <div class="msg-row-top">
          <span class="msg-row-with">${esc(visitorLabel(c))}</span>
          ${c.user_id ? '<span class="msg-row-badge" style="background:var(--blue);">Logged in</span>' : ''}
        </div>
        <span class="msg-row-subject">${esc(c.first_page_url || 'Chat widget')}</span>
        <span class="msg-row-time">${timeAgo(c.last_message_at)} ago</span>
      </button>
    `).join('');
    listBody.querySelectorAll('.msg-row').forEach(row => {
      row.addEventListener('click', () => openConversation(row.getAttribute('data-id')));
    });
  }

  async function openConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    active = conv;
    shell.classList.add('thread-open');
    threadEmpty.hidden = true;
    threadActive.hidden = false;
    render();

    visitorEl.textContent = visitorLabel(conv);
    metaEl.textContent = `${conv.user_id ? 'Logged in' : 'Guest'} · started ${timeAgo(conv.created_at)} ago · ${esc(conv.first_page_url || 'unknown page')}`;

    bubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">Loading…</p>';
    const { data, error } = await window.sb
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    if (error) { console.error('Ometong: failed to load chat messages', error); bubbles.innerHTML = ''; return; }

    renderBubbles(data || []);
  }

  function renderBubbles(messages) {
    if (!messages.length) {
      bubbles.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">No messages in this conversation.</p>';
      return;
    }
    bubbles.innerHTML = messages.map(m => {
      const isVisitor = m.sender === 'user';
      return `
        <div class="msg-bubble-row ${isVisitor ? 'mine' : 'admin'}">
          <div class="msg-bubble">
            ${esc(m.body)}
            <span class="msg-bubble-meta">${SENDER_LABEL[m.sender] || m.sender} · ${timeAgo(m.created_at)} ago</span>
          </div>
        </div>
      `;
    }).join('');
    bubbles.scrollTop = bubbles.scrollHeight;
  }

  backBtn?.addEventListener('click', () => shell.classList.remove('thread-open'));

  await loadConversations();
});
