/* =========================================================
   TableBook — Stage 1: auth gate + nav switching
   Frontend only. Data lives in localStorage.
   ========================================================= */
(function () {
  'use strict';

  var STORAGE = { users: 'tablebook.users', session: 'tablebook.session', page: 'tablebook.page' };

  var state = {
    mode: 'login', // 'login' | 'register'
    user: null,
    page: 'dashboard'
  };

  /* ---------------- Helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------------- Auth ---------------- */
  var authScreen = $('#authScreen');
  var appShell = $('#appShell');
  var authForm = $('#authForm');
  var authError = $('#authError');
  var nameField = $('#nameField');
  var authSubmit = $('#authSubmit');

  function setMode(mode) {
    state.mode = mode;
    $all('.auth-tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.authTab === mode);
    });
    nameField.hidden = mode !== 'register';
    authSubmit.textContent = mode === 'register' ? 'Create account' : 'Log in';
    authError.hidden = true;
    authForm.reset();
  }

  function showError(msg) {
    authError.textContent = msg;
    authError.hidden = false;
  }

  function emailTaken(email, users) {
    return users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); });
  }

  function handleAuthSubmit(e) {
    e.preventDefault();

    var name = ($('#authName').value || '').trim();
    var email = ($('#authEmail').value || '').trim();
    var password = $('#authPassword').value || '';
    var role = $('#authRole').value;
    var users = read(STORAGE.users, []);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');
    if (password.length < 4) return showError('Password must be at least 4 characters.');

    if (state.mode === 'register') {
      if (!name) return showError('Please enter your full name.');
      if (emailTaken(email, users)) return showError('An account with this email already exists.');

      var user = { name: name, email: email, password: password, role: role, createdAt: Date.now() };
      users.push(user);
      write(STORAGE.users, users);
      startSession(user);
    } else {
      var found = users.filter(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })[0];
      if (!found || found.password !== password) return showError('Invalid email or password.');
      startSession(found);
    }
  }

  function startSession(user) {
    state.user = { name: user.name, email: user.email, role: user.role };
    write(STORAGE.session, state.user);
    enterApp();
  }

  function enterApp() {
    authScreen.hidden = true;
    appShell.hidden = false;
    $('#userName').textContent = state.user.name;
    $('#userRole').textContent = state.user.role;
    $('#userAvatar').textContent = (state.user.name || '?').charAt(0).toUpperCase();

    /* first-load stagger for sidebar items + stat cards (never on page switches) */
    document.body.classList.add('is-intro');
    clearTimeout(introTimer);
    introTimer = setTimeout(function () {
      document.body.classList.remove('is-intro');
    }, 900);

    navigate(read(STORAGE.page, 'dashboard'), false);
  }

  var introTimer = null;

  function logout() {
    localStorage.removeItem(STORAGE.session);
    state.user = null;
    closeSidebar();
    appShell.hidden = true;
    authScreen.hidden = false;
    setMode('login');
  }

  /* ---------------- Navigation ---------------- */
  var pages = $all('.page');
  var navItems = $all('.nav-item[data-page]');

  function renderPage(pageId) {
    var target = document.getElementById('page-' + pageId);
    if (!target) return;
    var renderer = window.TB && TB.pages && TB.pages[pageId];
    if (typeof renderer === 'function') renderer(target);
  }

  function navigate(pageId, persist) {
    var target = document.getElementById('page-' + pageId);
    if (!target) pageId = 'dashboard';

    state.page = pageId;
    pages.forEach(function (sec) { sec.hidden = sec.dataset.page !== pageId; });

    var activeNav = null;
    navItems.forEach(function (item) {
      var active = item.dataset.page === pageId;
      item.classList.toggle('is-active', active);
      if (active) activeNav = item;
    });

    $('#topbarTitle').textContent = activeNav ? activeNav.dataset.title : 'Dashboard';

    renderPage(pageId);

    if (persist !== false) write(STORAGE.page, pageId);
    closeSidebar();
  }

  /* Re-render whatever page is currently open (called by pages after mutations) */
  function refresh() { renderPage(state.page); }

  /* ---------------- Sidebar (mobile) ---------------- */
  var sidebar = $('#sidebar');
  var backdrop = $('#sidebarBackdrop');

  function openSidebar() {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
  }

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('tablebook.theme', theme); } catch (e) { /* storage unavailable */ }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F5FF' : '#0C0913');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'light' ? 'dark' : 'light');
  }

  /* ---------------- Date chip ---------------- */
  function renderDate() {
    $('#dateChip').textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  /* ---------------- Wire up ---------------- */
  $all('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () { setMode(tab.dataset.authTab); });
  });

  authForm.addEventListener('submit', handleAuthSubmit);

  $('#themeToggle').addEventListener('click', toggleTheme);

  navItems.forEach(function (item) {
    item.addEventListener('click', function () { navigate(item.dataset.page); });
  });

  $('#logoutBtn').addEventListener('click', logout);
  $('#menuToggle').addEventListener('click', function () {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });
  backdrop.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebar();
  });

  /* ---------------- Boot ---------------- */
  window.TB = window.TB || {};
  TB.refresh = refresh;
  TB.navigate = navigate;

  renderDate();
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  setMode('login');

  var session = read(STORAGE.session, null);
  if (session && session.email) {
    state.user = session;
    enterApp();
  }
})();
