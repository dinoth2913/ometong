/* =========================================================
   OMETONG — FLOATING CHAT WIDGET
   Self-injecting: include this one script tag on any page and it
   builds its own floating launcher + glass panel. No markup needed
   in the page itself.

   The assistant's replies are still canned — there is no real AI or
   human on the other end yet. What IS real now is storage: every
   message is written to Supabase (chat_conversations / chat_messages)
   so conversations can be read back later for support follow-up and
   as training data.

   Because that means storing real customer conversations, the panel
   carries a short disclosure line. That still needs backing up with
   a privacy policy before going live for real customers.

   Storage split:
   - sessionStorage keeps the on-screen conversation, so navigating
     between pages doesn't restart the intro.
   - localStorage keeps the session/conversation id, so a returning
     visitor keeps writing to the same server-side thread.
   Saving is best-effort: if Supabase isn't configured or the insert
   fails, the widget carries on working and just doesn't persist.
========================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "ometongChatWidget";
  var SESSION_KEY = "ometongChatSession";
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

  /* ---------------------------------------------------------------------
     FAQ auto-answers — the most common things a buyer or supplier
     actually asks, matched by keyword against whatever they type once
     they're in free-chat mode. Every answer describes a real feature
     that exists on the platform today (escrow, RFQs, saved addresses,
     bulk pricing tiers, verification, etc.) — nothing invented. Falls
     back to a GENERIC_REPLIES pick when nothing matches, same as
     before this was added.
     --------------------------------------------------------------------- */
  var FAQ_INTENTS = [
    {
      keywords: ["escrow", "is my payment safe", "payment protect", "is it safe to pay", "money safe", "payment secure"],
      reply: "Your payment is held securely in escrow and only released to the seller once you confirm the order has actually been delivered — so you're never paying into thin air."
    },
    {
      keywords: ["verified supplier", "how do i know", "is the supplier real", "trust the seller", "genuine supplier", "is this a scam"],
      reply: "Every supplier and manufacturer goes through a verification check — business license, export license or similar documents reviewed by our team — before they get a Verified badge. You can also check their rating and reviews from other buyers on their listings."
    },
    {
      keywords: ["moq", "minimum order", "minimum quantity"],
      reply: "MOQ (minimum order quantity) is shown right on each listing, and you can filter marketplace search by \"Max MOQ\" to only see listings you can actually meet the minimum for."
    },
    {
      keywords: ["which countries", "do you ship to", "ship internationally", "countries do you", "where do you deliver"],
      reply: "We ship from Guangzhou, China to the United States, Canada, Europe, Sri Lanka and India — door to door, with customs handled on our side."
    },
    {
      keywords: ["how long", "delivery time", "shipping time", "how many days", "when will it arrive"],
      reply: "Delivery time depends on the product, supplier location and your destination — each order shows an estimated delivery date once it's placed, and you can track it stage-by-stage from your dashboard."
    },
    {
      keywords: ["track my order", "track order", "where is my order", "order status"],
      reply: "You can track any order stage-by-stage from your dashboard — go to \"Recent orders\" and click \"Track\" on the order you're asking about."
    },
    {
      keywords: ["refund", "return", "money back", "wrong item", "damaged", "item arrived broken"],
      reply: "If something's wrong with an order, open it from your dashboard and click \"Track\" — there's a \"Request a refund\" option right there once the order's been placed, and our team reviews every request."
    },
    {
      keywords: ["become a supplier", "sell on ometong", "how do i sell", "start selling", "list my product", "list a product"],
      reply: "You can apply as a supplier or manufacturer from our \"For Suppliers\" page — once your account's approved, you can list products or services and start getting matched with buyer requests."
    },
    {
      keywords: ["any fees", "extra charges", "hidden fee", "does it cost", "buyer fee"],
      reply: "Buying on Ometong doesn't add any platform fee on top — you pay the listed price, shipping, and any customs duties your country applies on import."
    },
    {
      keywords: ["contact the supplier", "message the supplier", "talk to seller", "supplier phone number", "supplier email", "contact seller directly"],
      reply: "For everyone's protection, buyers and suppliers don't message each other directly on Ometong — you can send an inquiry from any product page and our team relays what's needed between both sides."
    },
    {
      keywords: ["rfq", "request a quote", "get a quote", "quotation", "request for quotation"],
      reply: "You can post a request for quotation (RFQ) from your dashboard describing what you need — verified suppliers can then send you quotes, which our team reviews before they reach you."
    },
    {
      keywords: ["bulk price", "wholesale price", "bulk discount", "tier pricing", "buy in bulk"],
      reply: "Many listings offer bulk pricing tiers — the price per unit drops automatically at higher quantities, shown right on the product page."
    },
    {
      keywords: ["forgot password", "can't log in", "cannot login", "reset password", "can't login"],
      reply: "No problem — on the login page, click \"Forgot password?\" and we'll email you a link to set a new one."
    },
    {
      keywords: ["advertise", "advertising cost", "promote my product", "featured listing", "homepage banner"],
      reply: "We have three ad placements: a free Category Spotlight (7-day rotation), a Featured Listing badge for $49/month, and a Homepage Banner for $149/month — you can submit a request right from your dashboard's Advertising section."
    },
    {
      keywords: ["talk to a human", "speak to someone", "contact support", "real person", "speak with support"],
      reply: "Of course — if you're logged in, go to Messages → \"Ometong Support\" to message our team directly, or use the Contact Us page if you're not signed in yet."
    },
    {
      keywords: ["what payment methods", "how do i pay", "credit card", "accept paypal", "payment options"],
      reply: "You place your order and pay through checkout, and the payment sits in escrow until delivery is confirmed. Our team handles the payment step directly with you if anything needs confirming."
    },
    {
      keywords: ["cancel my order", "cancel order", "cancel an order"],
      reply: "If your order hasn't shipped yet, reach out through Messages → Ometong Support (or Contact Us) with your order number and we'll help you cancel it."
    },
    {
      keywords: ["what documents", "verification documents", "business license", "kyb", "how to get verified"],
      reply: "To get your Verified badge, upload a business license, export license, tax certificate or ID document from your dashboard's Business Verification section — our team reviews it, usually within 2–3 days."
    },
    {
      keywords: ["customs", "import duty", "import tax", "duties"],
      reply: "Import duties and customs fees depend on your destination country and are usually collected on delivery — we'll show a general note about this at checkout based on where you're shipping to."
    },
    {
      keywords: ["who are you", "where are you based", "about ometong", "company info", "who runs this"],
      reply: "Ometong is operated by Guangzhou Ometong International Trade Co., Ltd. — you can read more about us and the team on our About Us page."
    }
  ];

  function findFaqReply(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < FAQ_INTENTS.length; i++) {
      var intent = FAQ_INTENTS[i];
      for (var j = 0; j < intent.keywords.length; j++) {
        if (lower.indexOf(intent.keywords[j]) !== -1) return intent.reply;
      }
    }
    return null;
  }

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

  /* ---------------------------------------------------------------------
     Persistence (best-effort — never blocks or breaks the UI)
     --------------------------------------------------------------------- */
  function getSessionId() {
    try {
      var id = localStorage.getItem(SESSION_KEY);
      if (id) return id;
      id = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : "s-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (e) {
      // private mode / storage blocked — chat still works, just won't persist
      return null;
    }
  }

  var sessionId = getSessionId();
  var conversationId = null;
  var conversationPromise = null;

  // Creates the conversation row once, lazily, on the first message.
  // Everything funnels through the same promise so parallel sends
  // can't race and create duplicate conversations.
  function ensureConversation() {
    if (conversationPromise) return conversationPromise;
    if (!window.sb || !sessionId) return Promise.resolve(null);

    conversationPromise = (async function () {
      try {
        var user = window.ometongGetUser ? await window.ometongGetUser() : null;
        var { data, error } = await window.sb
          .from("chat_conversations")
          .upsert({
            session_id: sessionId,
            user_id: user ? user.id : null,
            visitor_name: state.name || null,
            first_page_url: location.pathname
          }, { onConflict: "session_id" })
          .select("id")
          .single();
        if (error) { console.warn("Ometong chat: could not open conversation", error.message); return null; }
        conversationId = data.id;
        return conversationId;
      } catch (e) {
        console.warn("Ometong chat: could not open conversation", e);
        return null;
      }
    })();

    return conversationPromise;
  }

  async function persistMessage(sender, body) {
    if (!window.sb || !sessionId) return;
    try {
      var convId = conversationId || await ensureConversation();
      if (!convId) return;
      await window.sb.from("chat_messages").insert({
        conversation_id: convId,
        sender: sender,
        body: body,
        page_url: location.pathname
      });
    } catch (e) {
      console.warn("Ometong chat: could not save message", e);
    }
  }

  // Attach the visitor's name (and their user id, if they're logged in)
  // to the conversation once we know it.
  async function persistVisitorName(name) {
    if (!window.sb || !sessionId) return;
    try {
      var convId = conversationId || await ensureConversation();
      if (!convId) return;
      var user = window.ometongGetUser ? await window.ometongGetUser() : null;
      await window.sb
        .from("chat_conversations")
        .update({ visitor_name: name || null, user_id: user ? user.id : null })
        .eq("id", convId);
    } catch (e) {
      console.warn("Ometong chat: could not save name", e);
    }
  }

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
      '<p class="ow-disclosure" id="owDisclosure">Chats are saved and may be reviewed to improve our service. Please don’t share passwords or card details.</p>' +
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
      // silent:true means we're replaying saved history on a new page,
      // so only genuinely new messages get written to the server.
      persistMessage(from, text);
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
    persistVisitorName(name);
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
    var faqReply = findFaqReply(text);
    showTyping(function () {
      addBubble("bot", faqReply || GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)]);
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
