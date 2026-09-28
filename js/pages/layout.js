/* =========================================================
   TableBook — Table Layout: color-coded status tiles
   ========================================================= */
(function () {
  'use strict';
  window.TB = window.TB || {};
  TB.pages = TB.pages || {};

  var STATUS_CLASS = {
    'Available': 'tile-green',
    'Reserved': 'tile-blue',
    'Occupied': 'tile-purple',
    'Out of Service': 'tile-gray'
  };

  var STATUS_GLYPH = {
    'Available': '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    'Reserved': '<svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zM8 13h3v3H8z"/></svg>',
    'Occupied': '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9.5 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    'Out of Service': '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>'
  };

  function slug(status) {
    return (STATUS_CLASS[status] || 'tile-gray');
  }

  function glyph(status) {
    return STATUS_GLYPH[status] || STATUS_GLYPH['Out of Service'];
  }

  function tileParts(t) {
    var D = TB.data, ui = TB.ui;
    var todaysBooking = D.bookings.filter(function (b) {
      return b.tableId === t.id && b.date === D.todayISO() &&
        b.status !== 'Cancelled' && b.status !== 'No-Show';
    }).sort(function (a, b) { return a.time < b.time ? -1 : 1; })[0];
    var c = todaysBooking ? D.customerById(todaysBooking.customerId) : null;

    return {
      meta: '<span>' + t.capacity + ' seats</span><span>·</span>' +
        '<span>' + ui.esc(t.floor) + '</span><span>·</span>' +
        '<span>' + ui.esc(t.location) + '</span>',
      foot: todaysBooking
        ? '<span class="tile-next">' + ui.esc(D.fmtTime(todaysBooking.time)) + ' — ' +
        ui.esc(c ? c.name : 'Guest') + ' (' + todaysBooking.partySize + ')</span>'
        : '<span class="tile-next muted">No booking today</span>'
    };
  }

  function tileHtml(t) {
    var ui = TB.ui;
    var p = tileParts(t);
    return '<div class="tile-top">' +
      '<span class="tile-glyph">' + glyph(t.status) + '</span>' +
      ui.badge(t.status) +
      '</div>' +
      '<span class="tile-name">' + ui.esc(t.name) + '</span>' +
      '<div class="tile-meta">' + p.meta + '</div>' +
      '<div class="tile-foot">' + p.foot + '</div>';
  }

  /* Update an existing tile in place: keeps the element alive so the
     background / border / badge colours transition instead of snapping. */
  function renderTile(el, t) {
    if (!el.querySelector('.tile-glyph')) el.innerHTML = tileHtml(t);

    el.className = 'tile ' + slug(t.status);

    var badge = el.querySelector('.badge');
    if (badge) {
      var cls = 'badge ' + TB.ui.badgeClass(t.status);
      if (badge.className !== cls) {
        badge.className = cls;
        badge.textContent = t.status;
      }
    }

    var glyphEl = el.querySelector('.tile-glyph');
    if (glyphEl) glyphEl.innerHTML = glyph(t.status);

    var nameEl = el.querySelector('.tile-name');
    if (nameEl) nameEl.textContent = t.name;

    var p = tileParts(t);
    var metaEl = el.querySelector('.tile-meta');
    if (metaEl) metaEl.innerHTML = p.meta;
    var footEl = el.querySelector('.tile-foot');
    if (footEl) footEl.innerHTML = p.foot;
  }

  TB.pages.layout = function (root) {
    var D = TB.data, ui = TB.ui;

    var counts = {};
    D.TABLE_STATUS.forEach(function (s) {
      counts[s] = D.tables.filter(function (t) { return t.status === s; }).length;
    });

    var legend = D.TABLE_STATUS.map(function (s) {
      return '<span class="legend-item"><i class="legend-dot dot-' +
        s.toLowerCase().replace(/[^a-z]+/g, '-') + '"></i>' + ui.esc(s) +
        ' <b>' + counts[s] + '</b></span>';
    }).join('');

    if (!root.querySelector('.tile-grid') || !D.tables.length) {
      /* (re)build the shell */
      root.innerHTML =
        ui.pageHead('Table Layout', 'A live floor plan — colour-coded by table status.',
          '<button class="btn btn-primary" data-act="add">+ Add Table</button>') +
        '<div class="panel">' +
        '<div class="legend">' + legend + '</div>' +
        (D.tables.length
          ? '<div class="tile-grid">' + D.tables.map(function (t) {
            return '<div class="tile ' + slug(t.status) + '" data-edit="' + t.id + '">' +
              tileHtml(t) + '</div>';
          }).join('') + '</div>'
          : ui.emptyState('No tables to lay out', 'Add tables on the Tables page.')) +
        '</div>';

      root.querySelector('[data-act="add"]').addEventListener('click', function () {
        if (TB.openTableModal) TB.openTableModal(null);
      });
    } else {
      /* in-place update so CSS can transition status colours smoothly */
      var legendEl = root.querySelector('.legend');
      if (legendEl) legendEl.innerHTML = legend;

      var grid = root.querySelector('.tile-grid');
      D.tables.forEach(function (t) {
        var el = grid.querySelector('[data-edit="' + t.id + '"]');
        if (el) renderTile(el, t);
        else {
          var fresh = document.createElement('div');
          fresh.className = 'tile ' + slug(t.status);
          fresh.setAttribute('data-edit', t.id);
          fresh.innerHTML = tileHtml(t);
          grid.appendChild(fresh);
        }
      });
      /* drop tiles for deleted tables */
      Array.prototype.forEach.call(grid.querySelectorAll('[data-edit]'), function (el) {
        if (!D.tableById(el.getAttribute('data-edit'))) el.parentNode.removeChild(el);
      });
    }

    root.querySelectorAll('[data-edit]').forEach(function (tile) {
      if (tile.dataset.bound) return;
      tile.dataset.bound = '1';
      tile.addEventListener('click', function () {
        var t = D.tableById(tile.getAttribute('data-edit'));
        if (t && TB.openTableModal) TB.openTableModal(t);
      });
    });
  };
})();
