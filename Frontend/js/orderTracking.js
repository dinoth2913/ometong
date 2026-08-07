/* =========================================================
   OMETONG — ORDER TRACKING MODAL (shared by buyer/supplier/manufacturer)
   Self-injecting, like chatWidget.js — include the script tag and
   call window.OmetongOrderTracking.open(orderId, { mode }) from any
   dashboard's own order-row "Track"/"Manage" button.

   mode: 'view'   — buyer: read-only timeline + shipping info.
         'manage' — supplier/manufacturer: same timeline, plus editable
                    carrier/tracking number/ETA and a button to move
                    the order forward one stage (paid -> processing ->
                    shipped -> delivered). The database itself only
                    allows that exact forward sequence — see
                    supabase/order_fulfillment_access_schema.sql.
========================================================= */
(function () {
  'use strict';

  const STATUS_SEQUENCE = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
  const STEP_LABELS = {
    pending: 'Order placed',
    paid: 'Payment confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered'
  };
  const NEXT_STATUS = { paid: 'processing', processing: 'shipped', shipped: 'delivered' };
  const NEXT_LABEL = { paid: 'Mark as Processing', processing: 'Mark as Shipped', shipped: 'Mark as Delivered' };

  let overlay, modal, els;
  let currentOrderId = null;
  let currentMode = 'view';

  function esc(s) { return window.ometongEscapeHTML ? window.ometongEscapeHTML(s) : s; }

  function ensureModal() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'ot-overlay';
    overlay.innerHTML = `
      <div class="ot-modal" role="dialog" aria-modal="true">
        <button class="ot-close" id="otClose" aria-label="Close">&times;</button>
        <h3 class="ot-title" id="otTitle">Order</h3>
        <p class="ot-subtitle" id="otSubtitle"></p>

        <div class="ot-ship-info">
          <div><span>Carrier</span><strong id="otCarrier">—</strong></div>
          <div><span>Tracking #</span><strong id="otTrackingNum">—</strong></div>
          <div><span>Est. delivery</span><strong id="otEta">—</strong></div>
        </div>

        <div class="ot-timeline" id="otTimeline"></div>

        <div class="ot-edit" id="otEdit" hidden>
          <div class="ot-edit-row">
            <label>Carrier <input id="otCarrierInput" placeholder="e.g. DHL, Maersk"></label>
            <label>Tracking number <input id="otTrackingInput" placeholder="e.g. 1Z999AA10123456784"></label>
          </div>
          <label>Estimated delivery <input type="date" id="otEtaInput"></label>
          <p class="ot-msg" id="otMsg" hidden></p>
          <div class="ot-edit-actions">
            <button class="btn btn-ghost btn-sm" id="otSaveDetailsBtn" type="button">Save shipping details</button>
            <button class="btn btn-primary btn-sm" id="otAdvanceBtn" type="button" hidden></button>
          </div>
        </div>

        <div class="ot-refund" id="otRefund" hidden>
          <div class="ot-refund-status" id="otRefundStatus" hidden></div>
          <form class="ot-refund-form" id="otRefundForm" hidden>
            <label>What went wrong? <textarea id="otRefundReason" rows="2" placeholder="e.g. item arrived damaged" required></textarea></label>
            <label>Amount requested (USD) <input type="number" id="otRefundAmount" min="0" step="0.01" required></label>
            <p class="ot-msg" id="otRefundMsg" hidden></p>
            <button type="submit" class="btn btn-ghost btn-sm">Request a refund</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    els = {
      title: overlay.querySelector('#otTitle'),
      subtitle: overlay.querySelector('#otSubtitle'),
      carrier: overlay.querySelector('#otCarrier'),
      trackingNum: overlay.querySelector('#otTrackingNum'),
      eta: overlay.querySelector('#otEta'),
      timeline: overlay.querySelector('#otTimeline'),
      edit: overlay.querySelector('#otEdit'),
      carrierInput: overlay.querySelector('#otCarrierInput'),
      trackingInput: overlay.querySelector('#otTrackingInput'),
      etaInput: overlay.querySelector('#otEtaInput'),
      msg: overlay.querySelector('#otMsg'),
      saveDetailsBtn: overlay.querySelector('#otSaveDetailsBtn'),
      advanceBtn: overlay.querySelector('#otAdvanceBtn'),
      refund: overlay.querySelector('#otRefund'),
      refundStatus: overlay.querySelector('#otRefundStatus'),
      refundForm: overlay.querySelector('#otRefundForm'),
      refundReason: overlay.querySelector('#otRefundReason'),
      refundAmount: overlay.querySelector('#otRefundAmount'),
      refundMsg: overlay.querySelector('#otRefundMsg')
    };
    els.refundForm.addEventListener('submit', submitRefundRequest);

    overlay.querySelector('#otClose').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

    els.saveDetailsBtn.addEventListener('click', saveShippingDetails);
    els.advanceBtn.addEventListener('click', advanceStatus);
  }

  function close() {
    overlay?.classList.remove('open');
    currentOrderId = null;
  }

  function showMsg(text, isError) {
    els.msg.textContent = text;
    els.msg.className = 'ot-msg ' + (isError ? 'error' : 'success');
    els.msg.hidden = false;
  }

  function fmtDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function renderTimeline(order, history) {
    const isTerminalBad = order.status === 'cancelled' || order.status === 'refunded';
    const reached = {};
    history.forEach(h => { if (!(h.status in reached)) reached[h.status] = h.created_at; });

    let currentIndex = STATUS_SEQUENCE.indexOf(order.status === 'completed' ? 'delivered' : order.status);
    if (currentIndex === -1) currentIndex = isTerminalBad ? STATUS_SEQUENCE.length - 1 : 0;

    let html = STATUS_SEQUENCE.map((status, i) => {
      const label = (status === 'delivered' && order.status === 'completed') ? 'Completed' : STEP_LABELS[status];
      const isDone = i <= currentIndex && !isTerminalBad;
      const isCurrent = i === currentIndex && !isTerminalBad;
      const ts = reached[status] || (status === 'pending' ? order.created_at : null);
      const cls = ['ot-step'];
      if (isDone) cls.push('done');
      if (isCurrent) cls.push('current');
      return `
        <div class="${cls.join(' ')}">
          <div class="ot-dot"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></div>
          <div>
            <div class="ot-step-label">${esc(label)}</div>
            ${ts ? `<div class="ot-step-time">${esc(fmtDate(ts))}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    if (isTerminalBad) {
      html += `
        <div class="ot-step cancelled">
          <div class="ot-dot"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
          <div>
            <div class="ot-step-label">${order.status === 'refunded' ? 'Refunded' : 'Cancelled'}</div>
            <div class="ot-step-time">${esc(fmtDate(order.updated_at || order.created_at))}</div>
          </div>
        </div>`;
    }

    els.timeline.innerHTML = html;
  }

  function renderShipInfo(order) {
    els.carrier.textContent = order.carrier || '—';
    els.trackingNum.textContent = order.tracking_number || '—';
    els.eta.textContent = fmtDate(order.estimated_delivery) || '—';
  }

  function renderEdit(order) {
    if (currentMode !== 'manage') { els.edit.hidden = true; return; }
    els.edit.hidden = false;
    els.msg.hidden = true;
    els.carrierInput.value = order.carrier || '';
    els.trackingInput.value = order.tracking_number || '';
    els.etaInput.value = order.estimated_delivery || '';

    const next = NEXT_STATUS[order.status];
    if (next) {
      els.advanceBtn.hidden = false;
      els.advanceBtn.textContent = NEXT_LABEL[order.status];
      els.advanceBtn.disabled = false;
    } else {
      els.advanceBtn.hidden = true;
    }
  }

  async function loadAndRender(orderId) {
    const { data: order, error: orderErr } = await window.sb.from('orders').select('*').eq('id', orderId).single();
    if (orderErr || !order) {
      els.timeline.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">Could not load this order.</p>';
      console.error('Ometong: failed to load order for tracking', orderErr);
      return;
    }
    const { data: history, error: histErr } = await window.sb
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (histErr) console.error('Ometong: failed to load order status history', histErr);

    els.title.textContent = 'Order #' + String(order.id).slice(0, 8).toUpperCase();
    els.subtitle.textContent = 'Placed ' + (fmtDate(order.created_at) || '');

    renderShipInfo(order);
    renderTimeline(order, history || []);
    renderEdit(order);

    overlay._currentOrder = order;

    if (currentMode === 'view') {
      await renderRefund(order);
    } else {
      els.refund.hidden = true;
    }
  }

  const REFUND_ELIGIBLE_STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'completed'];

  async function renderRefund(order) {
    els.refund.hidden = false;
    els.refundMsg.hidden = true;

    const { data: existing, error } = await window.sb
      .from('refund_requests')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error('Ometong: failed to load refund request', error);

    if (existing) {
      els.refundForm.hidden = true;
      els.refundStatus.hidden = false;
      const labels = {
        pending: 'Refund requested — awaiting review.',
        approved: 'Refund approved — you\'ll see it once it\'s been sent back.',
        processed: 'Refund processed.',
        rejected: 'Refund request declined' + (existing.admin_note ? ': ' + existing.admin_note : '.')
      };
      els.refundStatus.textContent = labels[existing.status] || existing.status;
      els.refundStatus.className = 'ot-refund-status ' + existing.status;
      return;
    }

    els.refundStatus.hidden = true;
    if (!REFUND_ELIGIBLE_STATUSES.includes(order.status)) {
      els.refundForm.hidden = true;
      els.refund.hidden = true;
      return;
    }
    els.refundForm.hidden = false;
    els.refundReason.value = '';
    els.refundAmount.value = order.total;
    els.refundAmount.max = order.total;
  }

  async function submitRefundRequest(e) {
    e.preventDefault();
    if (!currentOrderId) return;
    const reason = els.refundReason.value.trim();
    const amount = parseFloat(els.refundAmount.value);
    if (!reason || !(amount >= 0)) return;

    const submitBtn = els.refundForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const { error } = await window.sb.from('refund_requests').insert({
      order_id: currentOrderId,
      buyer_id: overlay._currentOrder.buyer_id,
      reason,
      requested_amount: amount
    });
    submitBtn.disabled = false;
    if (error) {
      console.error('Ometong: failed to submit refund request', error);
      els.refundMsg.textContent = 'Could not submit your request — please try again.';
      els.refundMsg.className = 'ot-msg error';
      els.refundMsg.hidden = false;
      return;
    }
    renderRefund(overlay._currentOrder);
  }

  async function saveShippingDetails() {
    if (!currentOrderId) return;
    els.saveDetailsBtn.disabled = true;
    const patch = {
      carrier: els.carrierInput.value.trim() || null,
      tracking_number: els.trackingInput.value.trim() || null,
      estimated_delivery: els.etaInput.value || null
    };
    const { error } = await window.sb.from('orders').update(patch).eq('id', currentOrderId);
    els.saveDetailsBtn.disabled = false;
    if (error) {
      console.error('Ometong: failed to save shipping details', error);
      showMsg('Could not save — please try again.', true);
      return;
    }
    showMsg('Shipping details saved.', false);
    document.dispatchEvent(new CustomEvent('ometongOrderUpdated', { detail: { orderId: currentOrderId } }));
    loadAndRender(currentOrderId);
  }

  async function advanceStatus() {
    if (!currentOrderId || !overlay._currentOrder) return;
    const next = NEXT_STATUS[overlay._currentOrder.status];
    if (!next) return;
    els.advanceBtn.disabled = true;
    const { error } = await window.sb.from('orders').update({ status: next }).eq('id', currentOrderId);
    els.advanceBtn.disabled = false;
    if (error) {
      console.error('Ometong: failed to advance order status', error);
      showMsg(error.message || 'Could not update status — please try again.', true);
      return;
    }
    showMsg('Order updated — the buyer has been notified.', false);
    document.dispatchEvent(new CustomEvent('ometongOrderUpdated', { detail: { orderId: currentOrderId } }));
    loadAndRender(currentOrderId);
  }

  async function open(orderId, options) {
    if (!window.sb) return;
    ensureModal();
    currentOrderId = orderId;
    currentMode = (options && options.mode) || 'view';
    overlay.classList.add('open');
    els.timeline.innerHTML = '<p style="color:var(--ink-faint);font-size:.85rem;">Loading…</p>';
    await loadAndRender(orderId);
  }

  window.OmetongOrderTracking = { open, close };
})();
