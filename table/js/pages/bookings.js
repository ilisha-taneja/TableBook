/* =========================================================
   TableBook — Booking Management: full CRUD + confirmation
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  var DURATIONS = [30, 60, 90, 120, 150, 180];

  function esc(s) { return TB.ui.esc(s); }

  function field(name, label, value, type, attrs) {
    return '<div class="field"><label for="f-' + name + '">' + esc(label) + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + (type || 'text') + '" value="' +
      esc(value) + '" ' + (attrs || '') + ' /></div>';
  }

  function select(name, label, options, value) {
    return '<div class="field"><label for="f-' + name + '">' + esc(label) + '</label>' +
      '<select id="f-' + name + '" name="' + name + '">' +
      options.map(function (o) {
        var v = typeof o === 'string' ? o : o.value;
        var l = typeof o === 'string' ? o : o.label;
        return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>';
      }).join('') + '</select></div>';
  }

  function textarea(name, label, value, attrs) {
    return '<div class="field field-full"><label for="f-' + name + '">' + esc(label) + '</label>' +
      '<textarea id="f-' + name + '" name="' + name + '" rows="3" ' + (attrs || '') + '>' +
      esc(value) + '</textarea></div>';
  }

  /* ---------------- Modal ---------------- */
  function openBookingModal(existing, afterSave) {
    var D = TB.data, ui = TB.ui;
    var src = existing || {};          // prefill source (may be a bare object)
    var b = src.id ? src : null;       // only edit when a real id exists

    if (!D.customers.length) {
      ui.toast('Add a customer first — bookings need a customer.', 'error');
      TB.navigate('customers');
      return;
    }
    if (!D.tables.length) {
      ui.toast('Add a table first — bookings need a table.', 'error');
      TB.navigate('tables');
      return;
    }

    var customerOpts = D.customers.map(function (c) {
      return { value: c.id, label: c.name + ' (' + c.email + ')' };
    });
    var tableOpts = D.tables.map(function (t) {
      return { value: t.id, label: t.name + ' · ' + t.capacity + ' seats' };
    });

    var v = function (key, fallback) { return (src[key] !== undefined && src[key] !== '') ? src[key] : fallback; };

    ui.openModal({
      title: b ? 'Edit Booking' : 'New Booking',
      submitLabel: b ? 'Save Changes' : 'Confirm Booking',
      body:
        select('customerId', 'Customer', customerOpts, v('customerId', D.customers[0].id)) +
        select('tableId', 'Table', tableOpts, v('tableId', D.tables[0].id)) +
        field('date', 'Date', v('date', D.todayISO()), 'date', 'required') +
        field('time', 'Time', v('time', '19:00'), 'time', 'required') +
        select('duration', 'Duration', DURATIONS.map(function (m) {
          return { value: m, label: m + ' min' };
        }), v('duration', 90)) +
        field('partySize', 'Party size', v('partySize', 2), 'number', 'required min="1" max="30"') +
        select('status', 'Status', D.BOOKING_STATUS, v('status', 'Confirmed')) +
        field('occasion', 'Occasion', v('occasion', ''), 'text', 'placeholder="Birthday, Anniversary…"') +
        textarea('notes', 'Special requests', v('notes', ''), 'placeholder="Allergies, seating preferences…"'),
      onSubmit: function (data) {
        if (!data.date || !data.time) return ui.toast('Date and time are required.', 'error');

        var party = parseInt(data.partySize, 10);
        if (!party || party < 1) return ui.toast('Party size must be at least 1.', 'error');

        var table = D.tableById(data.tableId);
        if (table && party > table.capacity) {
          return ui.toast('Party of ' + party + ' exceeds ' + table.name + ' capacity (' + table.capacity + ').', 'error');
        }

        if (!D.isTableFree(data.tableId, data.date, data.time, +data.duration, b ? b.id : null)) {
          return ui.toast('That table is already booked for this time slot.', 'error');
        }

        if (b) {
          b.customerId = data.customerId; b.tableId = data.tableId;
          b.date = data.date; b.time = data.time; b.duration = +data.duration;
          b.partySize = party; b.status = data.status;
          b.occasion = data.occasion; b.notes = data.notes;
        } else {
          D.bookings.push({
            id: D.uid('b'), tableId: data.tableId, customerId: data.customerId,
            date: data.date, time: data.time, duration: +data.duration,
            partySize: party, status: data.status, notes: data.notes, occasion: data.occasion
          });
        }

        // last-visit tracking: bump customer when seated
        if (data.status === 'Seated') {
          var cust = D.customerById(data.customerId);
          if (cust && cust.lastVisit !== data.date) {
            cust.visits = (cust.visits || 0) + 1;
            cust.lastVisit = data.date;
          }
        }

        D.persist();
        ui.closeModal();

        var c = D.customerById(data.customerId);
        ui.toast((b ? 'Booking updated — ' : 'Booking confirmed — ') + (c ? c.name : 'Guest') + ', ' +
          (table ? table.name : '') + ', ' + D.fmtDate(data.date) + ' at ' + D.fmtTime(data.time) + '.');

        if (afterSave) afterSave();
        TB.refresh();
      }
    });
  }

  TB.openBookingModal = openBookingModal;

  /* ---------------- List ---------------- */
  var filterStatus = 'All';
  var filterQuery = '';

  function matches(b) {
    if (filterStatus !== 'All' && b.status !== filterStatus) return false;
    if (!filterQuery) return true;
    var D = TB.data;
    var c = D.customerById(b.customerId);
    var t = D.tableById(b.tableId);
    var hay = ((c ? c.name : '') + ' ' + (t ? t.name : '') + ' ' + (b.occasion || '') + ' ' + (b.notes || '')).toLowerCase();
    return hay.indexOf(filterQuery.toLowerCase()) !== -1;
  }

  function rowsHtml() {
    var D = TB.data, ui = TB.ui;
    var list = D.bookings.filter(matches).sort(function (a, b) {
      return (a.date + a.time) < (b.date + b.time) ? -1 : 1;
    });
    if (!list.length) return '';

    return list.map(function (b) {
      var c = D.customerById(b.customerId);
      var t = D.tableById(b.tableId);
      return '<tr>' +
        '<td class="cell-strong">' + ui.esc(D.fmtDate(b.date)) + '</td>' +
        '<td>' + ui.esc(D.fmtTime(b.time)) + '</td>' +
        '<td>' + ui.esc(c ? c.name : '—') + '</td>' +
        '<td>' + ui.esc(t ? t.name : '—') + '</td>' +
        '<td>' + b.partySize + '</td>' +
        '<td>' + ui.esc(b.occasion || '—') + '</td>' +
        '<td>' + ui.badge(b.status) + '</td>' +
        '<td class="cell-actions">' +
        '<button class="btn btn-ghost btn-sm" data-edit="' + b.id + '">Edit</button>' +
        '<button class="btn btn-danger-ghost btn-sm" data-del="' + b.id + '">Delete</button>' +
        '</td></tr>';
    }).join('');
  }

  TB.pages.bookings = function (root) {
    var D = TB.data, ui = TB.ui;

    var statusChips = ['All'].concat(D.BOOKING_STATUS).map(function (s) {
      return '<button class="filter-chip' + (s === filterStatus ? ' is-active' : '') +
        '" data-status="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('');

    root.innerHTML =
      ui.pageHead('Booking Management', 'Every reservation in one place — create, edit, cancel.',
        '<button class="btn btn-primary" data-act="add">+ New Booking</button>') +
      '<div class="panel">' +
      '<div class="toolbar">' +
      '<input class="search-input" type="search" placeholder="Search customer, table, occasion…" value="' +
      esc(filterQuery) + '" data-search />' +
      '<div class="filter-chips">' + statusChips + '</div>' +
      '</div>' +
      (D.bookings.length ?
        '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr><th>Date</th><th>Time</th><th>Customer</th><th>Table</th><th>Party</th><th>Occasion</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' + rowsHtml() + '</tbody></table></div>'
        : ui.emptyState('No bookings yet', 'Create your first booking to see it here.')) +
      '</div>';

    root.querySelector('[data-act="add"]').addEventListener('click', function () {
      openBookingModal(null, function () { TB.refresh(); });
    });

    root.querySelector('[data-search]').addEventListener('input', function (e) {
      filterQuery = e.target.value;
      TB.refresh();
      var input = root.querySelector('[data-search]');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });

    root.querySelectorAll('[data-status]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterStatus = chip.dataset.status;
        TB.refresh();
      });
    });

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var b = D.bookingById(btn.dataset.edit);
        if (b) openBookingModal(b, function () { TB.refresh(); });
      });
    });

    root.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var b = D.bookingById(btn.dataset.del);
        if (!b) return;
        ui.confirm({
          title: 'Delete booking?',
          message: 'This reservation will be permanently removed.',
          confirmLabel: 'Delete'
        }, function () {
          var arr = D.bookings;
          for (var i = arr.length - 1; i >= 0; i--) {
            if (arr[i].id === b.id) arr.splice(i, 1);
          }
          D.persist();
          ui.toast('Booking deleted.');
          TB.refresh();
        });
      });
    });
  };
})();
