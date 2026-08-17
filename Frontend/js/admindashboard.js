/* =========================================================
   OMETONG — ADMIN DASHBOARD SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Dark mode ---------- */
  const themeToggle = document.getElementById('themeToggle');
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggle) themeToggle.checked = theme === 'dark';
  }
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) setTheme(savedTheme);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  else setTheme('light');
  themeToggle?.addEventListener('change', () => setTheme(themeToggle.checked ? 'dark' : 'light'));

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Scroll progress + nav + back-to-top ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('mainNav');
  const backTop = document.getElementById('backTop');
  function onScroll() {
    const top = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (top / docHeight) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (nav) nav.classList.toggle('scrolled', top > 40);
    if (backTop) backTop.classList.toggle('show', top > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  const esc = window.ometongEscapeHTML || (s => s);

  /* ---------- Data ---------- */
  let listings = [];
  let profiles = [];
  let orders = [];
  let activity = [];
  const profileMap = {};

  const loadErrorEl = document.getElementById('adminLoadError');

  async function loadAll() {
    if (!window.sb) return;
    if (loadErrorEl) loadErrorEl.hidden = true;
    if (pendingGridLoading()) window.ometongShowLoading?.(document.getElementById('pendingGrid'), 'Loading…');

    const [listingsRes, profilesRes, ordersRes, activityRes] = await Promise.all([
      window.sb.from('listings').select('*').order('created_at', { ascending: false }),
      window.sb.from('profiles').select('*').order('created_at', { ascending: false }),
      window.sb.from('orders').select('*').order('created_at', { ascending: false }),
      window.sb.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    if (listingsRes.error) console.error('Ometong: failed to load listings', listingsRes.error);
    if (profilesRes.error) console.error('Ometong: failed to load profiles', profilesRes.error);
    if (ordersRes.error) console.error('Ometong: failed to load orders', ordersRes.error);
    if (activityRes.error) console.error('Ometong: failed to load activity log', activityRes.error);

    const anyError = listingsRes.error || profilesRes.error || ordersRes.error || activityRes.error;
    if (anyError && loadErrorEl) {
      loadErrorEl.innerHTML = "Some dashboard data couldn't be loaded — parts of this page may be incomplete or out of date. " +
        '<button type="button" class="link-inline" id="adminLoadRetry">Try again</button>';
      loadErrorEl.hidden = false;
      document.getElementById('adminLoadRetry')?.addEventListener('click', async () => {
        await loadAll();
        renderAll();
      });
    }

    listings = listingsRes.data || [];
    profiles = profilesRes.data || [];
    orders = ordersRes.data || [];
    activity = activityRes.data || [];
    profiles.forEach(p => { profileMap[p.id] = p; });
  }

  // Only show the brief loading text in the pending-approvals grid if
  // it's currently empty (first load) — avoids flashing "Loading…"
  // over real content on a background refresh.
  function pendingGridLoading() {
    const el = document.getElementById('pendingGrid');
    return el && !el.children.length;
  }

  /* ---------- Pending approval ---------- */
  const pendingGrid = document.getElementById('pendingGrid');
  const pendingEmpty = document.getElementById('pendingEmpty');
  const listingColors = ['#3A6FF7', '#8B5CF6', '#22C55E', '#FFC24D', '#FF7431', '#EF4444'];

  function thumbSvg(color) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'><rect width='200' height='100' fill='${color}22'/><circle cx='40' cy='50' r='22' fill='${color}55'/><rect x='80' y='30' width='100' height='12' rx='6' fill='${color}66'/><rect x='80' y='52' width='70' height='10' rx='5' fill='${color}44'/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function sellerName(supplierId) {
    const p = profileMap[supplierId];
    return (p && (p.business_name || p.full_name)) || 'Unknown seller';
  }

  function renderPending() {
    if (!pendingGrid) return;
    const pending = listings.filter(l => !l.is_approved);
    if (pending.length === 0) {
      pendingGrid.innerHTML = '';
      pendingGrid.style.display = 'none';
      if (pendingEmpty) pendingEmpty.hidden = false;
      return;
    }
    pendingGrid.style.display = 'grid';
    if (pendingEmpty) pendingEmpty.hidden = true;

    pendingGrid.innerHTML = pending.map((item, i) => {
      const color = listingColors[i % listingColors.length];
      const moqLabel = item.moq ? `MOQ ${item.moq.toLocaleString('en-US')}` : 'No MOQ set';
      return `
        <div class="listing-card" data-id="${item.id}">
          <div class="listing-thumb" style="background-image:url('${item.image_url ? esc(item.image_url) : thumbSvg(color)}');background-size:cover;">
            <span class="listing-status pending">Pending review</span>
          </div>
          <div class="listing-body">
            <div class="listing-title">${esc(item.title)}</div>
            <div class="listing-meta">${esc(sellerName(item.supplier_id))} · ${esc(item.category)} · ${moqLabel}${item.hs_code ? ' · HS ' + esc(item.hs_code) : ''}</div>
            <div class="listing-price">$${Number(item.price).toLocaleString('en-US')} <span style="color:var(--ink-faint);font-weight:600;font-size:.72rem;">/ unit</span></div>
            <div class="admin-row-actions" style="margin-top:10px;">
              <button class="btn-approve" data-approve="${item.id}">Approve</button>
              <button class="btn-reject" data-reject="${item.id}">Reject</button>
            </div>
          </div>
        </div>`;
    }).join('');

    pendingGrid.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => approveListing(btn.getAttribute('data-approve'), btn));
    });
    pendingGrid.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => rejectListing(btn.getAttribute('data-reject'), btn));
    });
  }

  async function approveListing(id, btn) {
    btn.disabled = true;
    const { error } = await window.sb.from('listings').update({ is_approved: true }).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to approve listing', error); return; }
    const item = listings.find(l => String(l.id) === id);
    if (item) item.is_approved = true;
    renderAll();
  }

  async function rejectListing(id, btn) {
    btn.disabled = true;
    const { error } = await window.sb.from('listings').update({ status: 'paused' }).eq('id', id);
    btn.disabled = false;
    if (error) { console.error('Ometong: failed to reject listing', error); return; }
    const item = listings.find(l => String(l.id) === id);
    if (item) item.status = 'paused';
    renderAll();
  }

  /* ---------- All listings table ---------- */
  const listingsTableBody = document.getElementById('listingsTableBody');
  const listingsTable = document.getElementById('listingsTable');
  const listingsEmpty = document.getElementById('listingsEmpty');

  function renderListingsTable() {
    if (!listingsTableBody) return;
    if (listings.length === 0) {
      listingsTable.style.display = 'none';
      if (listingsEmpty) listingsEmpty.hidden = false;
      return;
    }
    listingsTable.style.display = '';
    if (listingsEmpty) listingsEmpty.hidden = true;

    listingsTableBody.innerHTML = listings.map(item => {
      const badgeClass = !item.is_approved ? 'pending' : (item.status === 'active' ? 'active' : 'paused');
      const badgeLabel = !item.is_approved ? 'Pending' : (item.status === 'active' ? 'Live' : 'Paused');
      const toggleLabel = item.status === 'active' ? 'Pause' : 'Reactivate';
      return `
        <div class="admin-row">
          <span>${esc(item.title)}</span>
          <span>${esc(sellerName(item.supplier_id))}</span>
          <span>$${Number(item.price).toLocaleString('en-US')}</span>
          <span><span class="admin-badge ${badgeClass}">${badgeLabel}</span></span>
          <span class="admin-row-actions">
            ${!item.is_approved ? `<button data-approve="${item.id}">Approve</button>` : ''}
            <button data-toggle="${item.id}">${toggleLabel}</button>
          </span>
        </div>`;
    }).join('');

    listingsTableBody.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => approveListing(btn.getAttribute('data-approve'), btn));
    });
    listingsTableBody.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-toggle');
        const item = listings.find(l => String(l.id) === id);
        if (!item) return;
        const next = item.status === 'active' ? 'paused' : 'active';
        btn.disabled = true;
        const { error } = await window.sb.from('listings').update({ status: next }).eq('id', id);
        btn.disabled = false;
        if (error) { console.error('Ometong: failed to update listing', error); return; }
        item.status = next;
        renderAll();
      });
    });
  }

  /* ---------- Users table ---------- */
  const usersTableBody = document.getElementById('usersTableBody');
  const usersTable = document.getElementById('usersTable');
  const usersEmpty = document.getElementById('usersEmpty');
  const usersBreakdown = document.getElementById('usersBreakdown');

  function renderUsers() {
    if (!usersTableBody) return;
    if (profiles.length === 0) {
      usersTable.style.display = 'none';
      if (usersEmpty) usersEmpty.hidden = false;
      return;
    }
    usersTable.style.display = '';
    if (usersEmpty) usersEmpty.hidden = true;

    const counts = { buyer: 0, supplier: 0, manufacturer: 0, admin: 0 };
    profiles.forEach(p => { if (counts[p.role] !== undefined) counts[p.role]++; });
    if (usersBreakdown) {
      usersBreakdown.textContent = `${counts.buyer} buyers · ${counts.supplier} suppliers · ${counts.manufacturer} manufacturers · ${counts.admin} admins`;
    }

    usersTableBody.innerHTML = profiles.map(p => {
      const name = p.business_name || p.full_name || '—';
      const joined = p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      return `
        <div class="admin-row">
          <span>${esc(name)}</span>
          <span><span class="admin-badge ${esc(p.role)}">${esc(p.role)}</span></span>
          <span>${esc(p.email)}</span>
          <span>${joined}</span>
        </div>`;
    }).join('');
  }

  /* ---------- Orders ---------- */
  const ordersList = document.getElementById('ordersList');
  const ordersHead = document.getElementById('ordersHead');
  const ordersEmpty = document.getElementById('ordersEmpty');

  function buyerName(buyerId) {
    const p = profileMap[buyerId];
    return (p && (p.full_name || p.business_name)) || 'Unknown buyer';
  }

  function renderOrders() {
    if (!ordersList) return;
    if (orders.length === 0) {
      ordersList.innerHTML = '';
      if (ordersHead) ordersHead.style.display = 'none';
      if (ordersEmpty) ordersEmpty.hidden = false;
      return;
    }
    if (ordersHead) ordersHead.style.display = '';
    if (ordersEmpty) ordersEmpty.hidden = true;

    ordersList.innerHTML = orders.map(o => {
      const shortId = String(o.id).slice(0, 8);
      const placed = o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      return `
        <div class="order-row">
          <div>
            <div class="order-buyer">${esc(buyerName(o.buyer_id))}</div>
            <div class="order-buyer-sub">${placed}</div>
          </div>
          <div class="order-product-name">#${shortId}</div>
          <div class="order-amount">$${Number(o.total).toLocaleString('en-US')}</div>
          <div><span class="admin-badge ${o.status === 'pending' ? 'pending' : 'active'}">${esc(o.status)}</span></div>
          <div></div>
        </div>`;
    }).join('');
  }

  /* ---------- Activity log ---------- */
  const activityTableBody = document.getElementById('activityTableBody');
  const activityTable = document.getElementById('activityTable');
  const activityEmpty = document.getElementById('activityEmpty');

  const actionLabels = {
    listing_approved: 'Listing approved',
    listing_status_changed: 'Listing status changed',
    listing_updated: 'Listing updated',
    role_changed: 'Role changed'
  };

  function actorLabel(entry) {
    if (!entry.actor_id) return 'Site owner (SQL Editor)';
    const p = profileMap[entry.actor_id];
    const name = p ? (p.business_name || p.full_name || p.email) : 'Unknown user';
    return entry.actor_is_admin ? `${name} (admin)` : name;
  }

  function activityDetails(entry) {
    if (entry.table_name === 'listings') {
      const title = listings.find(l => String(l.id) === String(entry.record_id))?.title || entry.record_id;
      if (entry.action === 'listing_approved') return `Approved "${title}"`;
      const oldStatus = entry.old_data?.status;
      const newStatus = entry.new_data?.status;
      return `"${title}" — ${oldStatus} → ${newStatus}`;
    }
    if (entry.table_name === 'profiles') {
      const oldRole = entry.old_data?.role;
      const newRole = entry.new_data?.role;
      return `${oldRole} → ${newRole}`;
    }
    return '—';
  }

  function renderActivity() {
    if (!activityTableBody) return;
    if (activity.length === 0) {
      activityTable.style.display = 'none';
      if (activityEmpty) activityEmpty.hidden = false;
      return;
    }
    activityTable.style.display = '';
    if (activityEmpty) activityEmpty.hidden = true;

    activityTableBody.innerHTML = activity.map(entry => {
      const when = entry.created_at ? new Date(entry.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
      return `
        <div class="admin-row admin-row--activity">
          <span>${when}</span>
          <span>${esc(actionLabels[entry.action] || entry.action)}</span>
          <span>${esc(actorLabel(entry))}</span>
          <span>${esc(activityDetails(entry))}</span>
        </div>`;
    }).join('');
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    const pendingCount = listings.filter(l => !l.is_approved).length;
    const setNum = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setNum('statPending', pendingCount);
    setNum('statListings', listings.length);
    setNum('statUsers', profiles.length);
    setNum('statOrders', orders.length);
  }

  function renderAll() {
    renderPending();
    renderListingsTable();
    renderUsers();
    renderOrders();
    renderActivity();
    renderStats();
  }

  (async () => {
    await loadAll();
    renderAll();
  })();

  /* ---------- Quick jump active-section highlight ----------
     Purely cosmetic scroll-spy for the pill row under the dashboard
     header — mirrors the same pattern used on privacy.html/terms.html. */
  const quickJumpLinks = document.querySelectorAll('.quick-jump a');
  const quickJumpSections = [...quickJumpLinks]
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (quickJumpLinks.length && quickJumpSections.length && 'IntersectionObserver' in window) {
    const jumpIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = '#' + entry.target.id;
          quickJumpLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === id));
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    quickJumpSections.forEach(sec => jumpIo.observe(sec));
  }

});
