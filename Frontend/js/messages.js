/* =========================================================
   OMETONG — MESSAGES (UI ONLY)
   This is the interface layer only — conversations and messages
   below are local demo data to show the design and animations.
   Nothing here is saved anywhere or sent to another real user yet;
   that's the backend piece to build next (a messages/conversations
   table + realtime, per the plan to do UI first).
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Back to dashboard ---------- */
  const backBtn = document.getElementById('backToDashboard');
  backBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (document.referrer && document.referrer.includes(location.host)) history.back();
    else window.location.href = 'Home.html';
  });

  /* ---------- Demo data ---------- */
  const conversations = [
    {
      id: 'c1',
      name: 'Horizon Supply Co.',
      initials: 'HS',
      listing: 'Woven Poly Bags',
      online: true,
      messages: [
        { from: 'them', text: "Hi! Thanks for your interest in the Woven Poly Bags listing.", time: '9:02 AM' },
        { from: 'them', text: "Our MOQ is 500 units, but we can do a sample run of 20 first if you'd like to check quality.", time: '9:03 AM' },
        { from: 'me', text: "That'd be great. What's the lead time on the sample?", time: '9:10 AM' },
        { from: 'them', text: "Usually 3–4 business days once payment for the sample clears.", time: '9:12 AM' },
      ]
    },
    {
      id: 'c2',
      name: 'Ceylon Traders Ltd',
      initials: 'CT',
      listing: 'Ceylon Cinnamon Bulk',
      online: false,
      unread: 2,
      messages: [
        { from: 'them', text: "We can offer $58/unit for orders above 200kg.", time: 'Yesterday' },
        { from: 'them', text: "Let us know if that works for your budget.", time: 'Yesterday' },
      ]
    },
    {
      id: 'c3',
      name: 'Guangzhou Precision Mfg.',
      initials: 'GP',
      listing: 'CNC Spindle Unit',
      online: true,
      messages: [
        { from: 'me', text: "Can you share the datasheet for the spindle unit?", time: 'Mon' },
        { from: 'them', text: "Sure, sending it over shortly.", time: 'Mon' },
        { from: 'them', text: "Here you go — let me know if you have questions.", time: 'Mon' },
      ]
    },
    {
      id: 'c4',
      name: 'Island Manufacturing',
      initials: 'IM',
      listing: 'Custom Packaging Boxes',
      online: false,
      messages: [
        { from: 'them', text: "Order confirmed — production starts Monday.", time: 'Last week' },
      ]
    },
  ];

  const AUTO_REPLIES = [
    "Thanks for the message — let me check and get back to you shortly.",
    "Good question, give me a moment to confirm with the team.",
    "Sounds good, I'll prepare that for you.",
    "Yes, that should be possible — I'll send details soon."
  ];

  let activeId = null;

  /* ---------- Sidebar rendering ---------- */
  const convList = document.getElementById('msgConvList');
  const searchInput = document.getElementById('msgSearchInput');

  function renderConvList(filter = '') {
    const q = filter.trim().toLowerCase();
    const filtered = conversations.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.listing.toLowerCase().includes(q)
    );

    convList.innerHTML = filtered.map((c, i) => {
      const last = c.messages[c.messages.length - 1];
      return `
        <div class="msg-conv${c.id === activeId ? ' active' : ''}${c.unread ? ' unread' : ''}" data-conv="${c.id}" style="animation-delay:${i * 55}ms">
          <div class="msg-avatar">${c.initials}${c.online ? '<span class="msg-online-dot pulse"></span>' : ''}</div>
          <div class="msg-conv-body">
            <div class="msg-conv-top">
              <span class="msg-conv-name">${c.name}</span>
              <span class="msg-conv-time">${last.time}</span>
            </div>
            <div class="msg-conv-preview">${last.from === 'me' ? 'You: ' : ''}${last.text}</div>
          </div>
          ${c.unread ? `<span class="msg-unread-badge">${c.unread}</span>` : ''}
        </div>`;
    }).join('');

    convList.querySelectorAll('[data-conv]').forEach(el => {
      el.addEventListener('click', () => openConversation(el.dataset.conv));
    });
  }
  renderConvList();

  searchInput?.addEventListener('input', () => renderConvList(searchInput.value));

  /* ---------- Thread rendering ---------- */
  const msgShell = document.getElementById('msgShell');
  const threadEmpty = document.getElementById('msgThreadEmpty');
  const threadActive = document.getElementById('msgThreadActive');
  const threadAvatar = document.getElementById('msgThreadAvatar');
  const threadName = document.getElementById('msgThreadName');
  const threadListing = document.getElementById('msgThreadListing');
  const bubblesEl = document.getElementById('msgBubbles');
  const typingEl = document.getElementById('msgTyping');
  const typingAvatar = document.getElementById('msgTypingAvatar');
  const composer = document.getElementById('msgComposer');
  const input = document.getElementById('msgInput');
  const sendBtn = document.getElementById('msgSendBtn');
  const backToListBtn = document.getElementById('msgBackBtn');

  function findConv(id) { return conversations.find(c => c.id === id); }

  function renderBubbles(conv) {
    bubblesEl.innerHTML = '<div class="msg-day-divider">Today</div>' + conv.messages.map((m, i) => `
      <div class="msg-row ${m.from}" style="animation-delay:${Math.min(i, 8) * 45}ms">
        <div class="msg-bubble">${escapeHTML(m.text)}<span class="msg-bubble-time">${m.time}</span></div>
      </div>
    `).join('');
    bubblesEl.scrollTop = bubblesEl.scrollHeight;
  }

  function openConversation(id) {
    const conv = findConv(id);
    if (!conv) return;
    activeId = id;
    conv.unread = 0;

    threadEmpty.hidden = true;
    threadActive.hidden = false;
    threadAvatar.textContent = conv.initials;
    threadName.textContent = conv.name;
    threadListing.textContent = `View listing: ${conv.listing} →`;
    typingAvatar.textContent = conv.initials;
    document.getElementById('msgThreadStatus').innerHTML = conv.online
      ? '<span class="msg-status-dot"></span>Online'
      : 'Offline';

    renderBubbles(conv);
    renderConvList(searchInput ? searchInput.value : '');
    msgShell.classList.add('thread-open');
    input?.focus();
  }

  backToListBtn?.addEventListener('click', () => {
    msgShell.classList.remove('thread-open');
  });

  /* ---------- Composer ---------- */
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  composer?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !activeId) return;
    const conv = findConv(activeId);

    conv.messages.push({ from: 'me', text, time: nowLabel() });
    renderBubbles(conv);
    renderConvList(searchInput ? searchInput.value : '');

    input.value = '';
    input.style.height = 'auto';
    sendBtn.classList.remove('sent');
    void sendBtn.offsetWidth; // restart animation
    sendBtn.classList.add('sent');

    // Demo-only simulated reply so the typing indicator/animation has
    // something to show — replace with real realtime messages later.
    typingEl.hidden = false;
    bubblesEl.scrollTop = bubblesEl.scrollHeight;
    setTimeout(() => {
      typingEl.hidden = true;
      conv.messages.push({
        from: 'them',
        text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
        time: nowLabel()
      });
      renderBubbles(conv);
      renderConvList(searchInput ? searchInput.value : '');
    }, 1600);
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      composer.requestSubmit();
    }
  });

  /* ---------- Utilities ---------- */
  function nowLabel() {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  function escapeHTML(str) {
    return window.ometongEscapeHTML ? window.ometongEscapeHTML(str) : String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- Open the first conversation by default on wide screens ---------- */
  if (window.matchMedia('(min-width: 861px)').matches && conversations.length) {
    openConversation(conversations[0].id);
  }

});
