/* =========================================================
   OMEGO MARKET — CONTACT US SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Scroll progress + nav + back-to-top ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('mainNav');
  const backTop = document.getElementById('backTop');

  function onScroll() {
    const top = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (top / docHeight) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    nav?.classList.toggle('scrolled', top > 40);
    backTop?.classList.toggle('show', top > 500);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 60 + 'ms';
    revealObserver.observe(el);
  });

  /* ---------- Route cards (adjust form subject/tag) ---------- */
  const routeCards = document.querySelectorAll('.route-card');
  const routeTag = document.getElementById('routeTag');
  const subjectInput = document.querySelector('input[name="subject"]');
  const routeLabels = {
    general: 'General Enquiry',
    sales: 'Sales',
    support: 'Support',
    partner: 'Become a Supplier',
  };

  routeCards.forEach(card => {
    card.addEventListener('click', () => {
      routeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const label = routeLabels[card.dataset.route] || 'General Enquiry';
      routeTag.textContent = label;
      if (subjectInput && !subjectInput.value) subjectInput.placeholder = `Regarding: ${label}`;
    });
  });

  /* ---------- Contact form submit ---------- */
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');
  const sendBtn = document.getElementById('sendBtn');

  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendBtn.querySelector('span').textContent = 'Sending…';
    sendBtn.disabled = true;

    setTimeout(() => {
      contactForm.style.display = 'none';
      formSuccess.classList.add('show');
    }, 700);
  });

  document.getElementById('sendAnother')?.addEventListener('click', () => {
    formSuccess.classList.remove('show');
    contactForm.reset();
    contactForm.style.display = 'flex';
    sendBtn.querySelector('span').textContent = 'Send Message';
    sendBtn.disabled = false;
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.acc-head').forEach(head => {
    head.addEventListener('click', () => {
      const item = head.closest('.acc-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

});