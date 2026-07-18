/* ============================================================
   main.js — app shell: state, routing, modal helpers, data layer
   ============================================================ */

const Data = {
  getUsers() { return Store.get('users', []); },
  saveUsers(users) { Store.set('users', users); },

  getPRs() { return Store.get('prs', []); },
  savePRs(prs) { Store.set('prs', prs); },

  getSettings() { return Store.get('settings', { companyName: 'PR Tracker', theme: 'dark' }); },
  saveSettings(s) { Store.set('settings', s); },

  getAuditLog() { return Store.get('auditLog', []); },
  logAudit(entry) {
    const log = this.getAuditLog();
    log.unshift({ id: Utils.uid('log'), at: new Date().toISOString(), ...entry });
    Store.set('auditLog', log.slice(0, 500));
  },

  // Visible PRs for the current user (role-scoped), newest first.
  visiblePRs() {
    const user = Auth.currentUser();
    let prs = this.getPRs();
    if (user && user.role === 'plant') {
      prs = prs.filter((p) => p.plant === user.plant);
    }
    return prs.slice().sort((a, b) => (b.dateSubmitted || '').localeCompare(a.dateSubmitted || ''));
  },

  isDuplicatePRNumber(prNumber, excludeId) {
    return this.getPRs().some((p) => p.prNumber.trim().toLowerCase() === prNumber.trim().toLowerCase() && p.id !== excludeId);
  },

  upsertPR(pr) {
    const prs = this.getPRs();
    const idx = prs.findIndex((p) => p.id === pr.id);
    pr.overallStatus = Utils.deriveOverallStatus(pr);
    pr.updatedAt = new Date().toISOString();
    if (idx >= 0) { prs[idx] = pr; } else { prs.unshift(pr); }
    this.savePRs(prs);
  },

  deletePR(id) {
    this.savePRs(this.getPRs().filter((p) => p.id !== id));
  }
};

