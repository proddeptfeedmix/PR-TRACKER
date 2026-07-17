/* ============================================================
   dashboard.js — stats overview, trend chart, recent activity
   ============================================================ */

const Dashboard = {
  render() {
    const user = Auth.currentUser();
    const isAdmin = user.role === 'admin';
    let prs = Data.visiblePRs();

    if (isAdmin && App.state.dashboardPlantFilter) {
      prs = prs.filter((p) => p.plant === App.state.dashboardPlantFilter);
    }

    const counts = { Submitted: 0, 'For Approval': 0, Ordered: 0, 'Partially Delivered': 0, Completed: 0, Cancelled: 0 };
    prs.forEach((p) => { counts[p.overallStatus] = (counts[p.overallStatus] || 0) + 1; });

    const active = prs.filter((p) => p.overallStatus !== 'Cancelled');
    const avgWait = active.length ? Math.round(active.reduce((s, p) => s + Utils.daysWaiting(p), 0) / active.length) : 0;
    const avgCompletion = active.length ? Math.round(active.reduce((s, p) => s + Utils.completionPct(p), 0) / active.length) : 0;

    const recent = prs.slice(0, 6);

    const plantFilterHtml = isAdmin ? `
      <select class="filter-select" id="dash-plant-filter">
        <option value="">All plants</option>
        ${PLANTS.map((p) => `<option value="${p}" ${App.state.dashboardPlantFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
    ` : '';

    document.getElementById('view-dashboard').innerHTML = `
      <div class="view-header">
        <div>
          <h2>Dashboard</h2>
          <div class="sub">${isAdmin ? 'All plants overview' : user.plant + ' overview'}</div>
        </div>
        ${plantFilterHtml}
      </div>

      <div class="stat-grid">
        <div class="stat-card"><div class="label">Total PRs</div><div class="value">${prs.length}</div></div>
        ${OVERALL_STATUSES.map((s) => `
          <div class="stat-card status-tint" style="--tint:${STATUS_COLORS[s].fg}">
            <div class="label">${s}</div><div class="value">${counts[s] || 0}</div>
          </div>
        `).join('')}
        <div class="stat-card"><div class="label">Avg. Waiting Days</div><div class="value accent">${avgWait}</div></div>
        <div class="stat-card"><div class="label">Completion %</div><div class="value accent">${avgCompletion}%</div></div>
      </div>

      <div class="panel">
        <div class="panel-title">Requisitions submitted — last 6 months</div>
        ${this.trendChart(prs)}
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>Recent Purchase Requisitions</span>
          <button class="btn btn-sm" id="dash-view-all">View all →</button>
        </div>
        ${recent.length ? this.recentTable(recent) : '<div class="empty-state">No purchase requisitions yet.</div>'}
      </div>
    `;

    if (isAdmin) {
      document.getElementById('dash-plant-filter').addEventListener('change', (e) => {
        App.state.dashboardPlantFilter = e.target.value;
        this.render();
      });
    }
    document.getElementById('dash-view-all').addEventListener('click', () => { window.location.hash = 'list'; });
    document.querySelectorAll('#view-dashboard tbody tr').forEach((row) => {
      row.addEventListener('click', () => PRModal.open(row.dataset.id));
    });
  },

  trendChart(prs) {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(undefined, { month: 'short' }) });
    }
    const counts = months.map((m) => prs.filter((p) => (p.dateSubmitted || '').startsWith(m.key)).length);
    const max = Math.max(1, ...counts);
    return `
      <div class="trend-chart">
        ${months.map((m, i) => `
          <div class="trend-bar-wrap">
            <div class="trend-value">${counts[i]}</div>
            <div class="trend-bar" style="height:${Math.max(4, (counts[i] / max) * 100)}%"></div>
            <div class="trend-label">${m.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  recentTable(prs) {
    return `
      <div class="table-wrap">
        <table class="pr-table">
          <thead><tr><th>PR Number</th><th>Plant</th><th>Requested By</th><th>Submitted</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>
            ${prs.map((p) => `
              <tr data-id="${p.id}">
                <td class="mono">${Utils.escapeHtml(p.prNumber)}</td>
                <td>${Utils.escapeHtml(p.plant)}</td>
                <td>${Utils.escapeHtml(p.requestedBy)}</td>
                <td class="mono">${Utils.formatDate(p.dateSubmitted)}</td>
                <td>${PRList.statusBadge(p.overallStatus)}</td>
                <td>${PRList.miniTracker(p)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};
