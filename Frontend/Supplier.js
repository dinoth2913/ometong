/* =========================================================
   OMEGO MARKET — SUPPLIER DASHBOARD SCRIPT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = themeToggle?.querySelector('.sun-icon');
  const moonIcon = themeToggle?.querySelector('.moon-icon');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) setTheme(savedTheme);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  else setTheme('light');

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Supplier Dashboard Logic ---------- */
  const supplierSelect = document.getElementById('supplierSelect');
  const supplierNameDisplay = document.getElementById('supplierNameDisplay');
  const pendingTotalEl = document.getElementById('pendingTotal');
  const clearedTotalEl = document.getElementById('clearedTotal');
  const orderCountEl = document.getElementById('orderCount');
  const ordersTableBody = document.getElementById('ordersTableBody');
  const emptyState = document.getElementById('emptyState');
  const refreshBtn = document.getElementById('refreshBtn');

  function getTransactions() {
    try {
      return JSON.parse(localStorage.getItem('omego_transactions')) || [];
    } catch {
      return [];
    }
  }

  function saveTransactions(transactions) {
    localStorage.setItem('omego_transactions', JSON.stringify(transactions));
  }

  const money = (n) => `$${n.toLocaleString()}`;

  function renderDashboard() {
    const currentSupplier = supplierSelect.value;
    supplierNameDisplay.textContent = currentSupplier;

    const allTransactions = getTransactions();
    const supplierTransactions = allTransactions.filter(t => t.supplier === currentSupplier);

    // Calculate Stats
    let pending = 0;
    let cleared = 0;
    
    supplierTransactions.forEach(t => {
      if (t.status === 'pending') pending += t.total;
      else if (t.status === 'cleared') cleared += t.total;
    });

    pendingTotalEl.textContent = money(pending);
    clearedTotalEl.textContent = money(cleared);
    orderCountEl.textContent = supplierTransactions.length;

    // Render Table
    if (supplierTransactions.length === 0) {
      ordersTableBody.innerHTML = '';
      emptyState.style.display = 'flex';
      ordersTableBody.parentElement.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      ordersTableBody.parentElement.style.display = 'table';
      
      // Sort by newest first
      supplierTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      ordersTableBody.innerHTML = supplierTransactions.map((t, index) => {
        const dateObj = new Date(t.date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const isPending = t.status === 'pending';
        
        return `
          <tr>
            <td><strong>${t.orderId}</strong></td>
            <td>${dateStr}</td>
            <td>${t.productTitle}</td>
            <td>${t.qty}</td>
            <td><strong>${money(t.total)}</strong></td>
            <td><span class="badge ${isPending ? 'pending' : 'cleared'}">${isPending ? 'Escrow Held' : 'Funds Cleared'}</span></td>
            <td>
              <button class="action-btn" data-id="${t.orderId}-${t.productId}" ${!isPending ? 'disabled' : ''}>
                ${isPending ? 'Confirm Delivery' : 'Completed'}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Handle supplier change
  supplierSelect?.addEventListener('change', renderDashboard);
  
  // Handle refresh button
  refreshBtn?.addEventListener('click', renderDashboard);

  // Handle Confirm Delivery actions
  ordersTableBody?.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-btn');
    if (!btn || btn.disabled) return;

    const btnId = btn.dataset.id;
    const allTransactions = getTransactions();
    
    const transactionIndex = allTransactions.findIndex(t => `${t.orderId}-${t.productId}` === btnId);
    if (transactionIndex !== -1) {
      // Simulate API call delay
      const originalText = btn.textContent;
      btn.textContent = 'Processing...';
      btn.disabled = true;

      setTimeout(() => {
        allTransactions[transactionIndex].status = 'cleared';
        saveTransactions(allTransactions);
        renderDashboard();
      }, 600);
    }
  });

  // Initial render
  renderDashboard();
});
