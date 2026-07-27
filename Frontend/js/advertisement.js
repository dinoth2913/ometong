/* =========================================================
   OMETONG — ADVERTISE PAGE SCRIPT
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

  /* ---------- Plan selector ---------- */
  const planCards = document.querySelectorAll('.plan-card');
  const selectedPlanName = document.getElementById('selectedPlanName');
  const selectedPlanPrice = document.getElementById('selectedPlanPrice');
  const planLabels = {
    spotlight: 'Category Spotlight',
    featured: 'Featured Listing',
    banner: 'Homepage Banner',
  };
  const planPriceSuffix = {
    spotlight: ' / listing',
    featured: ' / month',
    banner: ' / month',
  };

  function selectPlan(card) {
    planCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const key = card.dataset.plan;
    if (selectedPlanName) selectedPlanName.textContent = planLabels[key] || card.querySelector('h4').textContent;
    if (selectedPlanPrice) selectedPlanPrice.textContent = (card.dataset.price || '') + (planPriceSuffix[key] || '');
  }

  planCards.forEach(card => {
    card.addEventListener('click', () => selectPlan(card));
    card.querySelector('.plan-select-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectPlan(card);
      document.getElementById('ad-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Default to the "featured" plan on load, matching the pre-filled banner text
  const defaultPlan = document.querySelector('.plan-card[data-plan="featured"]');
  if (defaultPlan) selectPlan(defaultPlan);

  /* ---------- File upload preview ---------- */
  const fileDrop = document.getElementById('fileDrop');
  const adImageInput = document.getElementById('adImageInput');
  const fileNameEl = document.getElementById('fileName');

  adImageInput?.addEventListener('change', () => {
    const file = adImageInput.files && adImageInput.files[0];
    fileNameEl.textContent = file ? file.name : '';
  });
  ['dragenter', 'dragover'].forEach(evt => {
    fileDrop?.addEventListener(evt, (e) => { e.preventDefault(); fileDrop.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    fileDrop?.addEventListener(evt, (e) => { e.preventDefault(); fileDrop.classList.remove('drag'); });
  });
  fileDrop?.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files && e.dataTransfer.files[0];
    if (file) {
      adImageInput.files = e.dataTransfer.files;
      fileNameEl.textContent = file.name;
    }
  });

  /* ---------- Ad form submit ---------- */
  const adForm = document.getElementById('adForm');
  const adFormSuccess = document.getElementById('adFormSuccess');
  const submitAdBtn = document.getElementById('submitAdBtn');

  adForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitAdBtn.querySelector('span').textContent = 'Submitting…';
    submitAdBtn.disabled = true;

    setTimeout(() => {
      adForm.style.display = 'none';
      adFormSuccess.classList.add('show');
    }, 700);
  });

  document.getElementById('submitAnotherAd')?.addEventListener('click', () => {
    adFormSuccess.classList.remove('show');
    adForm.reset();
    adForm.style.display = 'flex';
    submitAdBtn.querySelector('span').textContent = 'Submit for Review';
    submitAdBtn.disabled = false;
    fileNameEl.textContent = '';
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
