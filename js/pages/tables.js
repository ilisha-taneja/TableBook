/* =========================================================
   TableBook — Table Management: full CRUD + status badges
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  var FLOORS = ['Ground', 'First', 'Second', 'Rooftop', 'Outdoor'];

  function field(name, label, value, type, attrs) {
    return '<div class="field"><label for="f-' + name + '">' + TB.ui.esc(label) + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + (type || 'text') + '" value="' +
      TB.ui.esc(value) + '" ' + (attrs || '') + ' /></div>';
  }

  function select(name, label, options, value) {
    return '<div class="field"><label for="f-' + name + '">' + TB.ui.esc(label) + '</label>' +
      '<select id="f-' + name + '" name="' + name + '">' +
      options.map(function (o) {
        var v = typeof o === 'string' ? o : o.value;
        var l = typeof o === 'string' ? o : o.label;
        return '<option value="' + TB.ui.esc(v) + '"' + (v === value ? ' selected' : '') + '>' + TB.ui.esc(l) + '</option>';
      }).join('') + '</select></div>';
  }

  function openTableModal(existing) {
    var D = TB.data, ui = TB.ui;
    var t = existing || null;
    var floorOptions = FLOORS.slice();
    if (t && floorOptions.indexOf(t.floor) === -1) floorOptions.push(t.floor);

    ui.openModal({
      title: t ? 'Edit Table' : 'Add Table',
      submitLabel: t ? 'Save Changes' : 'Add Table',
      body:
        field('name', 'Table name', t ? t.name : '', 'text', 'required placeholder="Table 6 — Bar"') +
        field('capacity', 'Capacity', t ? t.capacity : 4, 'number', 'required min="1" max="30"') +
        field('location', 'Location', t ? t.location : '', 'text', 'required placeholder="Patio"') +
        select('floor', 'Floor', floorOptions, t ? t.floor : 'Ground') +
        select('status', 'Status', D.TABLE_STATUS, t ? t.status : 'Available'),
      onSubmit: function (data) {
        if (!data.name) return ui.toast('Table name is required.', 'error');
        if (!data.location) return ui.toast('Location is required.', 'error');
        var cap = parseInt(data.capacity, 10);
        if (!cap || cap < 1) return ui.toast('Capacity must be at least 1.', 'error');

        if (t) {
          t.name = data.name; t.capacity = cap; t.location = data.location;
          t.floor = data.floor; t.status = data.status;
          ui.toast('Table "' + t.name + '" updated.');
        } else {
          D.tables.push({
            id: D.uid('t'), name: data.name, capacity: cap,
            location: data.location, floor: data.floor, status: data.status
          });
          ui.toast('Table "' + data.name + '" added.');
        }
        D.persist();
        ui.closeModal();
        TB.refresh();
      }
    });
  }

  TB.openTableModal = openTableModal;

  function rowsHtml() {
    var D = TB.data, ui = TB.ui;
    if (!D.tables.length) return '';

    return D.tables.map(function (t) {
      return '<tr data-row="' + t.id + '">' +
        '<td class="cell-strong">' + ui.esc(t.name) + '</td>' +
        '<td class="cell-capacity">' + t.capacity + ' seats</td>' +
        '<td class="cell-location">' + ui.esc(t.location) + '</td>' +
        '<td class="cell-floor">' + ui.esc(t.floor) + '</td>' +
        '<td><span class="badge ' + ui.badgeClass(t.status) + '">' + ui.esc(t.status) + '</span></td>' +
        '<td class="cell-actions">' +
        '<button class="btn btn-ghost btn-sm" data-edit="' + t.id + '">Edit</button>' +
        '<button class="btn btn-danger-ghost btn-sm" data-del="' + t.id + '">Delete</button>' +
        '</td></tr>';
    }).join('');
  }

  TB.pages.tables = function (root) {
    var D = TB.data, ui = TB.ui;
    var tbody = root.querySelector('.data-table tbody');
    var ids = D.tables.map(function (t) { return t.id; }).join(',');

    if (tbody && ids && root.dataset.tableIds === ids) {
      /* same set of tables — update cells in place so status colours transition */
      D.tables.forEach(function (t) {
        var tr = tbody.querySelector('[data-row="' + t.id + '"]');
        if (!tr) return;
        tr.querySelector('.cell-strong').textContent = t.name;
        tr.querySelector('.cell-capacity').textContent = t.capacity + ' seats';
        tr.querySelector('.cell-location').textContent = t.location;
        tr.querySelector('.cell-floor').textContent = t.floor;
        var b = tr.querySelector('.badge');
        var cls = 'badge ' + ui.badgeClass(t.status);
        if (b && b.className !== cls) { b.className = cls; b.textContent = t.status; }
      });
      return;
    }

    root.dataset.tableIds = ids;
    root.innerHTML =
      ui.pageHead('Table Management', 'Create, edit and track every table in the venue.',
        '<button class="btn btn-primary" data-act="add">+ Add Table</button>') +
      '<div class="panel">' +
      (D.tables.length ?
        '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr><th>Table</th><th>Capacity</th><th>Location</th><th>Floor</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' + rowsHtml() + '</tbody></table></div>'
        : ui.emptyState('No tables yet', 'Add your first table to get started.')) +
      '</div>';

    root.querySelector('[data-act="add"]').addEventListener('click', function () { openTableModal(null); });

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = D.tableById(btn.dataset.edit);
        if (t) openTableModal(t);
      });
    });

    root.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = D.tableById(btn.dataset.del);
        if (!t) return;
        var linked = D.bookings.filter(function (b) { return b.tableId === t.id; }).length;
        ui.confirm({
          title: 'Delete table?',
          message: linked
            ? '"' + t.name + '" has ' + linked + ' booking(s) linked to it. Those bookings will keep their reference.'
            : 'Remove "' + t.name + '" from the floor plan?',
          confirmLabel: 'Delete'
        }, function () {
          var arr = D.tables;
          for (var i = arr.length - 1; i >= 0; i--) {
            if (arr[i].id === t.id) arr.splice(i, 1);
          }
          D.persist();
          ui.toast('Table deleted.');
          TB.refresh();
        });
      });
    });
  };
})();
