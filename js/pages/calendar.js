/* =========================================================
   TableBook — Booking Calendar: grouped by date
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  function esc(s) { return TB.ui.esc(s); }

  var range = 'upcoming'; // 'upcoming' | 'all' | 'past'

  function filtered() {
    var D = TB.data, today = D.todayISO();
    return D.bookings.filter(function (b) {
      if (range === 'upcoming') return b.date >= today;
      if (range === 'past') return b.date < today;
      return true;
    });
  }

  function dayBadgeClass(iso) {
    var D = TB.data;
    if (iso === D.todayISO()) return 'cal-day-today';
    if (iso < D.todayISO()) return 'cal-day-past';
    return '';
  }

  TB.pages.calendar = function (root) {
    var D = TB.data, ui = TB.ui;

    var list = filtered().slice().sort(function (a, b) {
      return (a.date + a.time) < (b.date + b.time) ? -1 : 1;
    });

    // group by date
    var groups = [];
    var index = {};
    list.forEach(function (b) {
      if (!index[b.date]) {
        index[b.date] = { date: b.date, items: [] };
        groups.push(index[b.date]);
      }
      index[b.date].items.push(b);
    });

    var ranges = [
      { id: 'upcoming', label: 'Upcoming' },
      { id: 'all', label: 'All' },
      { id: 'past', label: 'Past' }
    ];
    var rangeHtml = ranges.map(function (r) {
      return '<button class="filter-chip' + (r.id === range ? ' is-active' : '') +
        '" data-range="' + r.id + '">' + r.label + '</button>';
    }).join('');

    var body = groups.length ? groups.map(function (g) {
      var covers = g.items.reduce(function (s, b) { return s + b.partySize; }, 0);
      var rows = g.items.map(function (b) {
        var c = D.customerById(b.customerId);
        var t = D.tableById(b.tableId);
        return '<div class="cal-row">' +
          '<span class="cal-time">' + esc(D.fmtTime(b.time)) + '</span>' +
          '<span class="cal-main"><b>' + esc(c ? c.name : 'Walk-in') + '</b>' +
          '<small>' + esc(t ? t.name : '—') + ' · party of ' + b.partySize +
          (b.occasion ? ' · ' + esc(b.occasion) : '') + '</small></span>' +
          '<span class="cal-dur">' + b.duration + 'm</span>' +
          ui.badge(b.status) +
          '<span class="cal-actions"><button class="btn btn-ghost btn-sm" data-edit="' + b.id + '">Edit</button></span>' +
          '</div>';
      }).join('');

      return '<div class="cal-day ' + dayBadgeClass(g.date) + '">' +
        '<div class="cal-day-head">' +
        '<div><h5>' + esc(D.fmtDateLong(g.date)) + '</h5>' +
        (g.date === D.todayISO() ? '<span class="chip">Today</span>' : '') + '</div>' +
        '<span class="cal-day-meta">' + g.items.length + ' booking' + (g.items.length === 1 ? '' : 's') +
        ' · ' + covers + ' covers</span>' +
        '</div>' + rows + '</div>';
    }).join('') : ui.emptyState('Nothing here',
      range === 'upcoming' ? 'No upcoming bookings.' : 'No bookings in this range.');

    root.innerHTML =
      ui.pageHead('Booking Calendar', 'Reservations grouped by date, newest slots first.',
        '<button class="btn btn-primary" data-act="add">+ New Booking</button>') +
      '<div class="panel">' +
      '<div class="toolbar"><div class="filter-chips">' + rangeHtml + '</div></div>' +
      '<div class="cal-list">' + body + '</div>' +
      '</div>';

    root.querySelector('[data-act="add"]').addEventListener('click', function () {
      TB.openBookingModal(null, function () { TB.refresh(); });
    });

    root.querySelectorAll('[data-range]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        range = chip.dataset.range;
        TB.refresh();
      });
    });

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var b = D.bookingById(btn.dataset.edit);
        if (b) TB.openBookingModal(b, function () { TB.refresh(); });
      });
    });
  };
})();
