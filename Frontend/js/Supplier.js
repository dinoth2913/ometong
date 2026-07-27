/* ==========================================================================
   Suppliers.js — Ometong (For Suppliers & Manufacturers page)
   Handles: shared site chrome (loader, scroll progress, nav/mobile menu,
   announcement bar, back-to-top, footer year, newsletter) plus page-specific
   behavior: animated stat counters, testimonial slider dots, FAQ accordion,
   and the supplier application (lead) form with client-side validation and
   localStorage persistence.
   ========================================================================== */

(function () {
  "use strict";

  var LEADS_STORAGE_KEY = "ometongSupplierLeads";
  var ANNOUNCE_STORAGE_KEY = "ometongSuppliersAnnounceDismissed";

  document.addEventListener("DOMContentLoaded", function () {
    initSharedChrome();
    initStatCounters();
    initTestimonialSlider();
    initFaqAccordion();
    initApplyForm();
  });

  /* ---------------------------------------------------------------------
     Shared site chrome
     --------------------------------------------------------------------- */
  function initSharedChrome() {
    var loader = document.getElementById("loader");
    window.addEventListener("load", function () {
      setTimeout(function () { if (loader) loader.classList.add("is-hidden"); }, 250);
    });
    if (document.readyState === "complete" && loader) {
      setTimeout(function () { loader.classList.add("is-hidden"); }, 250);
    }

    var progress = document.getElementById("scrollProgress");
    function updateProgress() {
      if (!progress) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progress.style.width = pct + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    var announce = document.getElementById("announce");
    var announceClose = document.getElementById("announceClose");
    if (announce && localStorage.getItem(ANNOUNCE_STORAGE_KEY) === "1") {
      announce.classList.add("is-hidden");
    }
    if (announceClose) {
      announceClose.addEventListener("click", function () {
        announce.classList.add("is-hidden");
        try { localStorage.setItem(ANNOUNCE_STORAGE_KEY, "1"); } catch (e) { /* ignore */ }
      });
    }

    var hamburger = document.getElementById("hamburger");
    var mobileMenu = document.getElementById("mobileMenu");
    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function () {
        mobileMenu.classList.toggle("is-open");
        hamburger.classList.toggle("is-active");
      });
    }

    var backTop = document.getElementById("backTop");
    if (backTop) {
      window.addEventListener("scroll", function () {
        if (window.scrollY > 400) backTop.classList.add("is-visible");
        else backTop.classList.remove("is-visible");
      }, { passive: true });
      backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var nlForm = document.querySelector(".nl-form");
    if (nlForm) {
      nlForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = nlForm.querySelector("input[type='email']");
        if (input && input.value) {
          input.value = "";
          input.placeholder = "Thanks — you're subscribed!";
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Animated stat counters (hero stat cards)
     --------------------------------------------------------------------- */
  function initStatCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    var animated = new WeakSet();

    function animateCounter(el) {
      if (animated.has(el)) return;
      animated.add(el);
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var duration = 1200;
      var start = null;

      function step(timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(eased * target).toLocaleString("en-US");
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString("en-US");
      }
      requestAnimationFrame(step);
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) animateCounter(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { observer.observe(el); });
    } else {
      counters.forEach(animateCounter); // fallback: animate immediately
    }
  }

  /* ---------------------------------------------------------------------
     Testimonial slider dots
     --------------------------------------------------------------------- */
  function initTestimonialSlider() {
    var track = document.getElementById("testiTrack");
    var dotsWrap = document.getElementById("testiDots");
    if (!track || !dotsWrap) return;

    var cards = track.querySelectorAll(".testi-card");
    dotsWrap.innerHTML = "";

    cards.forEach(function (card, i) {
      var dot = document.createElement("span");
      if (i === 0) dot.classList.add("is-active");
      dot.addEventListener("click", function () {
        card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      });
      dotsWrap.appendChild(dot);
    });

    var dots = dotsWrap.querySelectorAll("span");

    track.addEventListener("scroll", function () {
      var index = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------------------- */
  function initFaqAccordion() {
    var items = document.querySelectorAll("#faqList .faq-item");
    if (!items.length) return;

    items.forEach(function (item) {
      var question = item.querySelector(".faq-question");
      if (!question) return;
      question.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");

        // Close all others (single-open accordion behavior)
        items.forEach(function (other) {
          other.classList.remove("is-open");
          var otherQ = other.querySelector(".faq-question");
          if (otherQ) otherQ.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          item.classList.add("is-open");
          question.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Supplier application (lead) form
     --------------------------------------------------------------------- */
  function initApplyForm() {
    var form = document.getElementById("applyForm");
    var msgEl = document.getElementById("applyFormMsg");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearFieldErrors(form);

      var companyName = form.querySelector("#companyName");
      var contactEmail = form.querySelector("#contactEmail");
      var category = form.querySelector("#category");
      var details = form.querySelector("#details");

      var isValid = true;

      if (!companyName.value.trim()) {
        setFieldError(companyName, "Company name is required.");
        isValid = false;
      }
      if (!contactEmail.value.trim() || !isValidEmail(contactEmail.value.trim())) {
        setFieldError(contactEmail, "Enter a valid business email.");
        isValid = false;
      }
      if (!category.value) {
        setFieldError(category, "Please select a category.");
        isValid = false;
      }

      if (!isValid) {
        showFormMsg("Please fix the highlighted fields.", false);
        return;
      }

      var lead = {
        companyName: companyName.value.trim(),
        contactEmail: contactEmail.value.trim(),
        category: category.value,
        details: details.value.trim(),
        submittedAt: new Date().toISOString()
      };
      saveLead(lead);

      form.reset();
      showFormMsg("Application received! Our team will follow up by email within 2–3 business days.", true);
    });
  }

  function setFieldError(fieldEl, message) {
    var row = fieldEl.closest(".form-row");
    if (!row) return;
    row.classList.add("has-error");
    var errorEl = row.querySelector(".form-row-error");
    if (!errorEl) {
      errorEl = document.createElement("span");
      errorEl.className = "form-row-error";
      row.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".form-row.has-error").forEach(function (row) {
      row.classList.remove("has-error");
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function saveLead(lead) {
    var leads = [];
    try {
      var raw = localStorage.getItem(LEADS_STORAGE_KEY);
      if (raw) leads = JSON.parse(raw);
    } catch (e) { leads = []; }
    leads.push(lead);
    try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch (e) { /* storage unavailable */ }
  }

  function showFormMsg(message, success) {
    var msgEl = document.getElementById("applyFormMsg");
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.classList.toggle("is-success", !!success);
    msgEl.classList.toggle("is-error", !success);
  }

})();