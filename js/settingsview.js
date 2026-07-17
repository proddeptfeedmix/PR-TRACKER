/* ============================================================
   settingsview.js — account settings, company branding,
   user management (admin), and activity log (admin)
   ============================================================ */

const SettingsView = {
  render() {
    const user = Auth.currentUser();
    const isAdmin = user.role === 'admin';
    const settings = Data.getSettings();
    const theme = document.documentElement.getAttribute('data-theme');

    document.getElementById('view-settings').innerHTML = `
      <div class="view-header"><div><h2>Settings</h2><div class="sub">Account, appearance${isAdmin ? ', users, and company branding' : ''}.</div></div></div>

      <div class="settings-grid">
        <div class="panel">
          <div class="panel-title">My account</div>
          <div class="field"><label>Signed in as</label><input type="text" value="${Utils.escapeHtml(user.username)} (${user.role === 'admin' ? 'Administrator' : user.plant})" disabled /></div>
          <div class="field"><label>New username <span style="text-transform:none;font-weight:400;">(optional)</span></label><input type="text" id="acc-username" placeholder="Leave blank to keep current" /></div>
          <div class="field"><label>New password <span style="text-transform:none;font-weight:400;">(optional)</span></label><input type="password" id="acc-password" placeholder="Leave blank to keep current" /></div>
          <button class="btn btn-primary" id="acc-save">Save account changes</button>

          <div class="theme-toggle-row" style="margin-top:18px;">
            <div>
              <div style="font-weight:600;font-size:13px;">Dark mode</div>
              <div style="font-size:12px;color:var(--text-muted);">Switch between light and dark appearance.</div>
            </div>
            <div class="switch ${theme === 'dark' ? 'on' : ''}" id="theme-switch"><div class="knob"></div></div>
          </div>
        </div>

        ${isAdmin ? `
        <div class="panel">
          <div class="panel-title">Company</div>
          <div class="field"><label>Company name</label><input type="text" id="company-name" value="${Utils.escapeHtml(settings.companyName || '')}" /></div>
          <div class="field">
            <label>Logo <span style="text-transform:none;font-weight:400;">(optional)</span></label>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;background:var(--surface-alt);">
                ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="width:100%;height:100%;object-fit:cover;" />` : '<span style="font-size:10px;color:var(--text-muted);">none</span>'}
              </div>
              <label class="btn btn-sm" style="cursor:pointer;">Upload<input type="file" accept="image/*" id="company-logo-input" style="display:none;" /></label>
              ${settings.companyLogo ? `<button class="btn btn-sm" id="company-logo-remove">Remove</button>` : ''}
            </div>
          </div>
          <button class="btn btn-primary" id="company-save">Save company info</button>
        </div>` : ''}
      </div>

      ${isAdmin ? `
      <div class="panel" style="margin-top:18px;">
        <div class="panel-title">User accounts</div>
        <div class="table-wrap">
          <table class="pr-table">
            <thead><tr><th>Username</th><th>Role</th><th>Plant</th><th></th></tr></thead>
            <tbody>
              ${Data.getUsers().map((u) => `
                <tr>
                  <td class="mono">${Utils.escapeHtml(u.username)}</td>
                  <td>${u.role === 'admin' ? 'Administrator' : 'Plant'}</td>
                  <td>${u.plant || '—'}</td>
                  <td><button class="btn btn-sm" data-manage-user="${u.username}">Manage</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel" style="margin-top:18px;">
        <div class="panel-title">Activity log</div>
        ${this.auditLogHtml()}
      </div>` : ''}
    `;

    this.wire(isAdmin);
  },

  auditLogHtml() {
    const log = Data.getAuditLog().slice(0, 40);
    if (!log.length) return '<div class="empty-state" style="padding:24px;">No activity recorded yet.</div>';
    return `
      <div style="max-height:280px;overflow-y:auto;">
        ${log.map((e) => `
          <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px;">
            <span><strong class="mono">${Utils.escapeHtml(e.actor)}</strong> — ${Utils.escapeHtml(e.action)}</span>
            <span class="mono" style="color:var(--text-muted);white-space:nowrap;">${new Date(e.at).toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  wire(isAdmin) {
    document.getElementById('theme-switch').addEventListener('click', (e) => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      App.applyTheme(next);
      const s = Data.getSettings(); s.theme = next; Data.saveSettings(s);
      e.currentTarget.classList.toggle('on', next === 'dark');
    });

    document.getElementById('acc-save').addEventListener('click', () => {
      const newUsername = document.getElementById('acc-username').value.trim();
      const newPassword = document.getElementById('acc-password').value;
      if (!newUsername && !newPassword) { Utils.toast('Nothing to update.', 'error'); return; }
      const result = Auth.updateOwnCredentials({ newUsername, newPassword });
      if (result.ok) {
        Utils.toast('Account updated.', 'success');
        this.render();
        App.updateUserChip();
      } else {
        Utils.toast(result.message, 'error');
      }
    });

    if (!isAdmin) return;

    document.getElementById('company-save').addEventListener('click', () => {
      const s = Data.getSettings();
      s.companyName = document.getElementById('company-name').value.trim() || 'PR Tracker';
      Data.saveSettings(s);
      document.getElementById('topbar-company-name').textContent = s.companyName;
      Utils.toast('Company info saved.', 'success');
      this.render();
    });

    document.getElementById('company-logo-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await Utils.fileToResizedDataURL(file, 240, 0.85);
        const s = Data.getSettings(); s.companyLogo = dataUrl; Data.saveSettings(s);
        App.applyLogoMark('topbar-logo-mark', dataUrl);
        Utils.toast('Logo updated.', 'success');
        this.render();
      } catch (err) {
        Utils.toast('Could not read that image.', 'error');
      }
    });

    const removeLogoBtn = document.getElementById('company-logo-remove');
    if (removeLogoBtn) removeLogoBtn.addEventListener('click', () => {
      const s = Data.getSettings(); delete s.companyLogo; Data.saveSettings(s);
      App.applyLogoMark('topbar-logo-mark', null);
      this.render();
    });

    document.querySelectorAll('[data-manage-user]').forEach((btn) => {
      btn.addEventListener('click', () => this.openManageUserModal(btn.dataset.manageUser));
    });
  },

  openManageUserModal(username) {
    const backdrop = App.openModal(`
      <div class="modal-header"><h3>Manage ${Utils.escapeHtml(username)}</h3><button class="modal-close" data-act="close">✕</button></div>
      <div class="modal-body">
        <div class="field"><label>New username <span style="text-transform:none;font-weight:400;">(optional)</span></label><input type="text" id="mu-username" placeholder="Leave blank to keep current" /></div>
        <div class="field"><label>New password <span style="text-transform:none;font-weight:400;">(optional)</span></label><input type="text" id="mu-password" placeholder="Leave blank to keep current" /></div>
      </div>
      <div class="modal-footer">
        <button class="btn" data-act="close">Cancel</button>
        <button class="btn btn-primary" data-act="save">Save</button>
      </div>
    `, { size: 'sm' });

    backdrop.querySelectorAll('[data-act="close"]').forEach((b) => b.addEventListener('click', () => App.closeModal()));
    backdrop.querySelector('[data-act="save"]').addEventListener('click', () => {
      const newUsername = backdrop.querySelector('#mu-username').value.trim();
      const newPassword = backdrop.querySelector('#mu-password').value;
      if (!newUsername && !newPassword) { Utils.toast('Nothing to update.', 'error'); return; }

      let workingUsername = username;
      if (newUsername && newUsername.toLowerCase() !== username.toLowerCase()) {
        const r = Auth.adminChangeUsername(username, newUsername);
        if (!r.ok) { Utils.toast(r.message, 'error'); return; }
        workingUsername = newUsername;
      }
      if (newPassword) {
        const r2 = Auth.adminResetPassword(workingUsername, newPassword);
        if (!r2.ok) { Utils.toast(r2.message, 'error'); return; }
      }
      Utils.toast('User account updated.', 'success');
      App.closeModal();
      this.render();
    });
  }
};
