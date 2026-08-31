/* =========================================================
   OMETONG — 2FA LOGIN STEP-UP
   Reached only when authGuard.js (or authenticationpage.js right
   after a password sign-in) detects the session is stuck at
   "aal1" with a 2FA factor enrolled — Supabase already validated
   the password, this page's only job is validating the 6-digit
   code and completing the step-up to "aal2". See security.js for
   where a factor actually gets enrolled in the first place.
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

  if (!window.sb) return;
  const session = await getInitialSession();
  if (!session) {
    window.location.href = 'authenticationpage.html';
    return;
  }

  // If there's actually no step-up pending (e.g. someone bookmarked
  // this page, or already completed it in another tab), there's
  // nothing to verify here — send them on to their dashboard.
  const { data: aal } = await window.sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.currentLevel === 'aal2' || aal.nextLevel !== 'aal2') {
    const profile = await window.ometongGetProfile();
    window.location.href = profile ? window.ometongDashboardForRole(profile.role) : 'authenticationpage.html';
    return;
  }

  const form = document.getElementById('mfaForm');
  const codeInput = document.getElementById('mfaCode');
  const submitBtn = document.getElementById('mfaSubmitBtn');
  const authSuccess = document.getElementById('authSuccess');
  const successTitle = document.getElementById('successTitle');
  const successText = document.getElementById('successText');
  const cancelLink = document.getElementById('cancelLink');

  function showError(message) {
    let errorEl = form.querySelector('.auth-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'auth-error';
      form.prepend(errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }

  function clearError() {
    const errorEl = form.querySelector('.auth-error');
    if (errorEl) errorEl.classList.remove('show');
  }

  function nextDestination() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    // Same allow-list pattern as authenticationpage.js's own ?next=
    // handling — a plain .html filename in this folder only, so a
    // crafted value can't redirect somewhere else entirely.
    if (next && /^[a-zA-Z0-9_.-]+\.html(\?[a-zA-Z0-9_=&%.-]*)?$/.test(next)) return next;
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const code = codeInput.value.trim();
    if (!/^\d{6}$/.test(code)) {
      showError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying…';

    const { data: factorsData, error: factorsError } = await window.sb.auth.mfa.listFactors();
    if (factorsError || !factorsData || !factorsData.totp || !factorsData.totp.length) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify & continue';
      showError('Could not find your authenticator setup. Please contact support.');
      return;
    }
    const factor = factorsData.totp.find(f => f.status === 'verified') || factorsData.totp[0];

    const { data: challenge, error: challengeError } = await window.sb.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError || !challenge) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify & continue';
      showError(challengeError?.message || 'Could not start verification. Please try again.');
      return;
    }

    const { error: verifyError } = await window.sb.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code
    });
    submitBtn.disabled = false;
    submitBtn.textContent = 'Verify & continue';

    if (verifyError) {
      showError('That code didn\'t match — check the time on your device and try again.');
      codeInput.value = '';
      codeInput.focus();
      return;
    }

    form.style.display = 'none';
    successTitle.textContent = 'Verified';
    successText.textContent = 'Redirecting you now…';
    authSuccess.classList.add('show');

    const profile = await window.ometongGetProfile();
    const dest = nextDestination() || (profile ? window.ometongDashboardForRole(profile.role) : 'authenticationpage.html');
    setTimeout(() => { window.location.href = dest; }, 900);
  });

  cancelLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.ometongLogout) window.ometongLogout();
    else window.location.href = 'authenticationpage.html';
  });
});
