/* =========================================================
   OMETONG — LOGIN / SIGNUP SCRIPT
========================================================= */

/* ---------- hCaptcha (bot/abuse protection on login + signup) ----------
   Renders two independent widgets. If no site key is configured yet
   (captchaConfig.js), this never runs and both forms behave exactly
   as before — no captcha shown, nothing required. */
let ometongLoginCaptchaId = null;
let ometongSignupCaptchaId = null;

window.ometongHCaptchaLoaded = function () {
  if (!window.hcaptcha || !window.HCAPTCHA_SITE_KEY) return;
  ometongLoginCaptchaId = window.hcaptcha.render('loginCaptcha', { sitekey: window.HCAPTCHA_SITE_KEY });
  ometongSignupCaptchaId = window.hcaptcha.render('signupCaptcha', { sitekey: window.HCAPTCHA_SITE_KEY });
};

function ometongGetCaptchaToken(widgetId) {
  if (!window.HCAPTCHA_SITE_KEY) return { required: false, token: undefined };
  if (!window.hcaptcha || widgetId === null) return { required: true, token: '' };
  return { required: true, token: window.hcaptcha.getResponse(widgetId) };
}

function ometongResetCaptcha(widgetId) {
  if (window.hcaptcha && widgetId !== null) window.hcaptcha.reset(widgetId);
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Skip the form entirely if already logged in ---------- */
  (async () => {
    if (!window.sb) return;
    const session = await new Promise((resolve) => {
      const { data: sub } = window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
          sub.subscription.unsubscribe();
          resolve(session);
        }
      });
    });
    if (!session) return;
    const profile = await window.ometongGetProfile();
    if (profile) window.location.href = window.ometongDashboardForRole(profile.role);
  })();

  /* ---------- Tab switching ---------- */
  const tabs = document.querySelectorAll('.tab');
  const indicator = document.getElementById('tabIndicator');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  function setTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    indicator.style.transform = name === 'signup' ? 'translateX(100%)' : 'translateX(0)';
    loginForm.classList.toggle('active', name === 'login');
    signupForm.classList.toggle('active', name === 'signup');
    document.getElementById('authSuccess').classList.remove('show');
    loginForm.style.display = name === 'login' ? 'flex' : 'none';
    signupForm.style.display = name === 'signup' ? 'flex' : 'none';

    // The Buyer/Supplier/Manufacturer selector only actually does
    // anything on signup (it picks the new account's role). On login
    // it had no effect at all — an account's role is fixed forever
    // once created — but showing it there with a "Logging in as a
    // buyer" sentence falsely implied clicking it chooses which
    // dashboard you land on, when really you always land on your
    // account's real, permanent role regardless of what's clicked.
    // Hide it entirely outside of signup so nothing misleading is
    // shown on login.
    const roleSelect = document.getElementById('roleSelect');
    if (roleSelect) roleSelect.style.display = name === 'signup' ? 'flex' : 'none';
  }

  tabs.forEach(tab => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.goto));
  });

  /* ---------- Default tab from URL (e.g. authenticationpage.html?tab=signup) ----------
     Always runs (not just when ?tab=signup is present) so the role
     selector's visibility is set correctly even on a plain page load
     landing on the default Login tab. */
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  setTab(urlTab === 'signup' ? 'signup' : 'login');

  /* ---------- Role selector (Buyer / Supplier / Manufacturer) ---------- */
  const roleTabs = document.querySelectorAll('.role-tab');
  const roleIndicator = document.getElementById('roleIndicator');
  const bizFields = document.getElementById('signupBizFields');
  const bizFieldsLabel = document.getElementById('bizFieldsLabel');
  const bizDetailsLabel = document.getElementById('bizDetailsLabel');

  const roleIndex = { buyer: 0, supplier: 1, manufacturer: 2 };
  const roleCopy = {
    buyer: { fieldsLabel: null, detailsLabel: null },
    supplier: { fieldsLabel: 'Supplier details', detailsLabel: 'What do you supply?' },
    manufacturer: { fieldsLabel: 'Manufacturer details', detailsLabel: 'What do you manufacture?' },
  };

  let currentRole = 'buyer';

  function setRole(role) {
    if (!roleCopy[role]) role = 'buyer';
    currentRole = role;

    roleTabs.forEach(t => {
      const isActive = t.dataset.role === role;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-checked', String(isActive));
    });
    roleIndicator.style.transform = `translateX(${roleIndex[role] * 100}%)`;

    const isBusiness = role !== 'buyer';
    bizFields.classList.toggle('show', isBusiness);
    if (isBusiness) {
      bizFieldsLabel.textContent = roleCopy[role].fieldsLabel;
      bizDetailsLabel.textContent = roleCopy[role].detailsLabel;
    }
  }

  roleTabs.forEach(tab => tab.addEventListener('click', () => setRole(tab.dataset.role)));

  const urlRole = new URLSearchParams(window.location.search).get('role');
  setRole(urlRole && roleCopy[urlRole] ? urlRole : 'buyer');

  /* ---------- Password visibility ---------- */
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.classList.toggle('showing', !showing);
    });
  });

  /* ---------- Real auth via Supabase ---------- */
  const authSuccess = document.getElementById('authSuccess');
  const successTitle = document.getElementById('successTitle');
  const successText = document.getElementById('successText');
  function destinationForRole(role) {
    return window.ometongDashboardForRole ? window.ometongDashboardForRole(role) : 'buyerdashboard.html';
  }

  // If we got here via a "please log in first" redirect (e.g. from
  // checkout.js), send the customer back to finish what they were
  // doing instead of dropping them on their dashboard. Restricted to
  // a plain relative .html filename in this same folder so a crafted
  // ?next= value can't be used to redirect somewhere else entirely.
  function nextRedirect(role) {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && /^[a-zA-Z0-9_.-]+\.html(\?[a-zA-Z0-9_=&%.-]*)?$/.test(next)) return next;
    return destinationForRole(role);
  }

  const lastInvalidField = new WeakMap();
  function showError(form, message, field) {
    let errorEl = form.querySelector('.auth-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'auth-error';
      form.prepend(errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.add('show');

    const prev = lastInvalidField.get(form);
    if (prev) prev.classList.remove('field-invalid');
    if (field) {
      field.classList.add('field-invalid');
      field.focus();
      lastInvalidField.set(form, field);
    } else {
      lastInvalidField.delete(form);
    }
  }

  function clearError(form) {
    const errorEl = form.querySelector('.auth-error');
    if (errorEl) errorEl.classList.remove('show');
    const prev = lastInvalidField.get(form);
    if (prev) { prev.classList.remove('field-invalid'); lastInvalidField.delete(form); }
  }

  function setLoading(form, isLoading, label) {
    const btn = form.querySelector('.btn-block');
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Please wait…' : label;
  }

  function showSuccess(title, message, redirectTo) {
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    successTitle.textContent = title;
    successText.textContent = message;
    authSuccess.classList.add('show');
    if (redirectTo) setTimeout(() => { window.location.href = redirectTo; }, 1600);
  }

  if (!window.sb) {
    console.error('Ometong: Supabase client not available — check that supabaseConfig.js and supabaseClient.js are loaded before authenticationpage.js.');
  }

  /* ---------- "Sign in with Google" ----------
     Every account created this way lands as a buyer — there's no
     signup form in this flow to pick a role from, and Google login
     is offered on both the Log in and Create Account tabs, so there
     isn't even a reliable "which did they mean" signal to read at
     the moment they click. The database's own new-user trigger
     already defaults role to 'buyer' whenever nothing else says
     otherwise (see handle_new_user() in schema.sql), so this needs
     no extra code on that side — a first-time Google sign-in simply
     falls through to that same default.
     Supplier/manufacturer accounts still go through the normal
     email/password signup, where the role picker actually applies.
     redirectTo points back at this same page: it already has the
     "already logged in? send them to their dashboard" check at the
     top of this file, which runs again once Google sends the
     visitor back here with a session. */
  document.querySelectorAll('[data-provider="google"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.sb) return;
      btn.disabled = true;
      const { error } = await window.sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) {
        btn.disabled = false;
        showError(loginForm.classList.contains('active') ? loginForm : signupForm, error.message || 'Could not start Google sign-in. Please try again.');
      }
      // On success the browser navigates to Google immediately — no
      // further UI update needed here, this tab is about to leave.
    });
  });

  // Clear a signup field's red "invalid" highlight as soon as it's
  // fixed, rather than making the visitor re-submit first.
  ['name', 'email', 'password', 'business'].forEach((fieldName) => {
    const field = signupForm[fieldName];
    if (!field) return;
    field.addEventListener('input', () => {
      if (field.value.trim()) field.classList.remove('field-invalid');
    });
  });

  /* ---------- Forgot password ---------- */
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  forgotPasswordBtn?.addEventListener('click', async () => {
    clearError(loginForm);
    const email = loginForm.email.value.trim();
    if (!email) {
      showError(loginForm, 'Enter your email above first, then click "Forgot password?".');
      return;
    }

    forgotPasswordBtn.disabled = true;
    const originalLabel = forgotPasswordBtn.textContent;
    forgotPasswordBtn.textContent = 'Sending…';

    const redirectTo = new URL('reset-password.html', window.location.href).href;
    const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo });

    forgotPasswordBtn.disabled = false;
    forgotPasswordBtn.textContent = originalLabel;

    if (error) {
      showError(loginForm, error.message || 'Could not send a reset link. Please try again.');
      return;
    }

    showSuccess('Check your email', `We've sent a password reset link to ${email}. Click it to choose a new password.`, null);
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(loginForm);
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    const captcha = ometongGetCaptchaToken(ometongLoginCaptchaId);
    if (captcha.required && !captcha.token) {
      showError(loginForm, 'Please complete the captcha before logging in.');
      return;
    }

    setLoading(loginForm, true, 'Log in');
    const { data, error } = await window.sb.auth.signInWithPassword({
      email,
      password,
      options: captcha.token ? { captchaToken: captcha.token } : undefined
    });
    setLoading(loginForm, false, 'Log in');
    ometongResetCaptcha(ometongLoginCaptchaId);

    if (error) {
      showError(loginForm, error.message || 'Could not log in. Check your email and password.');
      return;
    }

    const rememberCheckbox = document.getElementById('rememberMeCheckbox');
    if (window.ometongSetRememberMe) {
      window.ometongSetRememberMe(rememberCheckbox ? rememberCheckbox.checked : true);
    }

    const { data: profile } = await window.sb
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    const role = profile ? profile.role : 'buyer';
    const dest = nextRedirect(role);
    const cameFromElsewhere = dest !== destinationForRole(role);

    showSuccess('Welcome back', cameFromElsewhere ? 'Redirecting you back to finish up…' : 'Redirecting you to your dashboard…', dest);
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(signupForm);
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value;
    const fullName = signupForm.name.value.trim();
    const business = signupForm.business ? signupForm.business.value.trim() : '';
    const category = signupForm.category ? signupForm.category.value : '';
    const details = signupForm.details ? signupForm.details.value.trim() : '';

    // The form has novalidate (custom styling for errors instead of
    // the browser's native popups), which also means nothing was
    // checking these required fields client-side before this — an
    // empty name or business name would only ever get caught by
    // Supabase's own validation of email/password, if at all.
    if (!fullName) { showError(signupForm, 'Please enter your full name.', signupForm.name); return; }
    if (!email) { showError(signupForm, 'Please enter your email address.', signupForm.email); return; }
    if (!password) { showError(signupForm, 'Please create a password.', signupForm.password); return; }
    if (currentRole !== 'buyer' && !business) {
      showError(signupForm, 'Please enter your business name.', signupForm.business);
      return;
    }

    const captcha = ometongGetCaptchaToken(ometongSignupCaptchaId);
    if (captcha.required && !captcha.token) {
      showError(signupForm, 'Please complete the captcha before creating an account.');
      return;
    }

    setLoading(signupForm, true, 'Create account');
    const { data, error } = await window.sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: currentRole,
          full_name: fullName,
          business_name: business,
          category,
          details
        },
        captchaToken: captcha.token || undefined
      }
    });
    setLoading(signupForm, false, 'Create account');
    ometongResetCaptcha(ometongSignupCaptchaId);

    if (error) {
      showError(signupForm, error.message || 'Could not create your account. Please try again.');
      return;
    }

    if (!data.session) {
      // Email confirmation is required before the account can log in — don't redirect yet.
      showSuccess(
        'Check your email',
        "We've sent a confirmation link to " + email + ". Confirm it, then log in to reach your dashboard.",
        null
      );
      return;
    }

    // No "remember me" checkbox on signup — always starts remembered.
    // Also clears any leftover "don't remember" flag from an earlier
    // login on this browser, so it can't sign this brand-new session
    // straight back out.
    if (window.ometongSetRememberMe) window.ometongSetRememberMe(true);

    const dest = nextRedirect(currentRole);
    const cameFromElsewhere = dest !== destinationForRole(currentRole);

    showSuccess("You're all set", cameFromElsewhere ? 'Your account has been created — redirecting you back to finish up…' : 'Your account has been created — redirecting to your dashboard…', dest);
  });

});