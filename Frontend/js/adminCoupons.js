/* =========================================================
   OMETONG — ADMIN: COUPONS
   public.coupons already existed (marketplace_enhancements_schema.sql)
   with "Admins manage coupons" RLS — never had any UI to actually
   create or view one, meaning the only way to add a promo code was
   hand-writing SQL. This adds that missing admin UI.

   Note: checkout.js currently validates promo codes against its own
   hardcoded PROMO_CODES object, not this table — wiring checkout to
   read from here instead is a separate follow-up, out of scope for
   "connect the admin panel to the database."
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

  const session = await getInitialSession();
  if (!session || !window.sb) return; // authGuard.js already redirects non-admins away
  const esc = window.ometongEscapeHTML || (s => s);

  const form = document.getElementById('couponForm');
  const codeInput = document.getElementById('couponCode');
  const typeInput = document.getElementById('couponType');
  const amountInput = document.getElementById('couponAmount');
  const minOrderInput = document.getElementById('couponMinOrder');
  const maxUsesInput = document.getElementById('couponMaxUses');
  const expiresInput = document.getElementById('couponExpires');
  const formMsg = document.getElementById('couponFormMsg');
  const createBtn = document.getElementById('couponCreateBtn');
  const tableBody = document.getElementById('couponsTableBody');
  const table = document.getElementById('couponsTable');
  const emptyEl = document.getElementById('couponsEmpty');
  if (!form) return; // section not on this page

  function showMsg(text, isError) {
    formMsg.textContent = text;
    formMsg.className = 'ot-msg ' + (isError ? 'error' : 'success');
    formMsg.hidden = false;
  }

  async function loadCoupons() {
    const { data, error } = await window.sb
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load coupons', error); return; }
    render(data || []);
  }

  function render(coupons) {
    if (!coupons.length) {
      tableBody.innerHTML = '';
      table.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    table.style.display = '';
    if (emptyEl) emptyEl.hidden = true;

    tableBody.innerHTML = coupons.map(c => {
      const discount = c.discount_type === 'percent' ? `${Number(c.amount)}%` : `$${Number(c.amount).toLocaleString('en-US')}`;
      const expires = c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never';
      const uses = c.max_uses ? `${c.used_count} / ${c.max_uses}` : `${c.used_count} / ∞`;
      return `
        <div class="admin-row admin-row--coupons">
          <span><strong>${esc(c.code)}</strong></span>
          <span>${discount} off</span>
          <span>${c.min_order_total > 0 ? '$' + Number(c.min_order_total).toLocaleString('en-US') : '—'}</span>
          <span>${esc(uses)}</span>
          <span>${expires}</span>
          <span class="admin-row-actions">
            <button data-toggle="${c.code}">${c.is_active ? 'Deactivate' : 'Activate'}</button>
          </span>
        </div>`;
    }).join('');

    tableBody.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.getAttribute('data-toggle');
        const c = coupons.find(x => x.code === code);
        if (!c) return;
        btn.disabled = true;
        const { error } = await window.sb.from('coupons').update({ is_active: !c.is_active }).eq('code', code);
        btn.disabled = false;
        if (error) { console.error('Ometong: failed to update coupon', error); return; }
        loadCoupons();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.hidden = true;

    const code = codeInput.value.trim().toUpperCase();
    const amount = parseFloat(amountInput.value);
    if (!code) { showMsg('Enter a code.', true); return; }
    if (isNaN(amount) || amount < 0) { showMsg('Enter a valid amount.', true); return; }

    createBtn.disabled = true;
    const { error } = await window.sb.from('coupons').insert({
      code,
      discount_type: typeInput.value,
      amount,
      min_order_total: parseFloat(minOrderInput.value) || 0,
      max_uses: maxUsesInput.value ? parseInt(maxUsesInput.value, 10) : null,
      expires_at: expiresInput.value ? new Date(expiresInput.value).toISOString() : null
    });
    createBtn.disabled = false;

    if (error) {
      console.error('Ometong: failed to create coupon', error);
      showMsg(error.code === '23505' ? 'That code already exists.' : (error.message || 'Could not create this coupon.'), true);
      return;
    }
    showMsg('Coupon created.', false);
    form.reset();
    loadCoupons();
  });

  await loadCoupons();
});
