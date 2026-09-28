/* =========================================================
   TableBook — Real-time Availability: filter free tables
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages = TB.pages || {};

  function esc(s) { return TB.ui.esc(s); }

  var query = { date: '', time: '19:00', partySize: 4, duration: 90 };

  function findFree() {
    var D = TB.data;
    var party = parseInt(query.partySize, 10) || 1;

    return D.tables.filter(function (t) {
      if (t.status === 'Out of Service') return false;
      if (t.capacity < party) return false;
      return D.isTableFree(t.id, query.date, query.time, +query.duration, null);
    }).sort(function (a, b) { return a.capacity - b.capacity; });
  }

  function resultsHtml() {
    var D = TB.data, ui = TB.ui;
    if (!query.date) {
      return ui.emptyState('Pick a date to check availability', 'Choose a date, time and party size above.');
    }

    var free = findFree();
    var busy = D.tables.filter(function (t) {
      return free.indexOf(t) === -1 && t.status !== 'Out of Service';
    });
    var oos = D.tables.filter(function (t) { return t.status === 'Out of Service'; });

    if (!free.length) {
      return '<div class="avail-summary no-free">No free tables for a party of ' +
        esc(query.partySize) + ' at ' + esc(D.fmtTime(query.time)) + ' on ' + esc(D.fmtDate(query.date)) +
        '.</div>' +
        (busy.length ? '<div class="avail-block"><h5>Already booked (' + busy.length + ')</h5><div class="avail-list">' +
          busy.map(function (t) { return availRow(t, false); }).join('') + '</div></div>' : '') +
        (oos.length ? '<div class="avail-block"><h5>Out of service (' + oos.length + ')</h5><div class="avail-list">' +
          oos.map(function (t) { return availRow(t, false); }).join('') + '</div></div>' : '');
    }

    return '<div class="avail-summary free">' + free.length + ' table' + (free.length === 1 ? '' : 's') +
      ' available for a party of ' + esc(query.partySize) + ' at ' + esc(D.fmtTime(query.time)) +
      ' on ' + esc(D.fmtDate(query.date)) + '.</div>' +
      '<div class="avail-list">' + free.map(function (t) { return availRow(t, true); }).join('') + '</div>' +
      (busy.length ? '<div class="avail-block"><h5>Unavailable (' + busy.length + ')</h5><div class="avail-list">' +
        busy.map(function (t) { return availRow(t, false); }).join('') + '</div></div>' : '');
  }

  function availRow(t, isFree) {
    var D = TB.data, ui = TB.ui;
    var nextBooking = D.bookings.filter(function (b) {
      return b.tableId === t.id && b.date === query.date &&
        b.status !== 'Cancelled' && b.status !== 'No-Show';
    }).sort(function (a, b) { return a.time < b.time ? -1 : 1; })[0];

    return '<div class="avail-row' + (isFree ? ' is-free' : '') + '">' +
      '<div class="avail-main">' +
      '<b>' + esc(t.name) + '</b>' +
      '<span class="muted">' + t.capacity + ' seats · ' + esc(t.location) + ' · ' + esc(t.floor) + '</span>' +
      '</div>' +
      '<div class="avail-side">' +
      (nextBooking && !isFree
        ? '<span class="muted">Next: ' + esc(D.fmtTime(nextBooking.time)) + '</span>'
        : '') +
      ui.badge(isFree ? 'Available' : (t.status === 'Out of Service' ? 'Out of Service' : 'Reserved')) +
      (isFree ? '<button class="btn btn-primary btn-sm" data-book="' + t.id + '">Book</button>' : '') +
      '</div></div>';
  }

  TB.pages.availability = function (root) {
    var D = TB.data, ui = TB.ui;

    if (!query.date) query.date = D.todayISO();

    root.innerHTML =
      ui.pageHead('Real-time Availability', 'Filter tables against existing bookings for any slot.') +
      '<div class="panel">' +
      '<form class="avail-form" id="availForm">' +
      '<div class="field"><label for="a-date">Date</label>' +
      '<input id="a-date" name="date" type="date" value="' + esc(query.date) + '" required /></div>' +
      '<div class="field"><label for="a-time">Time</label>' +
      '<input id="a-time" name="time" type="time" value="' + esc(query.time) + '" required /></div>' +
      '<div class="field"><label for="a-party">Party size</label>' +
      '<input id="a-party" name="partySize" type="number" min="1" max="30" value="' + esc(query.partySize) + '" required /></div>' +
      '<div class="field"><label for="a-duration">Duration</label>' +
      '<select id="a-duration" name="duration">' +
      [30, 60, 90, 120, 150, 180].map(function (m) {
        return '<option value="' + m + '"' + (+query.duration === m ? ' selected' : '') + '>' + m + ' min</option>';
      }).join('') + '</select></div>' +
      '<div class="avail-actions"><button class="btn btn-primary" type="submit">Check availability</button>' +
      '<button class="btn btn-ghost" type="button" data-reset>Reset</button></div>' +
      '</form>' +
      '</div>' +
      '<div class="panel" id="availResults">' + resultsHtml() + '</div>';

    var form = root.querySelector('#availForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      query.date = fd.get('date');
      query.time = fd.get('time');
      query.partySize = fd.get('partySize');
      query.duration = fd.get('duration');
      root.querySelector('#availResults').innerHTML = resultsHtml();
      bindBookButtons();
    });

    root.querySelector('[data-reset]').addEventListener('click', function () {
      query = { date: D.todayISO(), time: '19:00', partySize: 4, duration: 90 };
      TB.refresh();
    });

    function bindBookButtons() {
      root.querySelectorAll('[data-book]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tableId = btn.dataset.book;
          if (!D.customers.length) {
            ui.toast('Add a customer first to create a booking.', 'error');
            TB.navigate('customers');
            return;
          }
          // prefill via a one-shot hook consumed by the booking modal
          var table = D.tableById(tableId);
          if (!table) return;
          TB.openBookingModal({
            id: null, tableId: tableId, customerId: D.customers[0].id,
            date: query.date, time: query.time, duration: +query.duration,
            partySize: parseInt(query.partySize, 10) || 2,
            status: 'Confirmed', notes: '', occasion: ''
          }, function () { TB.refresh(); });
        });
      });
    }

    bindBookButtons();
  };
})();
