/* =========================================================
   OMETONG — HOME PAGE SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Loader ----------
     .hide fades it out via opacity/visibility, but that leaves the
     full-viewport element sitting in the layout with pointer-events
     still live — if that transition ever fails to apply (theme
     timing, reduced-motion, etc.) a fragment of it, e.g. the corner
     of the spinner ring, can be left visible/clickable indefinitely.
     Removing it outright once it's faded out is the only way to
     guarantee it's gone for good. */
  const loader = document.getElementById('loader');
  function hideLoader() {
    if (!loader) return;
    loader.classList.add('hide');
    loader.style.pointerEvents = 'none';
    setTimeout(() => loader.remove(), 650);
  }
  window.addEventListener('load', () => setTimeout(hideLoader, 300));
  setTimeout(hideLoader, 2200);

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

  /* ---------- Homepage ad banner ----------
     The most premium of the three ad plans (advertisement.html's
     "Homepage Banner") — seen by every visitor whether or not
     they're actively searching yet, which is exactly why it costs
     more than the marketplace-only placements. Stays hidden
     entirely when no ad is currently active, and rotates through
     more than one if several suppliers have an active banner at the
     same time. */
  (async () => {
    if (!window.ometongAds) return;
    const ads = await window.ometongAds.fetchAds('banner', { limit: 5 });
    if (!ads.length) return;

    const zone = document.getElementById('adBannerZone');
    const banner = document.getElementById('adBanner');
    if (!zone || !banner) return;
    const esc = window.ometongEscapeHTML || (s => String(s));

    let i = 0;
    function renderAd() {
      const ad = ads[i];
      banner.innerHTML = `
        <a class="ad-banner-link" href="${esc(ad.link || '#')}" target="_blank" rel="noopener" data-ad="${ad.id}">
          <div class="ad-banner-media" style="${ad.image_url ? `background-image:url('${esc(ad.image_url)}')` : 'background:linear-gradient(135deg,var(--accent),var(--accent-dark))'}"></div>
          <div class="ad-banner-copy">
            <span class="ad-banner-tag">Sponsored</span>
            <strong>${esc(ad.product_name)}</strong>
            <span>${esc(ad.business_name)}</span>
          </div>
        </a>`;
      window.ometongAds.trackImpression(ad.id);
      banner.querySelector('[data-ad]')?.addEventListener('click', () => window.ometongAds.trackClick(ad.id));
    }

    zone.hidden = false;
    renderAd();
    if (ads.length > 1) {
      setInterval(() => { i = (i + 1) % ads.length; renderAd(); }, 7000);
    }
  })();

});
