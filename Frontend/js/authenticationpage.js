/* =========================================================
   OMETONG — LOGIN / SIGNUP SCRIPT
========================================================= */
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
  }

  tabs.forEach(tab => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.goto));
  });

  /* ---------- Default tab from URL (e.g. authenticationpage.html?tab=signup) ---------- */
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab === 'signup') setTab('signup');

  /* ---------- Role selector (Buyer / Supplier / Manufacturer) ---------- */
  const roleTabs = document.querySelectorAll('.role-tab');
  const roleIndicator = document.getElementById('roleIndicator');
  const bizFields = document.getElementById('signupBizFields');
  const bizFieldsLabel = document.getElementById('bizFieldsLabel');
  const bizDetailsLabel = document.getElementById('bizDetailsLabel');
  const loginRoleNote = document.getElementById('loginRoleNote');

  const roleIndex = { buyer: 0, supplier: 1, manufacturer: 2 };
  const roleCopy = {
    buyer: { note: 'a buyer', fieldsLabel: null, detailsLabel: null },
    supplier: { note: 'a supplier', fieldsLabel: 'Supplier details', detailsLabel: 'What do you supply?' },
    manufacturer: { note: 'a manufacturer', fieldsLabel: 'Manufacturer details', detailsLabel: 'What do you manufacture?' },
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
    loginRoleNote.textContent = roleCopy[role].note;
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

  function showError(form, message) {
    let errorEl = form.querySelector('.auth-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'auth-error';
      form.prepend(errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }

  function clearError(form) {
    const errorEl = form.querySelector('.auth-error');
    if (errorEl) errorEl.classList.remove('show');
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

    setLoading(loginForm, true, 'Log in');
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    setLoading(loginForm, false, 'Log in');

    if (error) {
      showError(loginForm, error.message || 'Could not log in. Check your email and password.');
      return;
    }

    const { data: profile } = await window.sb
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    const role = profile ? profile.role : 'buyer';

    showSuccess('Welcome back', 'Redirecting you to your dashboard…', destinationForRole(role));
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
        }
      }
    });
    setLoading(signupForm, false, 'Create account');

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

    showSuccess("You're all set", 'Your account has been created — redirecting to your dashboard…', destinationForRole(currentRole));
  });

});