/* =========================================================
   OMETONG — SUPPLIER/MANUFACTURER: ADVERTISING REQUESTS
   Shared by supplierdashboard.html and manufacturerdashboard.html
   (same element ids on both pages, same pattern as
   supplierVerification.js). Backed by public.advertisements — see
   supabase/advertisements_schema.sql.

   There's no payment gateway anywhere on this platform (see
   orders_schema.sql — orders work the same way), so a submitted ad
   starts 'pending_payment' and staff follows up on payment directly
   before activating it. This file only ever creates that request;
   it never fakes a charge going through.
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

  const form = document.getElementById('adRequestForm');
  const planSelect = document.getElementById('adPlan');
  const formMsg = document.getElementById('adFormMsg');
  const submitBtn = document.getElementById('adSubmitBtn');
  const listBody = document.getElementById('adRequestsBody');
  const listEmpty = document.getElementById('adRequestsEmpty');
  if (!form) return; // section not on this page

  const MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const PLAN_LABELS = { spotlight: 'Category Spotlight', featured: 'Featured Listing', banner: 'Homepage Banner' };
  const PLAN_PRICES = { spotlight: 0, featured: 49, banner: 149 };
  const STATUS_LABELS = { pending_payment: 'Awaiting payment', active: 'Active', rejected: 'Declined', expired: 'Expired' };
  const STATUS_CLS = { pending_payment: 'processing', active: 'delivered', rejected: 'cancelled', expired: 'cancelled' };

  function showMsg(text, isError) {
    formMsg.textContent = text;
    formMsg.className = 'rfq-form-msg ' + (isError ? 'error' : 'success');
    formMsg.hidden = false;
  }

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  async function loadAds() {
    const { data, error } = await window.sb
      .from('advertisements')
      .select('*')
      .eq('advertiser_id', myId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Ometong: failed to load ad requests', error); return; }
    render(data || []);
  }

  function render(ads) {
    if (!ads.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listBody.innerHTML = ads.map(ad => `
      <div class="verify-doc-row">
        <span>${esc(PLAN_LABELS[ad.plan] || ad.plan)} — ${esc(ad.product_name)}</span>
        <span class="order-status ${STATUS_CLS[ad.status] || 'processing'}">${esc(STATUS_LABELS[ad.status] || ad.status)}</span>
        <span class="verify-doc-time">${timeAgo(ad.created_at)} ago</span>
        ${ad.admin_note ? `<span class="verify-doc-note">${esc(ad.admin_note)}</span>` : ''}
      </div>
    `).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.hidden = true;

    const plan = planSelect.value;
    const productName = document.getElementById('adProductName').value.trim();
    const businessName = document.getElementById('adBusinessName').value.trim();
    const category = document.getElementById('adCategory').value || null;
    const description = document.getElementById('adDescription').value.trim();
    const link = document.getElementById('adLink').value.trim() || null;
    const fileInput = document.getElementById('adImage');
    const file = fileInput.files && fileInput.files[0];

    if (!productName || !businessName || !description) {
      showMsg('Please fill in the required fields.', true);
      return;
    }
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) { showMsg('Please choose a JPG, PNG or WEBP image.', true); return; }
      if (file.size > MAX_BYTES) { showMsg('That image is too large — please choose one under 5MB.', true); return; }
    }

    submitBtn.disabled = true;

    let imageUrl = null;
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `${myId}/${Date.now()}.${ext}`;
      const upload = await window.sb.storage.from('ad-images').upload(path, file, { cacheControl: '3600', upsert: false });
      if (upload.error) {
        submitBtn.disabled = false;
        showMsg(upload.error.message || 'Could not upload the ad image. Please try again.', true);
        return;
      }
      const { data: publicUrlData } = window.sb.storage.from('ad-images').getPublicUrl(path);
      imageUrl = publicUrlData?.publicUrl || null;
    }

    const { error } = await window.sb.from('advertisements').insert({
      advertiser_id: myId,
      plan,
      price: PLAN_PRICES[plan] ?? 0,
      business_name: businessName,
      product_name: productName,
      category,
      description,
      link,
      image_url: imageUrl
    });
    submitBtn.disabled = false;

    if (error) {
      console.error('Ometong: failed to submit ad request', error);
      showMsg(error.message || 'Could not submit this request. Please try again.', true);
      return;
    }

    showMsg('Request submitted — our team will follow up on payment before it goes live.', false);
    form.reset();
    loadAds();
  });

  await loadAds();
});
