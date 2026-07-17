/* ============================================================
   storage.js — thin wrapper around localStorage
   Everything the app persists lives under STORAGE_PREFIX keys.
   ============================================================ */

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Store.get failed for', key, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Store.set failed for', key, e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  // Full app export — used for the JSON backup feature.
  exportAll() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        out[k.slice(STORAGE_PREFIX.length)] = JSON.parse(localStorage.getItem(k));
      }
    }
    return out;
  },

  importAll(obj) {
    Object.keys(obj).forEach((k) => this.set(k, obj[k]));
  }
};
