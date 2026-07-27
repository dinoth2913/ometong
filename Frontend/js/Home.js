/* =========================================================
   OMETONG — HOME PAGE SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Loader ---------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => setTimeout(() => loader?.classList.add('hide'), 300));
  setTimeout(() => loader?.classList.add('hide'), 2200);

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Announcement bar ---------- */
  document.getElementById('announceClose')?.addEventListener('click', () => {
    document.getElementById('announce').classList.add('is-hidden');
    document.getElementById('announce').style.maxHeight = '0px';
    document.getElementById('announce').style.padding = '0px';
    document.getElementById('announce').style.opacity = '0';
    document.getElementById('announce').style.overflow = 'hidden';
  });

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
    backTop?.classList.toggle('show', top > 600);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Sliding liquid-glass nav indicator ---------- */
  const navLinksWrap = document.getElementById('navLinks');
  const navIndicator = document.getElementById('navIndicator');

  if (navLinksWrap && navIndicator) {
    const navItems = [...navLinksWrap.querySelectorAll('a')];

    function moveIndicatorTo(el) {
      const wrapRect = navLinksWrap.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const left = elRect.left - wrapRect.left;
      navIndicator.style.width = elRect.width + 'px';
      navIndicator.style.transform = `translate(${left}px, -50%)`;
      navIndicator.classList.add('is-active');
    }

    navItems.forEach(item => {
      item.addEventListener('mouseenter', () => moveIndicatorTo(item));
      item.addEventListener('focus', () => moveIndicatorTo(item));
    });

    navLinksWrap.addEventListener('mouseleave', () => {
      navIndicator.classList.remove('is-active');
    });
    navLinksWrap.addEventListener('focusout', (e) => {
      if (!navLinksWrap.contains(e.relatedTarget)) {
        navIndicator.classList.remove('is-active');
      }
    });
  }

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
    el.style.transitionDelay = (i % 5) * 70 + 'ms';
    revealObserver.observe(el);
  });

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll('.stat-num');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10) || 0;
      const duration = 1700;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString();
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObserver.observe(el));

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.16}px, ${y * 0.28}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

  /* ---------- Hero orbit parallax ---------- */
  const orbitStage = document.getElementById('orbitStage');
  const heroVisual = document.querySelector('.hero-visual');
  if (orbitStage && heroVisual && window.matchMedia('(min-width: 1081px)').matches) {
    heroVisual.addEventListener('mousemove', (e) => {
      const r = heroVisual.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      orbitStage.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    });
    heroVisual.addEventListener('mouseleave', () => {
      orbitStage.style.transform = 'rotateY(0) rotateX(0)';
    });
  }

  /* ---------- Hero search -> marketplace ---------- */
  function goSearch(term) {
    const q = encodeURIComponent(term || '');
    window.location.href = 'marketplace.html' + (q ? `?q=${q}` : '');
  }
  document.getElementById('heroSearchBtn')?.addEventListener('click', () => {
    goSearch(document.getElementById('heroSearch').value.trim());
  });
  document.getElementById('heroSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') goSearch(e.target.value.trim());
  });
  document.querySelectorAll('.hero-suggest button').forEach(btn => {
    btn.addEventListener('click', () => goSearch(btn.textContent));
  });

  /* ---------- Testimonial slider ---------- */
  const testiTrack = document.getElementById('testiTrack');
  const testiDotsWrap = document.getElementById('testiDots');
  if (testiTrack) {
    const cards = testiTrack.children;
    let idx = 0;
    for (let i = 0; i < cards.length; i++) {
      const dot = document.createElement('button');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goTo(i));
      testiDotsWrap.appendChild(dot);
    }
    function goTo(i) {
      idx = i;
      testiTrack.style.transform = `translateX(-${i * 100}%)`;
      [...testiDotsWrap.children].forEach((d, di) => d.classList.toggle('active', di === i));
    }
    setInterval(() => goTo((idx + 1) % cards.length), 5500);
  }

});
