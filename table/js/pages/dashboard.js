/* =========================================================
   TableBook — Dashboard: stat cards + today's reservations
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  var ICONS = {
    calendar: '<svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zM8 13h3v3H8z"/></svg>',
    occupancy: '<svg viewBox="0 0 24 24"><path d="M3 9h18M6 9l-2 11M18 9l2 11M8 5h8l1 4H7z"/></svg>',
    customers: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0z"/></svg>',
    revenue: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 1.6 2.7 5 3.3 5 1.4 5 3.2-2.2 3-5 3-5-1.1-5-3"/></svg>'
  };

  var AVG_SPEND = 45; // estimated per-guest spend for revenue estimate

  function computeStats() {
    var D = TB.data;
    var today = D.todayISO();

    var todays = D.bookings.filter(function (b) {
      return b.date === today && b.status !== 'Cancelled' && b.status !== 'No-Show';
    });

    var occupied = D.tables.filter(function (t) { return t.status === 'Occupied'; }).length;
    var reserved = D.tables.filter(function (t) { return t.status === 'Reserved'; }).length;
    var bookable = D.tables.filter(function (t) { return t.status !== 'Out of Service'; }).length;
    var occupancyPct = bookable ? Math.round(((occupied + reserved) / bookable) * 100) : 0;

    var revenue = todays.reduce(function (sum, b) { return sum + b.partySize * AVG_SPEND; }, 0);

    return {
      todays: todays,
      occupancyPct: occupancyPct,
      occupied: occupied,
      reserved: reserved,
      bookable: bookable,
      customers: D.customers.length,
      revenue: revenue
    };
  }

  function rowsHtml(todays) {
    var D = TB.data;
    return todays
      .slice()
      .sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; })
      .map(function (b) {
        var t = D.tableById(b.tableId);
        var c = D.customerById(b.customerId);
        return '<tr>' +
          '<td class="cell-strong">' + TB.ui.esc(D.fmtTime(b.time)) + '</td>' +
          '<td>' + TB.ui.esc(c ? c.name : 'Walk-in') + '</td>' +
          '<td>' + TB.ui.esc(t ? t.name : '—') + '</td>' +
          '<td>' + b.partySize + '</td>' +
          '<td>' + TB.ui.esc(b.occasion || '—') + '</td>' +
          '<td>' + TB.ui.badge(b.status) + '</td>' +
          '</tr>';
      }).join('');
  }

  TB.pages.dashboard = function (root) {
    var D = TB.data, ui = TB.ui;
    var s = computeStats();

    root.innerHTML =
      ui.pageHead('Dashboard', 'A live snapshot of your restaurant today.',
        '<button class="btn btn-primary" data-act="new-booking">+ New Booking</button>') +

      '<div class="stat-grid">' +
      ui.statCard(ICONS.calendar, "Today's Reservations", String(s.todays.length),
        s.todays.filter(function (b) { return b.status === 'Confirmed'; }).length + ' confirmed', 'purple') +
      ui.statCard(ICONS.occupancy, 'Table Occupancy', s.occupancyPct + '%',
        s.occupied + ' seated · ' + s.reserved + ' reserved', 'blue') +
      ui.statCard(ICONS.customers, 'Total Customers', String(s.customers),
        D.customers.filter(function (c) { return c.visits >= 10; }).length + ' regulars', 'green') +
      ui.statCard(ICONS.revenue, 'Est. Revenue', '$' + s.revenue.toLocaleString(),
        'Based on today\'s covers', 'amber') +
      '</div>' +

      '<div class="panel">' +
      '<div class="panel-head"><h4>Today\'s Reservations</h4>' +
      '<span class="chip">' + D.fmtDate(D.todayISO()) + '</span></div>' +
      (s.todays.length ?
        '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr><th>Time</th><th>Customer</th><th>Table</th><th>Party</th><th>Occasion</th><th>Status</th></tr></thead>' +
        '<tbody>' + rowsHtml(s.todays) + '</tbody></table></div>'
        : ui.emptyState('No reservations today', 'Bookings created for today will appear here.')) +
      '</div>';

    var btn = root.querySelector('[data-act="new-booking"]');
    if (btn) btn.addEventListener('click', function () {
      TB.openBookingModal(null, function () { TB.refresh(); });
    });
  };
})();
