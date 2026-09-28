/* =========================================================
   TableBook — Data Layer
   Models: tables, bookings, customers (seeded + localStorage)
   ========================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'tablebook.db.v1';

  var TABLE_STATUS = ['Available', 'Reserved', 'Occupied', 'Out of Service'];
  var BOOKING_STATUS = ['Pending', 'Confirmed', 'Seated', 'Cancelled', 'No-Show'];

  /* ---------------- Date helpers ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function toISODate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayISO() { return toISODate(new Date()); }

  function shiftISO(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var parts = iso.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtDateLong(iso) {
    if (!iso) return '—';
    var parts = iso.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function fmtTime(t) {
    if (!t) return '—';
    var p = t.split(':');
    var h = +p[0], m = p[1] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + m + ' ' + ampm;
  }

  /* ---------------- Seed ---------------- */
  function seed() {
    var tables = [
      { id: 't1', name: 'Table 1 — Window', capacity: 2, location: 'Window Side', floor: 'Ground', status: 'Available' },
      { id: 't2', name: 'Table 2 — Center', capacity: 4, location: 'Center Room', floor: 'Ground', status: 'Reserved' },
      { id: 't3', name: 'Table 3 — Corner', capacity: 4, location: 'Corner', floor: 'Ground', status: 'Occupied' },
      { id: 't4', name: 'Table 4 — Patio', capacity: 6, location: 'Patio', floor: 'Outdoor', status: 'Available' },
      { id: 't5', name: 'Table 5 — Private', capacity: 8, location: 'Private Room', floor: 'First', status: 'Out of Service' }
    ];

    var customers = [
      { id: 'c1', name: 'Ava Martinez', email: 'ava.martinez@example.com', phone: '+1 415 555 0134', preferences: 'Window seat, sparkling water', visits: 12, lastVisit: shiftISO(-3) },
      { id: 'c2', name: 'Noah Kim', email: 'noah.kim@example.com', phone: '+1 415 555 0192', preferences: 'Vegetarian, no cilantro', visits: 7, lastVisit: shiftISO(-11) },
      { id: 'c3', name: 'Priya Patel', email: 'priya.patel@example.com', phone: '+1 628 555 0177', preferences: 'Quiet corner for business dinners', visits: 21, lastVisit: shiftISO(-1) },
      { id: 'c4', name: 'Liam O\'Connor', email: 'liam.oconnor@example.com', phone: '+1 650 555 0110', preferences: 'Allergic to nuts — flag kitchen', visits: 4, lastVisit: shiftISO(-28) },
      { id: 'c5', name: 'Sofia Rossi', email: 'sofia.rossi@example.com', phone: '+1 415 555 0166', preferences: 'Celebrates anniversaries here', visits: 9, lastVisit: shiftISO(-6) }
    ];

    var bookings = [
      { id: 'b1', tableId: 't2', customerId: 'c1', date: todayISO(), time: '19:00', duration: 90, partySize: 4, status: 'Confirmed', notes: 'High chair needed', occasion: 'Birthday' },
      { id: 'b2', tableId: 't4', customerId: 'c3', date: todayISO(), time: '20:30', duration: 120, partySize: 6, status: 'Confirmed', notes: 'Nut allergy — notify kitchen', occasion: 'Anniversary' },
      { id: 'b3', tableId: 't1', customerId: 'c2', date: todayISO(), time: '18:00', duration: 60, partySize: 2, status: 'Seated', notes: '', occasion: '' },
      { id: 'b4', tableId: 't3', customerId: 'c5', date: shiftISO(1), time: '19:30', duration: 90, partySize: 3, status: 'Pending', notes: 'Requests sommelier pairing', occasion: 'Anniversary' },
      { id: 'b5', tableId: 't5', customerId: 'c4', date: shiftISO(2), time: '13:00', duration: 90, partySize: 8, status: 'Cancelled', notes: 'Cancelled by guest', occasion: 'Business Lunch' }
    ];

    return { tables: tables, customers: customers, bookings: bookings };
  }

  /* ---------------- Store ---------------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var db = JSON.parse(raw);
        if (db && Array.isArray(db.tables) && Array.isArray(db.bookings) && Array.isArray(db.customers)) {
          return db;
        }
      }
    } catch (e) { /* fall through to seed */ }
    var fresh = seed();
    save(fresh);
    return fresh;
  }

  function save(db) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable */ }
  }

  var db = load();

  /* ---------------- IDs ---------------- */
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------------- Public API ---------------- */
  window.TB = window.TB || {};

  TB.data = {
    TABLE_STATUS: TABLE_STATUS,
    BOOKING_STATUS: BOOKING_STATUS,

    get tables() { return db.tables; },
    get bookings() { return db.bookings; },
    get customers() { return db.customers; },

    persist: function () { save(db); },
    reset: function () { db = seed(); save(db); },

    uid: uid,
    todayISO: todayISO,
    shiftISO: shiftISO,
    fmtDate: fmtDate,
    fmtDateLong: fmtDateLong,
    fmtTime: fmtTime,

    tableById: function (id) {
      return db.tables.filter(function (t) { return t.id === id; })[0] || null;
    },
    customerById: function (id) {
      return db.customers.filter(function (c) { return c.id === id; })[0] || null;
    },
    bookingById: function (id) {
      return db.bookings.filter(function (b) { return b.id === id; })[0] || null;
    },

    /* Does this table have a live booking overlapping the slot? */
    isTableFree: function (tableId, date, time, duration, ignoreBookingId) {
      duration = duration || 60;
      var start = toMinutes(time);
      var end = start + duration;
      return !db.bookings.some(function (b) {
        if (b.id === ignoreBookingId) return false;
        if (b.tableId !== tableId || b.date !== date) return false;
        if (b.status === 'Cancelled' || b.status === 'No-Show') return false;
        var bStart = toMinutes(b.time);
        var bEnd = bStart + (b.duration || 60);
        return start < bEnd && bStart < end;
      });
    }
  };

  function toMinutes(t) {
    if (!t) return 0;
    var p = t.split(':');
    return (+p[0]) * 60 + (+p[1] || 0);
  }

  TB.toMinutes = toMinutes;
})();
