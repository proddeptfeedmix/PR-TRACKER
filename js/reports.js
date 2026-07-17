/* ============================================================
   reports.js — Reports & Export page
   ============================================================ */

const Reports = {
  render() {
    const user = Auth.currentUser();
    const isAdmin = user.role === 'admin';
    const prs = Data.visiblePRs();
    const years = Array.from(new Set(prs.map((p) => (p.dateSubmitted || '').slice(0, 4)))).filter(Boolean).sort().reverse();
    const currentYear = String(new Date().getFullYear());
    if (!years.includes(currentYear)) years.unshift(currentYear);

    document.getElementById('view-reports').innerHTML = `
      <div class="view-header">
        <div><h2>Reports &amp; Export</h2><div class="sub">Print or export requisitions as CSV (opens in Excel) or PDF.</div></div>
      </div>

      <div class="export-grid">
        <div class="export-card">
          <h4>Current filtered list</h4>
          <p>Whatever is currently shown on the Requisitions page (${PRList.filtered().length} records).</p>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-current">Export CSV</button>
            <button class="btn btn-sm" data-act="print-current">Print</button>
            <button class="btn btn-sm" data-act="pdf-current">Export PDF</button>
          </div>
        </div>

        <div class="export-card">
          <h4>Selected requisition</h4>
          <p>Export or print a single purchase requisition.</p>
          <select class="filter-select" id="rep-select-pr" style="width:100%;margin-bottom:10px;">
            ${prs.map((p) => `<option value="${p.id}">${Utils.escapeHtml(p.prNumber)} — ${Utils.escapeHtml(p.plant)}</option>`).join('')}
          </select>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="print-single">Print</button>
            <button class="btn btn-sm" data-act="pdf-single">Export PDF</button>
          </div>
        </div>

        ${isAdmin ? `
        <div class="export-card">
          <h4>Entire plant</h4>
          <p>All requisitions for one plant.</p>
          <select class="filter-select" id="rep-select-plant" style="width:100%;margin-bottom:10px;">
            ${PLANTS.map((p) => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-plant">Export CSV</button>
            <button class="btn btn-sm" data-act="pdf-plant">Export PDF</button>
          </div>
        </div>` : `
        <div class="export-card">
          <h4>${user.plant} — all records</h4>
          <p>Every requisition on file for your plant.</p>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-plant">Export CSV</button>
            <button class="btn btn-sm" data-act="pdf-plant">Export PDF</button>
          </div>
        </div>`}

        <div class="export-card">
          <h4>Monthly report</h4>
          <p>All requisitions submitted in a given month.</p>
          <input type="month" class="filter-input" id="rep-month" style="width:100%;margin-bottom:10px;" value="${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}" />
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-month">Export CSV</button>
            <button class="btn btn-sm" data-act="pdf-month">Export PDF</button>
          </div>
        </div>

        <div class="export-card">
          <h4>Yearly report</h4>
          <p>All requisitions submitted in a given year.</p>
          <select class="filter-select" id="rep-year" style="width:100%;margin-bottom:10px;">
            ${years.map((y) => `<option value="${y}">${y}</option>`).join('')}
          </select>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-year">Export CSV</button>
            <button class="btn btn-sm" data-act="pdf-year">Export PDF</button>
          </div>
        </div>

        <div class="export-card">
          <h4>By status</h4>
          <p>All requisitions currently in one status.</p>
          <select class="filter-select" id="rep-status" style="width:100%;margin-bottom:10px;">
            ${OVERALL_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-status">Export CSV</button>
            <button class="btn btn-sm" data-act="pdf-status">Export PDF</button>
          </div>
        </div>

        ${isAdmin ? `
        <div class="export-card">
          <h4>Entire database</h4>
          <p>Every requisition across all four plants. Administrator only.</p>
          <div class="export-actions">
            <button class="btn btn-sm" data-act="csv-all">Export CSV</button>
            <button class="btn btn-sm" data-act="pdf-all">Export PDF</button>
          </div>
        </div>` : ''}
      </div>

      <div class="panel" style="margin-top:18px;">
        <div class="panel-title">Backup &amp; restore</div>
        <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 12px;">
          This app stores all data in your browser only. Download a backup file regularly, especially before clearing browser data.
        </p>
        <div class="export-actions">
          <button class="btn btn-sm" id="rep-backup">Download backup (.json)</button>
          <label class="btn btn-sm" style="cursor:pointer;">
            Restore from backup
            <input type="file" accept="application/json" id="rep-restore" style="display:none;" />
          </label>
        </div>
      </div>
    `;

    this.wire(isAdmin);
  },

  wire(isAdmin) {
    const byAct = (act, fn) => {
      const el = document.querySelector(`[data-act="${act}"]`);
      if (el) el.addEventListener('click', fn);
    };

    byAct('csv-current', () => PRList.exportCSV(PRList.filtered()));
    byAct('print-current', () => this.printReport('Current Filtered Requisitions', PRList.filtered()));
    byAct('pdf-current', () => this.printReport('Current Filtered Requisitions', PRList.filtered(), true));

    const selectedPR = () => Data.getPRs().find((p) => p.id === document.getElementById('rep-select-pr').value);
    byAct('print-single', () => { const p = selectedPR(); if (p) this.printReport(`Requisition ${p.prNumber}`, [p]); });
    byAct('pdf-single', () => { const p = selectedPR(); if (p) this.printReport(`Requisition ${p.prNumber}`, [p], true); });

    const plantPRs = () => {
      const plant = isAdmin ? document.getElementById('rep-select-plant').value : Auth.currentUser().plant;
      return Data.getPRs().filter((p) => p.plant === plant);
    };
    byAct('csv-plant', () => PRList.exportCSV(plantPRs()));
    byAct('pdf-plant', () => this.printReport(`${isAdmin ? document.getElementById('rep-select-plant').value : Auth.currentUser().plant} — All Requisitions`, plantPRs(), true));

    const monthPRs = () => {
      const val = document.getElementById('rep-month').value; // yyyy-mm
      return Data.visiblePRs().filter((p) => (p.dateSubmitted || '').startsWith(val));
    };
    byAct('csv-month', () => PRList.exportCSV(monthPRs()));
    byAct('pdf-month', () => this.printReport(`Monthly Report — ${document.getElementById('rep-month').value}`, monthPRs(), true));

    const yearPRs = () => {
      const y = document.getElementById('rep-year').value;
      return Data.visiblePRs().filter((p) => (p.dateSubmitted || '').startsWith(y));
    };
    byAct('csv-year', () => PRList.exportCSV(yearPRs()));
    byAct('pdf-year', () => this.printReport(`Yearly Report — ${document.getElementById('rep-year').value}`, yearPRs(), true));

    const statusPRs = () => {
      const s = document.getElementById('rep-status').value;
      return Data.visiblePRs().filter((p) => p.overallStatus === s);
    };
    byAct('csv-status', () => PRList.exportCSV(statusPRs()));
    byAct('pdf-status', () => this.printReport(`Status Report — ${document.getElementById('rep-status').value}`, statusPRs(), true));

    if (isAdmin) {
      byAct('csv-all', () => PRList.exportCSV(Data.getPRs()));
      byAct('pdf-all', () => this.printReport('Entire Database — All Plants', Data.getPRs(), true));
    }

    document.getElementById('rep-backup').addEventListener('click', () => {
      Utils.downloadJSON(`pr-tracker-backup-${Utils.todayISO()}.json`, Store.exportAll());
      Utils.toast('Backup downloaded.', 'success');
    });
    document.getElementById('rep-restore').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await App.confirmDialog({
        title: 'Restore from backup?',
        message: 'This will overwrite all current data in this browser with the contents of the backup file.',
        confirmLabel: 'Restore', danger: true
      });
      if (!ok) { e.target.value = ''; return; }
      try {
        const text = await file.text();
        Store.importAll(JSON.parse(text));
        Utils.toast('Backup restored. Reloading…', 'success');
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        Utils.toast('That file could not be read as a backup.', 'error');
      }
    });
  },

  // Opens a clean, letterhead-style printable window and triggers print().
  printReport(title, prs, isPdfHint = false) {
    if (!prs.length) { Utils.toast('Nothing to print — no records match.', 'error'); return; }
    const company = Data.getSettings().companyName || 'PR Tracker';
    const win = window.open('', '_blank');
    if (!win) { Utils.toast('Pop-up blocked — allow pop-ups to print or export PDF.', 'error'); return; }

    const rowsHtml = prs.map((p) => `
      <tr>
        <td>${Utils.escapeHtml(p.prNumber)}</td>
        <td>${Utils.escapeHtml(p.plant)}</td>
        <td>${Utils.escapeHtml(p.requestedBy)}</td>
        <td>${Utils.formatDate(p.dateSubmitted)}</td>
        <td>${p.expectedArrival ? Utils.formatDate(p.expectedArrival) : '—'}</td>
        <td>${Utils.escapeHtml(p.overallStatus)}</td>
        <td>${p.overallStatus === 'Cancelled' ? '—' : Utils.daysWaiting(p) + 'd'}</td>
        <td>${Utils.completionPct(p)}%</td>
      </tr>
      ${(p.items || []).length ? `<tr><td colspan="8" style="padding:4px 8px 10px 24px;font-size:11px;color:#555;">
        ${p.items.map((it) => `${Utils.escapeHtml(it.description)} — ${it.orderQty} ${it.uom} · ${it.issueStatus}`).join(' &nbsp;|&nbsp; ')}
      </td></tr>` : ''}
    `).join('');

    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${Utils.escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color:#1b2430; padding: 30px; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .meta { color:#666; font-size:12px; margin-bottom:18px; }
        table { width:100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #ddd; padding: 7px 8px; text-align:left; }
        th { background:#f2f4f7; font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; color:#555; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>${Utils.escapeHtml(company)}</h1>
        <div class="meta">${Utils.escapeHtml(title)} · Generated ${Utils.formatDate(Utils.todayISO())} · ${prs.length} record(s)</div>
        <table>
          <thead><tr><th>PR Number</th><th>Plant</th><th>Requested By</th><th>Submitted</th><th>Expected</th><th>Status</th><th>Waiting</th><th>Completion</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      if (isPdfHint) Utils.toast('In the print dialog, choose “Save as PDF”.', 'info');
    }, 250);
  }
};
