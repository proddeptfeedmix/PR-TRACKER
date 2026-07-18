/* ============================================================
   storage.js — data layer for the app.

   Everything the app persists (users, prs, settings, auditLog) is
   kept in an in-memory cache so the rest of the app can keep
   calling Store.get/set synchronously, exactly like before.

   - If Firebase is configured (js/firebase-config.js), the cache is
     mirrored to/from Firestore in real time, so every device shares
     the same data.
   - If it isn't configured, everything falls back to this browser's
     localStorage only, same as the original version of this app.

   The one exception is 'session' (who is logged in on THIS device),
   which always stays local — each device/browser can be signed in
   as a different user.
   ============================================================ */

const SYNCED_KEYS = ['users', 'prs', 'settings', 'auditLog'];

const Store = {
  _cache: {},
  _mode: null, // 'cloud' | 'local'
  _readyPromise: null,
  _onRemoteChange: null,

  // Call once, from App.init(), before anything reads/writes data.
  // Resolves once the initial data (from Firestore or localStorage) is loaded.
  init() {
    if (this._readyPromise) return this._readyPromise;
    this._readyPromise = (async () => {
      await (window.__fbReady || Promise.resolve());

      if (!window.__fb) {
        this._mode = 'local';
        SYNCED_KEYS.forEach((key) => { this._cache[key] = this._localGet(key); });
        return;
      }

      this._mode = 'cloud';
      const { db, doc, onSnapshot } = window.__fb;
      let pending = SYNCED_KEYS.length;
      let firstLoadResolve;
      const firstLoad = new Promise((res) => { firstLoadResolve = res; });

      SYNCED_KEYS.forEach((key) => {
        const ref = doc(db, 'prtracker_data', key);
        onSnapshot(
          ref,
          (snap) => {
            const incoming = snap.exists() ? snap.data().value : undefined;
            const changed = JSON.stringify(incoming) !== JSON.stringify(this._cache[key]);
            this._cache[key] = incoming;
            if (pending > 0) { pending -= 1; if (pending === 0) firstLoadResolve(); }
            else if (changed && this._onRemoteChange) this._onRemoteChange(key);
          },
          (err) => {
            console.error('Firestore listen failed for', key, err);
            if (pending > 0) { pending -= 1; if (pending === 0) firstLoadResolve(); }
          }
        );
      });

      await firstLoad;
    })();
    return this._readyPromise;
  },

  ready() { return this._readyPromise || Promise.resolve(); },

  // Register a callback fired when data changes from another device/tab.
  onRemoteChange(cb) { this._onRemoteChange = cb; },

  isCloudConnected() { return this._mode === 'cloud'; },

  get(key, fallback) {
    if (key === 'session') {
      const v = this._localGet(key);
      return v === undefined ? fallback : v;
    }
    const v = this._cache[key];
    return v === undefined ? fallback : v;
  },

  set(key, value) {
    if (key === 'session') {
      return this._localSet(key, value);
    }

    this._cache[key] = value;

    if (this._mode === 'cloud') {
      const { db, doc, setDoc } = window.__fb;
      setDoc(doc(db, 'prtracker_data', key), { value, updatedAt: Date.now() }).catch((e) => {
        console.error('Firestore save failed for', key, e);
        if (typeof Utils !== 'undefined') Utils.toast('Could not save to the cloud — check your connection.', 'error');
      });
      return true;
    }
    return this._localSet(key, value);
  },

  remove(key) {
    if (key === 'session') { localStorage.removeItem(STORAGE_PREFIX + key); return; }
    this._cache[key] = undefined;
    if (this._mode === 'cloud') {
      const { db, doc, deleteDoc } = window.__fb;
      deleteDoc(doc(db, 'prtracker_data', key)).catch((e) => console.error('Firestore delete failed for', key, e));
    } else {
      localStorage.removeItem(STORAGE_PREFIX + key);
    }
  },

  // -------- localStorage helpers (used for 'session' always, and
  // -------- for everything else when running in local-only mode) --------
  _localGet(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch (e) {
      console.error('Store._localGet failed for', key, e);
      return undefined;
    }
  },

  _localSet(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Store._localSet failed for', key, e);
      return false;
    }
  },

  // Full app export — used for the JSON backup feature.
  exportAll() {
    const out = {};
    SYNCED_KEYS.forEach((k) => { out[k] = this._cache[k]; });
    return out;
  },

  importAll(obj) {
    Object.keys(obj).forEach((k) => { if (SYNCED_KEYS.includes(k)) this.set(k, obj[k]); });
  }
};
