/* ============================================================
   auth.js — session handling + user account management
   ============================================================ */

const Auth = {
  currentUser() {
    const username = Store.get('session', null);
    if (!username) return null;
    return Data.getUsers().find((u) => u.username === username) || null;
  },

  login(username, password) {
    const user = Data.getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user || user.password !== password) {
      return { ok: false, message: 'Incorrect username or password.' };
    }
    Store.set('session', user.username);
    return { ok: true, user };
  },

  logout() {
    Store.remove('session');
  },

  isAdmin() {
    const u = this.currentUser();
    return !!u && u.role === 'admin';
  },

  // Self-service: change my own username/password.
  updateOwnCredentials({ newUsername, newPassword }) {
    const users = Data.getUsers();
    const me = this.currentUser();
    if (!me) return { ok: false, message: 'Not signed in.' };

    if (newUsername && newUsername.toLowerCase() !== me.username.toLowerCase()) {
      const taken = users.some((u) => u.username.toLowerCase() === newUsername.toLowerCase() && u.username !== me.username);
      if (taken) return { ok: false, message: 'That username is already in use.' };
    }

    const idx = users.findIndex((u) => u.username === me.username);
    if (idx < 0) return { ok: false, message: 'Account not found.' };

    if (newUsername) users[idx].username = newUsername.trim();
    if (newPassword) users[idx].password = newPassword;
    Data.saveUsers(users);
    Store.set('session', users[idx].username);
    Data.logAudit({ actor: me.username, action: 'Updated own account credentials' });
    return { ok: true };
  },

  // Admin-only: reset another user's password.
  adminResetPassword(username, newPassword) {
    if (!this.isAdmin()) return { ok: false, message: 'Not authorized.' };
    const users = Data.getUsers();
    const idx = users.findIndex((u) => u.username === username);
    if (idx < 0) return { ok: false, message: 'User not found.' };
    users[idx].password = newPassword;
    Data.saveUsers(users);
    Data.logAudit({ actor: this.currentUser().username, action: `Reset password for ${username}` });
    return { ok: true };
  },

  // Admin-only: rename another user's login.
  adminChangeUsername(oldUsername, newUsername) {
    if (!this.isAdmin()) return { ok: false, message: 'Not authorized.' };
    const users = Data.getUsers();
    if (users.some((u) => u.username.toLowerCase() === newUsername.toLowerCase() && u.username !== oldUsername)) {
      return { ok: false, message: 'That username is already in use.' };
    }
    const idx = users.findIndex((u) => u.username === oldUsername);
    if (idx < 0) return { ok: false, message: 'User not found.' };
    users[idx].username = newUsername.trim();
    Data.saveUsers(users);
    Data.logAudit({ actor: this.currentUser().username, action: `Renamed ${oldUsername} to ${newUsername}` });
    return { ok: true };
  }
};
