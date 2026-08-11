/* =========================================================
   OMETONG — BUYER: SAVED SHIPPING ADDRESSES
   Backed by public.addresses (marketplace_enhancements_schema.sql
   section 3) — the table, RLS, and the "only one default address"
   trigger already existed with nothing anywhere in the frontend
   reading or writing them. This is that missing UI: add/edit/delete
   a saved address and set a default, all from the buyer dashboard.
   checkout.js reads from the same table to offer "use a saved
   address" instead of retyping everything.
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
  if (!session || !window.sb) return; // authGuard.js already redirects unauthenticated visitors away
  const myId = session.user.id;
  const esc = window.ometongEscapeHTML || (s => s);

  const form = document.getElementById('addressForm');
  const editIdInput = document.getElementById('addressEditId');
  const formMsg = document.getElementById('addressFormMsg');
  const submitBtn = document.getElementById('addressSubmitBtn');
  const cancelEditBtn = document.getElementById('addressCancelEditBtn');
  const listEl = document.getElementById('addressList');
  const listEmpty = document.getElementById('addressListEmpty');
  if (!form) return; // section not on this page

  const fields = {
    label: document.getElementById('addrLabel'),
    fullName: document.getElementById('addrFullName'),
    phone: document.getElementById('addrPhone'),
    country: document.getElementById('addrCountry'),
    line1: document.getElementById('addrLine1'),
    line2: document.getElementById('addrLine2'),
    city: document.getElementById('addrCity'),
    state: document.getElementById('addrState'),
    postal: document.getElementById('addrPostal'),
    isDefault: document.getElementById('addrIsDefault')
  };

  function showMsg(text, isError) {
    formMsg.textContent = text;
    formMsg.className = 'rfq-form-msg ' + (isError ? 'error' : 'success');
    formMsg.hidden = false;
  }

  function resetForm() {
    form.reset();
    editIdInput.value = '';
    submitBtn.textContent = 'Save address';
    cancelEditBtn.hidden = true;
  }

  async function loadAddresses() {
    const { data, error } = await window.sb
      .from('addresses')
      .select('*')
      .eq('user_id', myId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load addresses', error); return; }
    render(data || []);
  }

  function render(addresses) {
    if (!addresses.length) {
      listEl.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listEl.innerHTML = addresses.map(a => {
      const lines = [a.line1, a.line2].filter(Boolean).join(', ');
      const cityLine = [a.city, a.state, a.postal_code].filter(Boolean).join(', ');
      return `
        <div class="rfq-list-item" data-address="${a.id}">
          <div class="rfq-list-top">
            <span class="rfq-list-title">${esc(a.label || 'Address')} — ${esc(a.full_name)}</span>
            ${a.is_default ? `<span class="rfq-list-status awarded">Default</span>` : ''}
          </div>
          <div class="rfq-list-meta">${esc(lines)}${cityLine ? ' · ' + esc(cityLine) : ''} · ${esc(a.country)}${a.phone ? ' · ' + esc(a.phone) : ''}</div>
          <div class="rfq-form-actions" style="margin-top:10px;">
            <button type="button" class="btn btn-ghost btn-sm" data-edit="${a.id}">Edit</button>
            ${!a.is_default ? `<button type="button" class="btn btn-ghost btn-sm" data-default="${a.id}">Set as default</button>` : ''}
            <button type="button" class="btn btn-ghost btn-sm" data-delete="${a.id}">Delete</button>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = addresses.find(x => x.id === btn.getAttribute('data-edit'));
        if (!a) return;
        editIdInput.value = a.id;
        fields.label.value = a.label || '';
        fields.fullName.value = a.full_name || '';
        fields.phone.value = a.phone || '';
        fields.country.value = a.country || '';
        fields.line1.value = a.line1 || '';
        fields.line2.value = a.line2 || '';
        fields.city.value = a.city || '';
        fields.state.value = a.state || '';
        fields.postal.value = a.postal_code || '';
        fields.isDefault.checked = !!a.is_default;
        submitBtn.textContent = 'Save changes';
        cancelEditBtn.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    listEl.querySelectorAll('[data-default]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error } = await window.sb.from('addresses').update({ is_default: true }).eq('id', btn.getAttribute('data-default'));
        btn.disabled = false;
        if (error) { console.error('Ometong: failed to set default address', error); return; }
        loadAddresses();
      });
    });
    listEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this address?')) return;
        btn.disabled = true;
        const { error } = await window.sb.from('addresses').delete().eq('id', btn.getAttribute('data-delete'));
        btn.disabled = false;
        if (error) { console.error('Ometong: failed to delete address', error); return; }
        loadAddresses();
      });
    });
  }

  cancelEditBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.hidden = true;

    const payload = {
      user_id: myId,
      label: fields.label.value.trim() || null,
      full_name: fields.fullName.value.trim(),
      phone: fields.phone.value.trim() || null,
      country: fields.country.value,
      line1: fields.line1.value.trim(),
      line2: fields.line2.value.trim() || null,
      city: fields.city.value.trim(),
      state: fields.state.value.trim() || null,
      postal_code: fields.postal.value.trim() || null,
      is_default: fields.isDefault.checked
    };

    if (!payload.full_name || !payload.country || !payload.line1 || !payload.city) {
      showMsg('Please fill in the required fields.', true);
      return;
    }

    submitBtn.disabled = true;
    const editId = editIdInput.value;
    const { error } = editId
      ? await window.sb.from('addresses').update(payload).eq('id', editId)
      : await window.sb.from('addresses').insert(payload);
    submitBtn.disabled = false;

    if (error) {
      console.error('Ometong: failed to save address', error);
      showMsg(error.message || 'Could not save this address. Please try again.', true);
      return;
    }

    showMsg(editId ? 'Address updated.' : 'Address saved.', false);
    resetForm();
    loadAddresses();
  });

  await loadAddresses();
});
