/* =========================================================
   OMETONG — ENTRY LOADING SPLASH LOGIC
   Drives index.html at the repo root — the actual first thing a
   visitor hits at ometong.vercel.app (no vercel.json rewrite exists,
   so the host's default "serve index.html at /" applies).

   The whole point of a loading splash is to smooth over a slow
   connection — showing one when the connection is already fast just
   adds a pointless delay. So:
     - If this tiny page itself arrived quickly, skip the animation
       completely and go straight to the real homepage.
     - Otherwise, play the branded loading animation while actually
       fetching the homepage in the background, and only navigate
       once it's genuinely ready (not on a fixed fake timer).
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const DEST = 'Frontend/html/Home.html';
  const FAST_THRESHOLD_MS = 400; // below this, a splash would only slow the visitor down

  const screen = document.getElementById('loaderScreen');
  const fill = document.getElementById('progressFill');
  const percentLabel = document.getElementById('progressPercent');

  function goToHome() {
    window.location.replace(DEST);
  }

  // How long did this loader page itself take to arrive? That's a
  // real signal for connection/device speed, not a guess.
  let arrivalMs = 0;
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (nav) {
    arrivalMs = nav.responseEnd;
  } else if (performance.timing) {
    arrivalMs = performance.timing.responseEnd - performance.timing.navigationStart;
  }

  if (arrivalMs > 0 && arrivalMs < FAST_THRESHOLD_MS) {
    goToHome();
    return;
  }

  // Connection is slow enough to be worth smoothing over — show the
  // animation, and start fetching the real homepage in the
  // background so the splash ends the moment it's actually ready
  // rather than after an arbitrary fixed delay.
  let destReady = false;
  fetch(DEST, { cache: 'force-cache' })
    .then(() => { destReady = true; })
    .catch(() => { destReady = true; }); // don't get stuck on a network hiccup — proceed anyway

  let progress = 0;
  const interval = setInterval(() => {
    // Creeps up naturally but caps just short of 100% until the
    // homepage is confirmed ready, so the bar never lies about being
    // "done" while still waiting on the network.
    const ceiling = destReady ? 100 : 92;
    const remaining = ceiling - progress;
    const increment = Math.max(0.5, remaining * 0.12) * Math.random();
    progress = Math.min(ceiling, progress + increment);

    fill.style.width = progress + '%';
    percentLabel.textContent = Math.round(progress) + '%';

    if (progress >= 100 && destReady) {
      clearInterval(interval);
      screen.classList.add('done');
      setTimeout(goToHome, 350);
    }
  }, 180);

  // Absolute safety net — never trap a visitor on the splash if
  // something above goes wrong (e.g. fetch never settling behind a
  // strict proxy). 6s is well past what any real load should take.
  setTimeout(() => {
    if (!destReady) goToHome();
  }, 6000);
});
