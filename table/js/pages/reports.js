/* =========================================================
   TableBook — Reports: totals, cancellations, revenue,
   bookings-by-status + occupancy-by-table bar charts
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  var AVG_SPEND = 45;

  var ICONS = {
    total: '<svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z"/></svg>',
    cancelled: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    revenue: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 1.6 2.7 5 3.3 5 1.4 5 3.2-2.2 3-5 3-5-1.1-5-3"/></svg>',
    covers: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0z"/></svg>'
  };

  function esc(s) { return TB.ui.esc(s); }

  var STATUS_COLORS = {
    'Pending': '#F59E0B',
    'Confirmed': '#8B5CF6',
    'Seated': '#10B981',
    'Cancelled': '#9CA3AF',
    'No-Show': '#EF4444'
  };

  function verticalChart(data) {
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    return '<div class="bar-chart">' + data.map(function (d) {
      var h = Math.round((d.value / max) * 100);
      return '<div class="bar-col">' +
        '<span class="bar-value">' + d.value + '</span>' +
        '<div class="bar-fill" style="height:' + h + '%;background:' + d.color + '"></div>' +
        '<span class="bar-label">' + esc(d.label) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function horizontalChart(data) {
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    return '<div class="hbar-chart">' + data.map(function (d) {
      var w = Math.round((d.value / max) * 100);
      return '<div class="hbar-row">' +
        '<span class="hbar-label">' + esc(d.label) + '</span>' +
        '<div class="hbar-track"><div class="hbar-fill" style="width:' + w + '%;background:' + d.color + '"></div></div>' +
        '<span class="hbar-value">' + d.display + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  TB.pages.reports = function (root) {
    var D = TB.data, ui = TB.ui;
    var bookings = D.bookings;

    var total = bookings.length;
    var cancelled = bookings.filter(function (b) { return b.status === 'Cancelled'; }).length;
    var noShow = bookings.filter(function (b) { return b.status === 'No-Show'; }).length;
    var active = bookings.filter(function (b) { return b.status !== 'Cancelled' && b.status !== 'No-Show'; });
    var covers = active.reduce(function (s, b) { return s + b.partySize; }, 0);
    var revenue = covers * AVG_SPEND;

    // bookings by status
    var statusData = D.BOOKING_STATUS.map(function (s) {
      return {
        label: s,
        value: bookings.filter(function (b) { return b.status === s; }).length,
        color: STATUS_COLORS[s]
      };
    });

    // occupancy by table (share of active bookings)
    var tableData = D.tables.map(function (t) {
      var count = active.filter(function (b) { return b.tableId === t.id; }).length;
      return {
        label: t.name,
        value: count,
        display: count + (count === 1 ? ' booking' : ' bookings'),
        color: '#8B5CF6'
      };
    }).sort(function (a, b) { return b.value - a.value; });

    var statusBreakdown = D.BOOKING_STATUS.map(function (s) {
      var n = bookings.filter(function (b) { return b.status === s; }).length;
      var pct = total ? Math.round((n / total) * 100) : 0;
      return '<div class="breakdown-row"><span>' + esc(s) + '</span>' +
        '<div class="breakdown-track"><i style="width:' + pct + '%;background:' + STATUS_COLORS[s] + '"></i></div>' +
        '<b>' + n + '</b></div>';
    }).join('');

    root.innerHTML =
      ui.pageHead('Reports', 'Business totals, cancellations and demand at a glance.',
        '<button class="btn btn-ghost" data-act="reset">Reset demo data</button>') +

      '<div class="stat-grid">' +
      ui.statCard(ICONS.total, 'Total Bookings', String(total),
        active.length + ' active · ' + (total - active.length) + ' inactive', 'purple') +
      ui.statCard(ICONS.cancelled, 'Cancellations', String(cancelled + noShow),
        cancelled + ' cancelled · ' + noShow + ' no-show', 'red') +
      ui.statCard(ICONS.covers, 'Active Covers', String(covers),
        'Seats reserved (non-cancelled)', 'blue') +
      ui.statCard(ICONS.revenue, 'Est. Revenue', '$' + revenue.toLocaleString(),
        '≈ $' + AVG_SPEND + ' per cover', 'green') +
      '</div>' +

      '<div class="grid-2">' +
      '<div class="panel"><div class="panel-head"><h4>Bookings by Status</h4></div>' +
      (total ? verticalChart(statusData) : ui.emptyState('No bookings to chart yet')) +
      '</div>' +

      '<div class="panel"><div class="panel-head"><h4>Status Breakdown</h4></div>' +
      (total ? '<div class="breakdown">' + statusBreakdown + '</div>'
        : ui.emptyState('No bookings to chart yet')) +
      '</div>' +
      '</div>' +

      '<div class="panel"><div class="panel-head"><h4>Occupancy by Table</h4>' +
      '<span class="chip">Active bookings</span></div>' +
      (tableData.length ? horizontalChart(tableData) : ui.emptyState('No tables yet')) +
      '</div>';

    root.querySelector('[data-act="reset"]').addEventListener('click', function () {
      ui.confirm({
        title: 'Reset demo data?',
        message: 'All tables, bookings and customers will be restored to the sample records.',
        confirmLabel: 'Reset'
      }, function () {
        D.reset();
        ui.toast('Demo data restored.');
        TB.refresh();
      });
    });
  };
})();
