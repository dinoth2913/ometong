/* =========================================================
   OMEGO MARKET — LOGIN / SIGNUP SCRIPT
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

  function handleSubmit(form, title, text) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-block');
      btn.classList.add('loading');
      btn.textContent = 'Please wait…';

      setTimeout(() => {
        form.style.display = 'none';
        successTitle.textContent = title;
        successText.textContent = text;
        authSuccess.classList.add('show');
        setTimeout(() => { window.location.href = 'home page.html'; }, 1800);
      }, 700);
    });
  }

  handleSubmit(loginForm, 'Welcome back', 'Redirecting you to the marketplace…');
  handleSubmit(signupForm, "You're all set", 'Your account has been created — redirecting…');

});