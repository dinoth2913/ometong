/* =========================================================
   OMETONG — ACCOUNT SECURITY (password + 2FA)
   Change password via supabase.auth.updateUser(), and enroll/manage
   a TOTP (authenticator app) second factor via supabase.auth.mfa —
   both are Supabase Auth built-ins, no new database schema needed.
   The login-time enforcement side of this lives in authGuard.js and
   mfa-challenge.js — this page only ever manages factors, it never
   grants access on its own.
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- Chrome: hamburger, scroll progress ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('mainNav');
  function onScroll() {
    const top = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (top / docHeight) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    nav?.classList.toggle('scrolled', top > 40);
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Auth ---------- */
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

  // Same step-up check as authGuard.js — this page manages your 2FA
  // factors, so it's exactly as sensitive as any dashboard page.
  const { data: aal } = await window.sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    window.location.href = 'mfa-challenge.html?next=' + encodeURIComponent('security.html');
    return;
  }

  const profile = await window.ometongGetProfile();
  if (!profile) {
    window.location.href = 'authenticationpage.html';
    return;
  }

  const displayName = profile.business_name || profile.full_name || profile.email || 'Account';
  const dashHref = window.ometongDashboardForRole ? window.ometongDashboardForRole(profile.role) : 'buyerdashboard.html';
  document.getElementById('dashboardLink').href = dashHref;
  document.getElementById('dashboardLinkMobile').href = dashHref;
  document.getElementById('userChipName').textContent = displayName;
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('userAvatarInitials').textContent = initials || '?';

  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */
  const passwordForm = document.getElementById('passwordForm');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordFormMsg = document.getElementById('passwordFormMsg');
  const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');

  function showPasswordMsg(text, isError) {
    passwordFormMsg.textContent = text;
    passwordFormMsg.className = 'ot-msg ' + (isError ? 'error' : 'success');
    passwordFormMsg.hidden = false;
  }

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordFormMsg.hidden = true;

    const pw = newPasswordInput.value;
    const confirm = confirmPasswordInput.value;
    if (pw.length < 8) { showPasswordMsg('Password must be at least 8 characters.', true); return; }
    if (pw !== confirm) { showPasswordMsg('Passwords don\'t match.', true); return; }

    passwordSubmitBtn.disabled = true;
    const { error } = await window.sb.auth.updateUser({ password: pw });
    passwordSubmitBtn.disabled = false;

    if (error) {
      showPasswordMsg(error.message || 'Could not update your password. Please try again.', true);
      return;
    }
    showPasswordMsg('Password updated.', false);
    passwordForm.reset();
  });

  /* =========================================================
     TWO-FACTOR AUTHENTICATION
  ========================================================= */
  const mfaStatusPill = document.getElementById('mfaStatusPill');
  const mfaStatusText = document.getElementById('mfaStatusText');
  const mfaEnrollPrompt = document.getElementById('mfaEnrollPrompt');
  const mfaEnableBtn = document.getElementById('mfaEnableBtn');
  const mfaEnrollCard = document.getElementById('mfaEnrollCard');
  const mfaQrHolder = document.getElementById('mfaQrHolder');
  const mfaSecretText = document.getElementById('mfaSecretText');
  const mfaVerifyCode = document.getElementById('mfaVerifyCode');
  const mfaEnrollMsg = document.getElementById('mfaEnrollMsg');
  const mfaConfirmBtn = document.getElementById('mfaConfirmBtn');
  const mfaCancelEnrollBtn = document.getElementById('mfaCancelEnrollBtn');
  const mfaEnabledCard = document.getElementById('mfaEnabledCard');
  const mfaDisableBtn = document.getElementById('mfaDisableBtn');
  const mfaDisableMsg = document.getElementById('mfaDisableMsg');

  let pendingFactorId = null;
  let verifiedFactorId = null;

  function showEnrollMsg(text, isError) {
    mfaEnrollMsg.textContent = text;
    mfaEnrollMsg.className = 'ot-msg ' + (isError ? 'error' : 'success');
    mfaEnrollMsg.hidden = false;
  }

  function resetEnrollUI() {
    mfaEnrollCard.hidden = true;
    mfaEnrollPrompt.hidden = false;
    mfaVerifyCode.value = '';
    mfaEnrollMsg.hidden = true;
    pendingFactorId = null;
  }

  async function refreshMfaStatus() {
    const { data, error } = await window.sb.auth.mfa.listFactors();
    if (error) { console.error('Ometong: failed to load 2FA factors', error); return; }

    const verified = (data.totp || []).find(f => f.status === 'verified');
    verifiedFactorId = verified ? verified.id : null;

    if (verified) {
      mfaStatusPill.classList.remove('pending');
      mfaStatusPill.classList.add('verified');
      mfaStatusText.textContent = 'Enabled';
      mfaEnabledCard.hidden = false;
      mfaEnrollPrompt.hidden = true;
      mfaEnrollCard.hidden = true;
    } else {
      mfaStatusPill.classList.remove('verified');
      mfaStatusPill.classList.add('pending');
      mfaStatusText.textContent = 'Not enabled';
      mfaEnabledCard.hidden = true;
    }
  }

  mfaEnableBtn.addEventListener('click', async () => {
    mfaEnableBtn.disabled = true;

    // Clean up any half-finished enrollment attempts from before —
    // Supabase would otherwise happily let these pile up, and each
    // one counts toward the account's factor limit.
    const { data: existing } = await window.sb.auth.mfa.listFactors();
    const stale = (existing?.totp || []).filter(f => f.status !== 'verified');
    for (const f of stale) {
      await window.sb.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await window.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ometong' });
    mfaEnableBtn.disabled = false;

    if (error || !data) {
      console.error('Ometong: failed to start 2FA enrollment', error);
      return;
    }

    pendingFactorId = data.id;
    // qr_code comes back as ready-to-render SVG markup straight from
    // Supabase's own response to our own enroll() call — not
    // arbitrary user input, safe to inject directly, same as the
    // official Supabase MFA examples do.
    mfaQrHolder.innerHTML = data.totp.qr_code;
    mfaSecretText.textContent = data.totp.secret;

    mfaEnrollPrompt.hidden = true;
    mfaEnrollCard.hidden = false;
    mfaVerifyCode.focus();
  });

  mfaConfirmBtn.addEventListener('click', async () => {
    mfaEnrollMsg.hidden = true;
    const code = mfaVerifyCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
      showEnrollMsg('Enter the 6-digit code from your authenticator app.', true);
      return;
    }
    if (!pendingFactorId) return;

    mfaConfirmBtn.disabled = true;

    const { data: challenge, error: challengeError } = await window.sb.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeError || !challenge) {
      mfaConfirmBtn.disabled = false;
      showEnrollMsg(challengeError?.message || 'Could not verify right now. Please try again.', true);
      return;
    }

    const { error: verifyError } = await window.sb.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code
    });
    mfaConfirmBtn.disabled = false;

    if (verifyError) {
      showEnrollMsg('That code didn\'t match — check the time on your device and try again.', true);
      return;
    }

    resetEnrollUI();
    await refreshMfaStatus();
  });

  mfaCancelEnrollBtn.addEventListener('click', async () => {
    if (pendingFactorId) {
      await window.sb.auth.mfa.unenroll({ factorId: pendingFactorId });
    }
    resetEnrollUI();
  });

  mfaDisableBtn.addEventListener('click', async () => {
    if (!verifiedFactorId) return;
    if (!window.confirm('Turn off two-factor authentication? You\'ll only need your password to log in after this.')) return;

    mfaDisableBtn.disabled = true;
    const { error } = await window.sb.auth.mfa.unenroll({ factorId: verifiedFactorId });
    mfaDisableBtn.disabled = false;

    if (error) {
      mfaDisableMsg.textContent = error.message || 'Could not turn off two-factor authentication. Please try again.';
      mfaDisableMsg.className = 'ot-msg error';
      mfaDisableMsg.hidden = false;
      return;
    }
    mfaDisableMsg.hidden = true;
    await refreshMfaStatus();
  });

  await refreshMfaStatus();
});
