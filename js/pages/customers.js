/* =========================================================
   TableBook — Customer Management: profiles + add modal
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  function esc(s) { return TB.ui.esc(s); }

  function field(name, label, value, type, attrs) {
    return '<div class="field"><label for="f-' + name + '">' + esc(label) + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + (type || 'text') + '" value="' +
      esc(value) + '" ' + (attrs || '') + ' /></div>';
  }

  function textarea(name, label, value, attrs) {
    return '<div class="field field-full"><label for="f-' + name + '">' + esc(label) + '</label>' +
      '<textarea id="f-' + name + '" name="' + name + '" rows="3" ' + (attrs || '') + '>' +
      esc(value) + '</textarea></div>';
  }

  function openCustomerModal(existing) {
    var D = TB.data, ui = TB.ui;
    var c = existing || null;

    ui.openModal({
      title: c ? 'Edit Customer' : 'Add Customer',
      submitLabel: c ? 'Save Changes' : 'Add Customer',
      body:
        field('name', 'Full name', c ? c.name : '', 'text', 'required placeholder="Ava Martinez"') +
        field('email', 'Email', c ? c.email : '', 'email', 'required placeholder="ava@example.com"') +
        field('phone', 'Phone', c ? c.phone : '', 'tel', 'placeholder="+1 415 555 0134"') +
        textarea('preferences', 'Preferences / notes', c ? (c.preferences || '') : '',
          'placeholder="Window seat, allergies, favourite table…"') +
        field('visits', 'Visits', c ? c.visits : 0, 'number', 'min="0"') +
        field('lastVisit', 'Last visit', c ? (c.lastVisit || '') : '', 'date'),
      onSubmit: function (data) {
        if (!data.name) return ui.toast('Name is required.', 'error');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return ui.toast('Please enter a valid email.', 'error');

        var visits = parseInt(data.visits, 10); if (isNaN(visits) || visits < 0) visits = 0;

        if (c) {
          c.name = data.name; c.email = data.email; c.phone = data.phone;
          c.preferences = data.preferences; c.visits = visits; c.lastVisit = data.lastVisit;
          ui.toast('Customer "' + c.name + '" updated.');
        } else {
          var dupe = D.customers.some(function (x) { return x.email.toLowerCase() === data.email.toLowerCase(); });
          if (dupe) return ui.toast('A customer with that email already exists.', 'error');

          D.customers.push({
            id: D.uid('c'), name: data.name, email: data.email, phone: data.phone,
            preferences: data.preferences, visits: visits, lastVisit: data.lastVisit || ''
          });
          ui.toast('Customer "' + data.name + '" added.');
        }
        D.persist();
        ui.closeModal();
        TB.refresh();
      }
    });
  }

  function upcomingCount(customerId) {
    return TB.data.bookings.filter(function (b) {
      return b.customerId === customerId && b.date >= TB.data.todayISO() &&
        b.status !== 'Cancelled' && b.status !== 'No-Show';
    }).length;
  }

  function rowsHtml() {
    var D = TB.data, ui = TB.ui;
    if (!D.customers.length) return '';

    return D.customers
      .slice()
      .sort(function (a, b) { return (b.visits || 0) - (a.visits || 0); })
      .map(function (c) {
        var upcoming = upcomingCount(c.id);
        return '<tr>' +
          '<td class="cell-customer"><span class="mini-avatar">' +
          esc((c.name || '?').charAt(0).toUpperCase()) + '</span>' +
          '<span><b>' + esc(c.name) + '</b><small>' + esc(c.email) + '</small></span></td>' +
          '<td>' + esc(c.phone || '—') + '</td>' +
          '<td class="cell-notes">' + esc(c.preferences || '—') + '</td>' +
          '<td><span class="count-pill">' + (c.visits || 0) + '</span></td>' +
          '<td>' + esc(c.lastVisit ? D.fmtDate(c.lastVisit) : '—') + '</td>' +
          '<td>' + (upcoming ? '<span class="badge badge-blue">' + upcoming + ' upcoming</span>' : '<span class="muted">—</span>') + '</td>' +
          '<td class="cell-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit="' + c.id + '">Edit</button>' +
          '<button class="btn btn-danger-ghost btn-sm" data-del="' + c.id + '">Delete</button>' +
          '</td></tr>';
      }).join('');
  }

  TB.pages.customers = function (root) {
    var D = TB.data, ui = TB.ui;

    root.innerHTML =
      ui.pageHead('Customers', 'Guest profiles with visit history and preferences.',
        '<button class="btn btn-primary" data-act="add">+ Add Customer</button>') +
      '<div class="panel">' +
      (D.customers.length ?
        '<div class="table-wrap"><table class="data-table">' +
        '<thead><tr><th>Customer</th><th>Phone</th><th>Preferences</th><th>Visits</th><th>Last Visit</th><th>Upcoming</th><th>Actions</th></tr></thead>' +
        '<tbody>' + rowsHtml() + '</tbody></table></div>'
        : ui.emptyState('No customers yet', 'Add your first customer to start building profiles.')) +
      '</div>';

    root.querySelector('[data-act="add"]').addEventListener('click', function () { openCustomerModal(null); });

    root.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var c = D.customerById(btn.dataset.edit);
        if (c) openCustomerModal(c);
      });
    });

    root.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var c = D.customerById(btn.dataset.del);
        if (!c) return;
        ui.confirm({
          title: 'Delete customer?',
          message: 'Remove "' + c.name + '"? Their bookings stay in the system.',
          confirmLabel: 'Delete'
        }, function () {
          var arr = D.customers;
          for (var i = arr.length - 1; i >= 0; i--) {
            if (arr[i].id === c.id) arr.splice(i, 1);
          }
          D.persist();
          ui.toast('Customer deleted.');
          TB.refresh();
        });
      });
    });
  };

  TB.openCustomerModal = openCustomerModal;
})();
