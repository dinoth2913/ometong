/* =========================================================
   OMETONG — RESET PASSWORD SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('resetForm');
  const sub = document.getElementById('resetSub');
  const successEl = document.getElementById('resetSuccess');
  const submitBtn = document.getElementById('resetSubmitBtn');

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
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Please wait…' : 'Set new password';
  }

  /* ---------- Password visibility toggles ---------- */
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.classList.toggle('showing', !showing);
    });
  });

  /* ---------- Confirm this link is actually a valid password-recovery session ----------
     Clicking the emailed reset link redirects here with a token in the URL that
     Supabase automatically exchanges for a temporary session. Waiting for the
     PASSWORD_RECOVERY event (rather than checking immediately) avoids the same
     race condition fixed elsewhere in this project — the client needs a moment
     to process the token from the URL on a fresh page load. */
  let hasRecoverySession = false;

  function waitForRecoverySession() {
    return new Promise((resolve) => {
      let settled = false;
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
          if (!settled) {
            settled = true;
            sub.subscription.unsubscribe();
            resolve(!!session);
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
          // No session yet from INITIAL_SESSION — give the token exchange
          // (PASSWORD_RECOVERY) a short window to still arrive.
          setTimeout(() => {
            if (!settled) {
              settled = true;
              sub.subscription.unsubscribe();
              resolve(false);
            }
          }, 2500);
        }
      });
    });
  }

  (async () => {
    if (!window.sb) return;
    hasRecoverySession = await waitForRecoverySession();
    if (!hasRecoverySession) {
      sub.textContent = 'This reset link is invalid or has expired.';
      showError('Please request a new password reset link from the login page.');
      submitBtn.disabled = true;
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    if (!hasRecoverySession) {
      showError('This reset link is invalid or has expired. Please request a new one.');
      return;
    }

    const password = document.getElementById('newPw').value;
    const confirmPassword = document.getElementById('confirmPw').value;

    if (password.length < 8) {
      showError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Those passwords don\'t match — please re-enter them.');
      return;
    }

    setLoading(true);
    const { error } = await window.sb.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      showError(error.message || 'Could not update your password. Please try again.');
      return;
    }

    // Sign out so the user logs back in fresh with the new password.
    await window.sb.auth.signOut();

    form.style.display = 'none';
    successEl.classList.add('show');
    setTimeout(() => { window.location.href = 'authenticationpage.html'; }, 1800);
  });

});
