/* ============================================================
   utils.js — pure helpers used across the app
   ============================================================ */

const Utils = {
  uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  },

  daysBetween(startISO, endISO) {
    if (!startISO) return 0;
    const start = new Date(startISO + 'T00:00:00');
    const end = endISO ? new Date(endISO + 'T00:00:00') : new Date();
    const ms = end - start;
    return Math.max(0, Math.round(ms / 86400000));
  },

  // Days waiting: from submission until fully arrived, or until today if still open.
  daysWaiting(pr) {
    if (pr.overallStatus === 'Cancelled') return 0;
    const end = pr.overallStatus === 'Completed' ? pr.dateFullyArrived : null;
    return this.daysBetween(pr.dateSubmitted, end);
  },

  // Completion % — share of non-cancelled items that are Fully Issued.
  completionPct(pr) {
    const items = (pr.items || []).filter((it) => it.issueStatus !== 'Cancelled');
    if (items.length === 0) return pr.overallStatus === 'Completed' ? 100 : 0;
    const done = items.filter((it) => it.issueStatus === 'Fully Issued').length;
    return Math.round((done / items.length) * 100);
  },

  // Derive the overall PR status from its item statuses. Manual overrides
  // (Submitted / For Approval / Ordered / Cancelled) are preserved when there
  // are no items yet or when the PR itself has been explicitly cancelled.
  deriveOverallStatus(pr) {
    const items = pr.items || [];
    if (pr.overallStatus === 'Cancelled') return 'Cancelled';
    if (items.length === 0) return pr.overallStatus;

    const allCancelled = items.every((it) => it.issueStatus === 'Cancelled');
    if (allCancelled) return 'Cancelled';

    const active = items.filter((it) => it.issueStatus !== 'Cancelled');
    const allFullyIssued = active.length > 0 && active.every((it) => it.issueStatus === 'Fully Issued');
    if (allFullyIssued) return 'Completed';

    const anyIssued = active.some((it) => it.issueStatus === 'Fully Issued' || it.issueStatus === 'Partially Issued');
    if (anyIssued) return 'Partially Delivered';

    // No items issued yet — keep whatever pre-fulfillment stage it's in,
    // unless it's still sitting at a default that no longer makes sense.
    if (['Submitted', 'For Approval', 'Ordered'].includes(pr.overallStatus)) {
      return pr.overallStatus;
    }
    return 'Submitted';
  },

  debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Resize + compress an image file to a data URL so localStorage can hold it.
  fileToResizedDataURL(file, maxDim = MAX_IMAGE_DIM, quality = IMAGE_JPEG_QUALITY) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // Minimal CSV export — Excel opens CSV natively.
  downloadCSV(filename, rows) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escapeCell = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(',')];
    rows.forEach((row) => lines.push(headers.map((h) => escapeCell(row[h])).join(',')));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, filename);
  },

  downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  toast(message, kind = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-show'));
    setTimeout(() => {
      el.classList.remove('toast-show');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }
};
