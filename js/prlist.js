/* ============================================================
   prlist.js — searchable / filterable purchase requisition table
   ============================================================ */

const PRList = {
  render() {
    const user = Auth.currentUser();
    const isAdmin = user.role === 'admin';
    const filtered = this.filtered();

    document.getElementById('view-list').innerHTML = `
      <div class="view-header">
        <div>
          <h2>Purchase Requisitions</h2>
          <div class="sub">${filtered.length} of ${Data.visiblePRs().length} shown</div>
        </div>
        <button class="btn btn-primary" id="new-pr-btn">+ New requisition</button>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="pr-search" placeholder="Search PR number, item, requester, plant, status…" value="${Utils.escapeHtml(App.state.listSearch)}" />
        </div>
        <div class="filter-pop">
          <button class="btn" id="filter-toggle-btn">Filters ${this.activeFilterCount() ? `<span class="tab-badge">${this.activeFilterCount()}</span>` : ''}</button>
          <div class="filter-panel hidden" id="filter-panel">${this.filterPanelHtml(isAdmin)}</div>
        </div>
        <button class="btn" id="reset-filters-btn">Reset filters</button>
        <button class="btn" id="export-csv-btn">Export CSV</button>
      </div>

      <div class="table-wrap">
        ${filtered.length ? this.tableHtml(filtered, isAdmin) : `
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6M9 8h1M4 6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"></path></svg>
            <div>No purchase requisitions match your filters.</div>
          </div>
        `}
      </div>
    `;

    this.wire(isAdmin);
  },

  wire(isAdmin) {
    document.getElementById('new-pr-btn').addEventListener('click', () => PRModal.open(null));

    const searchInput = document.getElementById('pr-search');
    searchInput.addEventListener('input', Utils.debounce((e) => {
      App.state.listSearch = e.target.value;
      this.render();
      document.getElementById('pr-search').focus();
      document.getElementById('pr-search').setSelectionRange(e.target.value.length, e.target.value.length);
    }, 150));

    document.getElementById('filter-toggle-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('filter-panel').classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('filter-panel');
      if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target.id !== 'filter-toggle-btn') {
        panel.classList.add('hidden');
      }
    }, { once: true });

    document.getElementById('reset-filters-btn').addEventListener('click', () => {
      App.state.listFilters = { plant: '', status: '', requestedBy: '', dateFrom: '', dateTo: '', quick: '' };
      App.state.listSearch = '';
      this.render();
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => this.exportCSV(this.filtered()));

    const panel = document.getElementById('filter-panel');
    if (isAdmin) {
      panel.querySelector('#f-plant').addEventListener('change', (e) => { App.state.listFilters.plant = e.target.value; this.render(); document.getElementById('filter-panel').classList.remove('hidden'); });
    }
    panel.querySelector('#f-status').addEventListener('change', (e) => { App.state.listFilters.status = e.target.value; this.render(); document.getElementById('filter-panel').classList.remove('hidden'); });
    panel.querySelector('#f-requester').addEventListener('input', Utils.debounce((e) => { App.state.listFilters.requestedBy = e.target.value; this.render(); document.getElementById('filter-panel').classList.remove('hidden'); }, 200));
    panel.querySelector('#f-date-from').addEventListener('change', (e) => { App.state.listFilters.dateFrom = e.target.value; this.render(); document.getElementById('filter-panel').classList.remove('hidden'); });
    panel.querySelector('#f-date-to').addEventListener('change', (e) => { App.state.listFilters.dateTo = e.target.value; this.render(); document.getElementById('filter-panel').classList.remove('hidden'); });
    panel.querySelector('#f-waiting30').addEventListener('change', (e) => { App.state.listFilters.quick = e.target.checked ? 'waiting30' : ''; this.render(); document.getElementById('filter-panel').classList.remove('hidden'); });

    document.querySelectorAll('#view-list tbody tr[data-id]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-delete-btn')) return;
        PRModal.open(row.dataset.id);
      });
    });
    document.querySelectorAll('.row-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const pr = Data.getPRs().find((p) => p.id === id);
        const ok = await App.confirmDialog({
          title: 'Delete purchase requisition?',
          message: `This will permanently delete ${pr.prNumber}. This cannot be undone.`,
          confirmLabel: 'Delete', danger: true
        });
        if (ok) {
          Data.deletePR(id);
          Data.logAudit({ actor: Auth.currentUser().username, action: `Deleted ${pr.prNumber}` });
          Utils.toast('Purchase requisition deleted.', 'success');
          this.render();
        }
      });
    });
  },

  filterPanelHtml(isAdmin) {
    const f = App.state.listFilters;
    return `
      ${isAdmin ? `
        <div class="field" style="margin:0;">
          <label>Plant</label>
          <select class="filter-select" id="f-plant" style="width:100%;">
            <option value="">All plants</option>
            ${PLANTS.map((p) => `<option value="${p}" ${f.plant === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>` : ''}
      <div class="field" style="margin:0;">
        <label>Status</label>
        <select class="filter-select" id="f-status" style="width:100%;">
          <option value="">All statuses</option>
          ${OVERALL_STATUSES.map((s) => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin:0;">
        <label>Requested by</label>
        <input class="filter-input" id="f-requester" style="width:100%;" placeholder="Name" value="${Utils.escapeHtml(f.requestedBy)}" />
      </div>
      <div class="field" style="margin:0;">
        <label>Date submitted</label>
        <div style="display:flex; gap:6px;">
          <input type="date" class="filter-input" id="f-date-from" style="width:100%;" value="${f.dateFrom}" />
          <input type="date" class="filter-input" id="f-date-to" style="width:100%;" value="${f.dateTo}" />
        </div>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" id="f-waiting30" ${f.quick === 'waiting30' ? 'checked' : ''} />
        Waiting more than 30 days
      </label>
    `;
  },

  activeFilterCount() {
    const f = App.state.listFilters;
    return Object.values(f).filter((v) => v).length;
  },

  filtered() {
    const f = App.state.listFilters;
    const q = App.state.listSearch.trim().toLowerCase();
    let prs = Data.visiblePRs();

    if (f.plant) prs = prs.filter((p) => p.plant === f.plant);
    if (f.status) prs = prs.filter((p) => p.overallStatus === f.status);
    if (f.requestedBy) prs = prs.filter((p) => p.requestedBy.toLowerCase().includes(f.requestedBy.toLowerCase()));
    if (f.dateFrom) prs = prs.filter((p) => p.dateSubmitted >= f.dateFrom);
    if (f.dateTo) prs = prs.filter((p) => p.dateSubmitted <= f.dateTo);
    if (f.quick === 'waiting30') prs = prs.filter((p) => Utils.daysWaiting(p) > 30 && p.overallStatus !== 'Completed' && p.overallStatus !== 'Cancelled');

    if (q) {
      prs = prs.filter((p) => {
        const haystack = [
          p.prNumber, p.plant, p.requestedBy, p.overallStatus, p.remarks,
          p.dateSubmitted, p.expectedArrival, p.dateFullyArrived,
          ...(p.items || []).map((it) => `${it.description} ${it.issueStatus}`)
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }
    return prs;
  },

  tableHtml(prs, isAdmin) {
    return `
      <table class="pr-table">
        <thead><tr>
          <th>PR Number</th><th>Plant</th><th>Requested By</th><th>Submitted</th>
          <th>Expected</th><th>Status</th><th>Progress</th><th>Waiting</th>${isAdmin ? '<th></th>' : ''}
        </tr></thead>
        <tbody>
          ${prs.map((p) => `
            <tr data-id="${p.id}">
              <td class="mono">${Utils.escapeHtml(p.prNumber)}</td>
              <td>${Utils.escapeHtml(p.plant)}</td>
              <td>${Utils.escapeHtml(p.requestedBy)}</td>
              <td class="mono">${Utils.formatDate(p.dateSubmitted)}</td>
              <td class="mono">${p.expectedArrival ? Utils.formatDate(p.expectedArrival) : '—'}</td>
              <td>${this.statusBadge(p.overallStatus)}</td>
              <td>${this.miniTracker(p)}</td>
              <td class="mono">${p.overallStatus === 'Cancelled' ? '—' : Utils.daysWaiting(p) + 'd'}</td>
              ${isAdmin ? `<td><button class="icon-btn row-delete-btn" data-id="${p.id}" title="Delete" style="width:28px;height:28px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"></path></svg></button></td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  statusBadge(status) {
    const c = STATUS_COLORS[status] || STATUS_COLORS.Submitted;
    return `<span class="badge" style="--bg-c:${c.bg};--fg-c:${c.fg};"><span class="dot-sm"></span>${status}</span>`;
  },

  itemStatusBadge(status) {
    const c = ITEM_STATUS_COLORS[status] || ITEM_STATUS_COLORS.Pending;
    return `<span class="badge" style="--bg-c:${c.bg};--fg-c:${c.fg};font-size:10.5px;padding:2px 7px;">${status}</span>`;
  },

  miniTracker(pr) {
    if (pr.overallStatus === 'Cancelled') {
      return `<div class="stage-tracker-mini cancelled" title="Cancelled">${OVERALL_STATUSES.slice(0, 5).map(() => '<div class="seg"></div>').join('')}</div>`;
    }
    const idx = STATUS_STAGE_INDEX[pr.overallStatus];
    return `<div class="stage-tracker-mini" title="${pr.overallStatus} · ${Utils.completionPct(pr)}% complete">
      ${[0, 1, 2, 3, 4].map((i) => `<div class="seg ${i <= idx ? 'done' : ''}"></div>`).join('')}
    </div>`;
  },

  fullTracker(pr) {
    const stages = OVERALL_STATUSES.slice(0, 5); // exclude Cancelled from the linear flow
    if (pr.overallStatus === 'Cancelled') {
      return `<div class="stage-tracker cancelled">
        ${stages.map((s) => `<div class="stage"><div class="line"></div><div class="dot"></div><div class="stage-label">${s}</div></div>`).join('')}
      </div>`;
    }
    const idx = STATUS_STAGE_INDEX[pr.overallStatus];
    return `<div class="stage-tracker">
      ${stages.map((s, i) => `
        <div class="stage ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}">
          <div class="line"></div><div class="dot"></div><div class="stage-label">${s}</div>
        </div>
      `).join('')}
    </div>`;
  },

  exportCSV(prs) {
    if (!prs.length) { Utils.toast('Nothing to export.', 'error'); return; }
    const rows = prs.map((p) => ({
      'PR Number': p.prNumber, Plant: p.plant, 'Requested By': p.requestedBy,
      'Date Submitted': p.dateSubmitted, 'Expected Arrival': p.expectedArrival || '',
      'Date Fully Arrived': p.dateFullyArrived || '', 'Overall Status': p.overallStatus,
      'Days Waiting': Utils.daysWaiting(p), 'Completion %': Utils.completionPct(p), Remarks: p.remarks || ''
    }));
    Utils.downloadCSV(`purchase-requisitions-${Utils.todayISO()}.csv`, rows);
    Utils.toast('CSV exported.', 'success');
  }
};
