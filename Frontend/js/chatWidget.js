/* =========================================================
   OMETONG — FLOATING CHAT WIDGET
   Self-injecting: include this one script tag on any page and it
   builds its own floating launcher + glass panel. No markup needed
   in the page itself.

   This is UI only, same as messages.html was — the assistant's
   replies below are canned/local, not a real AI or a real human on
   the other end yet. State (name given, conversation so far) is
   kept in sessionStorage so it survives navigating between pages
   in the same browser tab, instead of restarting the intro on
   every page load.
========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "ometongChatWidget";
  var LOGO = "../../images/smile-logo-icon.png";

  var QUICK_TOPICS = [
    { key: "supplier", label: "Find a supplier" },
    { key: "order", label: "Track my order" },
    { key: "product", label: "Ask about a product" },
    { key: "other", label: "Something else" }
  ];
  var TOPIC_REPLIES = {
    supplier: "Great — tell me what product or service you're sourcing and roughly what quantity, and I'll point you to verified suppliers in the marketplace.",
    order: "I can help with that. What's your order number, or the account email you ordered with?",
    product: "Sure — which product are you asking about? You can paste the listing name or link.",
    other: "No problem, go ahead and type your question below."
  };
  var GENERIC_REPLIES = [
    "Got it — let me look into that for you.",
    "Thanks for the details, I'll follow up shortly.",
    "That's a good question — a member of the team will confirm and get back to you.",
    "Understood, noting that down."
  ];

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { stage: "intro", name: null, history: [], open: false };
  }
  function saveState(state) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  var state = loadState();

  function escapeHTML(str) {
    return window.ometongEscapeHTML ? window.ometongEscapeHTML(str) : String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------------------------------------------------------------
     Build DOM
     --------------------------------------------------------------------- */
  var root = document.createElement("div");
  root.id = "ow-root";
  root.innerHTML =
    '<div class="ow-panel" id="owPanel">' +
      '<div class="ow-header">' +
        '<div class="ow-avatar"><img src="' + LOGO + '" alt="Ometong"></div>' +
        '<div class="ow-header-text">' +
          "<strong>Ometong Assistant</strong>" +
          '<span><span class="ow-header-status-dot"></span>Usually replies in a few minutes</span>' +
        "</div>" +
        '<button class="ow-header-close" id="owCloseBtn" aria-label="Close chat">&times;</button>' +
      "</div>" +
      '<div class="ow-body" id="owBody"></div>' +
      '<form class="ow-composer" id="owComposer" hidden>' +
        '<input type="text" id="owInput" placeholder="Type a message…" autocomplete="off">' +
        '<button type="submit" aria-label="Send">' +
          '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
        "</button>" +
      "</form>" +
    "</div>" +
    '<button class="ow-launcher" id="owLauncher" aria-label="Open chat">' +
      '<span class="ow-launcher-ring"></span>' +
      '<img src="' + LOGO + '" alt="" class="ow-launcher-chat-icon">' +
      '<svg class="ow-launcher-close-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.4"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
    "</button>";
  document.body.appendChild(root);

  var panel = document.getElementById("owPanel");
  var body = document.getElementById("owBody");
  var launcher = document.getElementById("owLauncher");
  var closeBtn = document.getElementById("owCloseBtn");
  var composer = document.getElementById("owComposer");
  var input = document.getElementById("owInput");

  /* ---------------------------------------------------------------------
     Rendering helpers
     --------------------------------------------------------------------- */
  function scrollToBottom() { body.scrollTop = body.scrollHeight; }

  function addBubble(from, text, opts) {
    opts = opts || {};
    var row = document.createElement("div");
    row.className = "ow-row " + from;
    if (opts.instant) {
      row.style.animation = "none";
      row.style.opacity = "1";
      row.style.transform = "none";
    }
    row.innerHTML = '<div class="ow-bubble">' + escapeHTML(text) + "</div>";
    body.appendChild(row);
    if (!opts.silent) {
      state.history.push({ from: from, type: "text", text: text });
      saveState(state);
    }
    scrollToBottom();
  }

  function addQuickReplies(topics, instant) {
    var wrap = document.createElement("div");
    wrap.className = "ow-quick-replies";
    if (instant) { wrap.style.animation = "none"; wrap.style.opacity = "1"; }
    wrap.innerHTML = topics.map(function (t) {
      return '<button type="button" class="ow-chip" data-topic="' + t.key + '">' + escapeHTML(t.label) + "</button>";
    }).join("");
    body.appendChild(wrap);
    wrap.querySelectorAll("[data-topic]").forEach(function (btn) {
      btn.addEventListener("click", function () { handleTopicPick(btn.dataset.topic, wrap); });
    });
    scrollToBottom();
    return wrap;
  }

  function addNameRow(instant) {
    var wrap = document.createElement("div");
    wrap.className = "ow-name-row";
    if (instant) { wrap.style.animation = "none"; wrap.style.opacity = "1"; }
    wrap.innerHTML =
      '<input type="text" id="owNameInput" placeholder="Your name" autocomplete="off">' +
      '<button type="button" id="owNameSubmit" aria-label="Submit name">' +
        '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
      "</button>";
    body.appendChild(wrap);
    var nameInput = wrap.querySelector("#owNameInput");
    var submit = wrap.querySelector("#owNameSubmit");

    var skipChipWrap = document.createElement("div");
    skipChipWrap.className = "ow-quick-replies";
    if (instant) { skipChipWrap.style.animation = "none"; skipChipWrap.style.opacity = "1"; }
    skipChipWrap.innerHTML = '<button type="button" class="ow-chip ow-chip-ghost" id="owSkipName">I\'d prefer not to say</button>';

    function submitName() {
      var val = nameInput.value.trim();
      finishNameCapture(val || null, wrap, skipChipWrap);
    }
    submit.addEventListener("click", submitName);
    nameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submitName(); } });
    body.appendChild(skipChipWrap);
    skipChipWrap.querySelector("#owSkipName").addEventListener("click", function () {
      finishNameCapture(null, wrap, skipChipWrap);
    });

    scrollToBottom();
    nameInput.focus();
  }

  function showTyping(callback, delay) {
    var typing = document.createElement("div");
    typing.className = "ow-row bot";
    typing.innerHTML = '<div class="ow-typing"><span></span><span></span><span></span></div>';
    body.appendChild(typing);
    scrollToBottom();
    setTimeout(function () {
      typing.remove();
      callback();
    }, delay || 900);
  }

  /* ---------------------------------------------------------------------
     Flow
     --------------------------------------------------------------------- */
  function finishNameCapture(name, nameRowEl, skipChipEl) {
    state.name = name;
    state.stage = "topics";
    saveState(state);
    nameRowEl.remove();
    if (skipChipEl) skipChipEl.remove();

    var greetName = name ? name.split(" ")[0] : "there";
    addBubble("bot", "Nice to meet you, " + greetName + "! 👋");
    showTyping(function () {
      addBubble("bot", "What would you like help with today?");
      addQuickReplies(QUICK_TOPICS);
    }, 900);
  }

  function handleTopicPick(key, chipsEl) {
    var topic = QUICK_TOPICS.find(function (t) { return t.key === key; });
    if (!topic) return;
    chipsEl.remove();
    addBubble("user", topic.label);
    showTyping(function () {
      addBubble("bot", TOPIC_REPLIES[key] || "Sure, go ahead.");
      enterChatMode();
    }, 1000);
  }

  function enterChatMode() {
    state.stage = "chat";
    saveState(state);
    composer.hidden = false;
    input.focus();
  }

  function startIntro() {
    addBubble("bot", "Hey there! 👋", { silent: false });
    showTyping(function () {
      addBubble("bot", "I'm the Ometong Assistant.");
      showTyping(function () {
        addBubble("bot", "What should I call you?");
        state.stage = "name";
        saveState(state);
        addNameRow();
      }, 800);
    }, 900);
  }

  function rehydrate() {
    // Replay saved history instantly (no stagger) so switching pages
    // doesn't feel like the conversation restarted.
    state.history.forEach(function (m) {
      addBubble(m.from, m.text, { instant: true, silent: true });
    });
    if (state.stage === "name") {
      addNameRow(true);
    } else if (state.stage === "topics") {
      addQuickReplies(QUICK_TOPICS, true);
    } else if (state.stage === "chat") {
      composer.hidden = false;
    }
  }

  /* ---------------------------------------------------------------------
     Open / close
     --------------------------------------------------------------------- */
  function setOpen(isOpen) {
    root.classList.toggle("open", isOpen);
    state.open = isOpen;
    saveState(state);
    if (isOpen && state.stage === "intro" && state.history.length === 0) {
      startIntro();
    }
  }

  launcher.addEventListener("click", function () { setOpen(!root.classList.contains("open")); });
  closeBtn.addEventListener("click", function () { setOpen(false); });

  composer.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    addBubble("user", text);
    input.value = "";
    showTyping(function () {
      addBubble("bot", GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)]);
    }, 1000 + Math.random() * 600);
  });

  /* ---------------------------------------------------------------------
     Init — rehydrate any existing conversation from this browser tab's
     session, and reopen the panel if it was left open on the last page.
     --------------------------------------------------------------------- */
  if (state.history.length > 0 || state.stage !== "intro") {
    rehydrate();
  }
  if (state.open) {
    root.classList.add("open");
  }
})();
