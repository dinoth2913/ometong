/* =========================================================
   OMETONG — NOTIFICATION BELL (shared across every dashboard)
   public.notifications gets rows written to it by triggers all over
   the schema (new inquiry message, new contact message, new refund
   request, new supplier application, order status changes, and
   more) — this reads them back. RLS ("Users can view/mark their own
   notifications") already scopes every query to whoever's actually
   logged in, so this one file works unchanged for buyers, suppliers,
   manufacturers and admins alike — it was only ever wired into the
   Admin dashboard's HTML before, even though nothing about the
   script itself is admin-specific.
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

  const wrap = document.getElementById('notifBellWrap');
  const bellBtn = document.getElementById('notifBellBtn');
  const badge = document.getElementById('notifBellBadge');
  const dropdown = document.getElementById('notifDropdown');
  const body = document.getElementById('notifDropdownBody');
  const emptyEl = document.getElementById('notifEmpty');
  const markAllBtn = document.getElementById('notifMarkAllBtn');
  if (!wrap) return; // not on this page

  let notifications = [];

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.round(hrs / 24) + 'd';
  }

  async function loadNotifications() {
    const { data, error } = await window.sb
      .from('notifications')
      .select('*')
      .eq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) { console.error('Ometong: failed to load notifications', error); return; }
    notifications = data || [];
    render();
  }

  function render() {
    const unread = notifications.filter(n => !n.is_read).length;
    if (unread > 0) {
      badge.hidden = false;
      badge.textContent = unread > 9 ? '9+' : unread;
    } else {
      badge.hidden = true;
    }

    if (!notifications.length) {
      body.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    body.innerHTML = notifications.map(n => `
      <a class="notif-row${n.is_read ? '' : ' unread'}" data-id="${n.id}" href="${n.link_url ? esc(n.link_url) : '#'}">
        <span class="notif-row-title">${esc(n.title)}</span>
        ${n.body ? `<span class="notif-row-body">${esc(n.body)}</span>` : ''}
        <span class="notif-row-time">${timeAgo(n.created_at)} ago</span>
      </a>
    `).join('');

    body.querySelectorAll('.notif-row').forEach(row => {
      row.addEventListener('click', () => markRead(row.getAttribute('data-id')));
    });
  }

  async function markRead(id) {
    const n = notifications.find(x => x.id === id);
    if (!n || n.is_read) return;
    n.is_read = true;
    render();
    const { error } = await window.sb.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error('Ometong: failed to mark notification read', error);
  }

  markAllBtn?.addEventListener('click', async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;
    notifications.forEach(n => { n.is_read = true; });
    render();
    const { error } = await window.sb.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (error) console.error('Ometong: failed to mark all notifications read', error);
  });

  bellBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    bellBtn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) loadNotifications();
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) dropdown.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dropdown.hidden = true;
  });

  await loadNotifications();
  // Light polling so the badge count stays current without a full
  // page reload — cheap, and matches how the rest of the dashboards
  // already just re-fetch on demand rather than using realtime
  // subscriptions.
  setInterval(loadNotifications, 60000);
});
