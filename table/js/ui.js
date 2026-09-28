/* =========================================================
   TableBook — UI kit: modal, toasts, badges, shared helpers
   ========================================================= */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.TB = window.TB || {};

  /* ---------------- Badges ---------------- */
  var BADGE_CLASS = {
    'Available': 'badge-green',
    'Reserved': 'badge-blue',
    'Occupied': 'badge-purple',
    'Out of Service': 'badge-gray',
    'Pending': 'badge-amber',
    'Confirmed': 'badge-blue',
    'Seated': 'badge-green',
    'Cancelled': 'badge-gray',
    'No-Show': 'badge-red'
  };

  function badgeClass(status) {
    return BADGE_CLASS[status] || 'badge-gray';
  }

  function badge(status) {
    return '<span class="badge ' + badgeClass(status) + '">' + esc(status) + '</span>';
  }

  /* ---------------- Toasts ---------------- */
  function toast(message, type) {
    var stack = $('#toastStack');
    if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'success');
    el.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (type === 'error' ? '<path d="M12 8v5M12 17h.01M10.3 3.9L2.5 18a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>'
        : '<path d="M20 6L9 17l-5-5"/>') +
      '</svg><span>' + esc(message) + '</span>';
    stack.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 20);
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 3200);
  }

  /* ---------------- Modal ---------------- */
  var backdrop = null, form = null, titleEl = null, footEl = null, closeBtn = null;
  var onSubmitCb = null, lastFocused = null;

  function initModal() {
    backdrop = $('#modalBackdrop');
    form = $('#modalForm');
    titleEl = $('#modalTitle');
    footEl = $('#modalFoot');
    closeBtn = $('#modalClose');

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) closeModal();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (onSubmitCb) onSubmitCb(readForm(form), form);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop && !backdrop.hidden) closeModal();
    });
  }

  function readForm(frm) {
    var data = {};
    Array.prototype.forEach.call(frm.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else data[el.name] = (el.value || '').trim();
    });
    return data;
  }

  /**
   * openModal({ title, body, submitLabel, danger, onSubmit(data, form) -> true closes })
   */
  function openModal(opts) {
    if (!backdrop) initModal();
    lastFocused = document.activeElement;
    titleEl.textContent = opts.title;
    form.innerHTML = opts.body;
    footEl.innerHTML =
      '<button type="button" class="btn btn-ghost" id="modalCancel">' + esc(opts.cancelLabel || 'Cancel') + '</button>' +
      '<button type="submit" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" form="modalForm">' +
      esc(opts.submitLabel || 'Save') + '</button>';
    onSubmitCb = opts.onSubmit || null;
    clearTimeout(closeTimer);
    backdrop.classList.remove('is-closing');
    backdrop.hidden = false;
    document.body.classList.add('modal-open');
    $('#modalCancel').addEventListener('click', closeModal);
    var first = form.querySelector('input, select, textarea');
    if (first) setTimeout(function () { first.focus(); }, 30);
  }

  var closeTimer = null;

  function closeModal() {
    if (!backdrop || backdrop.hidden || backdrop.classList.contains('is-closing')) return;
    /* clear the callback immediately so a double-submit during the
       160ms close animation cannot fire the action twice */
    onSubmitCb = null;
    var reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* matchMedia unavailable */ }

    function finish() {
      clearTimeout(closeTimer);
      backdrop.classList.remove('is-closing');
      backdrop.hidden = true;
      document.body.classList.remove('modal-open');
      form.innerHTML = '';
      onSubmitCb = null;
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    if (reduced) return finish();

    /* dim + scale-out before hiding (160ms, well under 400ms) */
    backdrop.classList.add('is-closing');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(finish, 160);
  }

  /* ---------------- Confirm ---------------- */
  function confirm(opts, onYes) {
    openModal({
      title: opts.title || 'Are you sure?',
      body: '<p class="confirm-text">' + esc(opts.message || '') + '</p>',
      submitLabel: opts.confirmLabel || 'Delete',
      danger: true,
      onSubmit: function () { closeModal(); onYes(); return true; }
    });
  }

  /* ---------------- Small view helpers ---------------- */
  function statCard(iconSvg, label, value, sub, tone) {
    return '<div class="stat-card tone-' + (tone || 'purple') + '">' +
      '<div class="stat-head">' +
      '<span class="stat-label">' + esc(label) + '</span>' +
      '<span class="stat-icon">' + iconSvg + '</span>' +
      '</div>' +
      '<span class="stat-value">' + esc(value) + '</span>' +
      '<span class="stat-sub">' + esc(sub || '') + '</span>' +
      '</div>';
  }

  function emptyState(title, sub) {
    return '<div class="empty-state">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>' +
      '<h4>' + esc(title) + '</h4><p>' + esc(sub || '') + '</p></div>';
  }

  function pageHead(title, sub, actionHtml) {
    return '<div class="page-head"><div><h3>' + esc(title) + '</h3>' +
      '<p class="page-sub">' + esc(sub || '') + '</p></div>' +
      '<div class="page-actions">' + (actionHtml || '') + '</div></div>';
  }

  TB.ui = {
    $: $, esc: esc, badge: badge, badgeClass: badgeClass, toast: toast,
    openModal: openModal, closeModal: closeModal, confirm: confirm,
    statCard: statCard, emptyState: emptyState, pageHead: pageHead
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModal);
  } else {
    initModal();
  }
})();
