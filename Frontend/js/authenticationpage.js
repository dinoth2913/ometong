/* =========================================================
   OMETONG — LOGIN / SIGNUP SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

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

  /* ---------- Form submission (demo) ---------- */
  const authSuccess = document.getElementById('authSuccess');
  const successTitle = document.getElementById('successTitle');
  const successText = document.getElementById('successText');

  function destinationForRole(role) {
    if (role === 'buyer') return 'buyerdashboard.html';
    if (role === 'manufacturer') return 'manufacturerdashboard.html';
    return 'supplierdashboard.html';
  }

  function handleSubmit(form, title, textFor) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-block');
      btn.classList.add('loading');
      btn.textContent = 'Please wait…';

      setTimeout(() => {
        form.style.display = 'none';
        successTitle.textContent = title;
        successText.textContent = textFor(currentRole);
        authSuccess.classList.add('show');
        setTimeout(() => { window.location.href = destinationForRole(currentRole); }, 1800);
      }, 700);
    });
  }

  handleSubmit(loginForm, 'Welcome back', (role) =>
    role === 'buyer' ? 'Redirecting you to your dashboard…' : 'Redirecting you to your supplier dashboard…');
  handleSubmit(signupForm, "You're all set", (role) =>
    role === 'buyer'
      ? 'Your account has been created — redirecting to your dashboard…'
      : 'Your account has been created — redirecting to your supplier dashboard…');

});