const App = {
  state: {
    view: 'dashboard',
    listFilters: { plant: '', status: '', requestedBy: '', dateFrom: '', dateTo: '', quick: '' },
    listSearch: '',
    dashboardPlantFilter: ''
  },

  async init() {
    this.showLoading();
    await Store.init(); // waits for Firestore's first snapshot (or localStorage) before touching data
    Seed.run();
    const settings = Data.getSettings();
    this.applyTheme(settings.theme || 'dark');
    this.wireLogin();
    this.wireTopbar();
    window.addEventListener('hashchange', () => this.handleHash());

    Store.onRemoteChange(() => {
      // Data changed from another device/tab. Don't yank the UI out from
      // under someone mid-edit — only refresh if no modal is open.
      const modalOpen = document.getElementById('modal-root').children.length > 0;
      if (!modalOpen) this.refreshCurrentView();
    });

    this.hideLoading();
    if (Auth.currentUser()) {
      this.showApp();
    } else {
      this.showLogin();
    }
  },

  // ---------- Loading screen (shown while Firestore/local data loads) ----------
  showLoading() {
    const el = document.getElementById('loading-view');
    if (el) el.classList.remove('hidden');
  },

  hideLoading() {
    const el = document.getElementById('loading-view');
    if (el) el.classList.add('hidden');
  },

  // ---------- Login / App visibility ----------
  showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
    const settings = Data.getSettings();
    document.getElementById('login-company-name').textContent = settings.companyName || 'PR Tracker';
    this.applyLogoMark('login-logo-mark', settings.companyLogo);
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  },

  showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    const settings = Data.getSettings();
    document.getElementById('topbar-company-name').textContent = settings.companyName || 'PR Tracker';
    this.applyLogoMark('topbar-logo-mark', settings.companyLogo);
    this.updateUserChip();
    this.renderNav();
    this.handleHash();
  },

  applyLogoMark(elId, logoDataUrl) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = logoDataUrl ? `<img src="${logoDataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" />` : 'PR';
  },

  wireLogin() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      document.getElementById('field-username').classList.toggle('invalid', !username);
      document.getElementById('field-password').classList.toggle('invalid', !password);
      if (!username || !password) return;

      const result = Auth.login(username, password);
      const errBox = document.getElementById('field-login-error');
      if (result.ok) {
        errBox.style.display = 'none';
        this.showApp();
        Utils.toast(`Welcome, ${result.user.label}.`, 'success');
      } else {
        document.getElementById('login-error-text').textContent = result.message;
        errBox.style.display = 'block';
      }
    });
  },

  wireTopbar() {
    document.getElementById('logout-btn').addEventListener('click', () => {
      Auth.logout();
      this.showLogin();
    });
    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.applyTheme(next);
      const s = Data.getSettings(); s.theme = next; Data.saveSettings(s);
    });
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  },

  updateUserChip() {
    const user = Auth.currentUser();
    if (!user) return;
    document.getElementById('user-chip-label').textContent = `${user.label} · ${user.role === 'admin' ? 'Administrator' : user.plant}`;
  },

  renderNav() {
    const user = Auth.currentUser();
    const pendingCount = Data.visiblePRs().filter((p) => p.overallStatus === 'Submitted' || p.overallStatus === 'For Approval').length;
    const nav = document.getElementById('nav-tabs');
    nav.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.onclick = () => { window.location.hash = btn.dataset.view; };
      btn.innerHTML = btn.dataset.view === 'list' && pendingCount > 0
        ? `${this.tabLabel(btn.dataset.view)} <span class="tab-badge">${pendingCount}</span>`
        : this.tabLabel(btn.dataset.view);
    });
  },

  tabLabel(view) {
    return { dashboard: 'Dashboard', list: 'Requisitions', reports: 'Reports &amp; Export', settings: 'Settings' }[view];
  },

  handleHash() {
    const hash = (window.location.hash || '#dashboard').slice(1);
    const view = ['dashboard', 'list', 'reports', 'settings'].includes(hash) ? hash : 'dashboard';
    this.switchView(view);
  },

  switchView(view) {
    this.state.view = view;
    ['dashboard', 'list', 'reports', 'settings'].forEach((v) => {
      document.getElementById(`view-${v}`).classList.toggle('hidden', v !== view);
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
    this.renderNav();
    this.renderCurrentView();
  },

  refreshCurrentView() {
    this.renderNav();
    this.updateUserChip();
    this.renderCurrentView();
  },

  renderCurrentView() {
    if (this.state.view === 'dashboard') Dashboard.render();
    else if (this.state.view === 'list') PRList.render();
    else if (this.state.view === 'reports') Reports.render();
    else if (this.state.view === 'settings') SettingsView.render();
  },

  // ---------- Generic modal ----------
  // Modals stack: each open() call appends its own backdrop; close() pops
  // the topmost one, so a confirm dialog can sit on top of an edit modal
  // without destroying it when the confirm is dismissed.
  openModal(innerHTML, opts = {}) {
    const root = document.getElementById('modal-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal ${opts.size === 'sm' ? 'modal-sm' : ''}">${innerHTML}</div>`;
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop && opts.dismissible !== false) this.closeModal(backdrop); });
    const escHandler = (e) => { if (e.key === 'Escape' && opts.dismissible !== false) this.closeModal(backdrop); };
    backdrop._escHandler = escHandler;
    document.addEventListener('keydown', escHandler);
    root.appendChild(backdrop);
    return backdrop;
  },

  closeModal(target) {
    const root = document.getElementById('modal-root');
    const backdrop = target || root.lastElementChild;
    if (!backdrop) return;
    if (backdrop._escHandler) document.removeEventListener('keydown', backdrop._escHandler);
    backdrop.remove();
  },

  confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      const backdrop = this.openModal(`
        <div class="modal-header"><h3>${Utils.escapeHtml(title)}</h3>
          <button class="modal-close" data-act="cancel">✕</button>
        </div>
        <div class="modal-body"><p style="margin:0;color:var(--text-muted);">${Utils.escapeHtml(message)}</p></div>
        <div class="modal-footer">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="confirm">${Utils.escapeHtml(confirmLabel)}</button>
        </div>
      `, { size: 'sm' });
      backdrop.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const confirmed = btn.dataset.act === 'confirm';
          this.closeModal();
          resolve(confirmed);
        });
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
