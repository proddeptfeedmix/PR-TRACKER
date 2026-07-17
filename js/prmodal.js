/* ============================================================
   prmodal.js — create / edit / view a single purchase requisition
   ============================================================ */

const PRModal = {
  draft: null,
  backdrop: null,

  open(id) {
    const user = Auth.currentUser();
    const existing = id ? Data.getPRs().find((p) => p.id === id) : null;

    this.draft = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: Utils.uid('pr'),
      prNumber: '',
      plant: user.role === 'plant' ? user.plant : PLANTS[0],
      requestedBy: user.role === 'plant' ? '' : '',
      dateSubmitted: Utils.todayISO(),
      expectedArrival: '',
      dateFullyArrived: '',
      overallStatus: 'Submitted',
      remarks: '',
      items: [],
      attachments: [],
      createdBy: user.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.isNew = !existing;
    this.backdrop = App.openModal(this.templateHtml(), { dismissible: false });
    this.wireStaticFields();
    this.renderItems();
    this.renderAttachments('form');
    this.renderAttachments('items');
    this.updateDerivedUI();
  },

  templateHtml() {
    const user = Auth.currentUser();
    const plantLocked = user.role === 'plant';
    const d = this.draft;
    return `
      <div class="modal-header">
        <h3>${this.isNew ? 'New Purchase Requisition' : Utils.escapeHtml(d.prNumber || 'Edit Requisition')}</h3>
        <button class="modal-close" id="pm-close">✕</button>
      </div>
      <div class="modal-body">
        <div id="pm-tracker"></div>

        <div class="section-label" style="margin-top:20px;">General Information</div>
        <div class="form-grid">
          <div class="field" id="pm-field-prnumber">
            <label>PR Number</label>
            <input type="text" id="pm-prnumber" value="${Utils.escapeHtml(d.prNumber)}" placeholder="e.g. PR-2026-0059" />
            <div class="field-error">This PR Number already exists.</div>
          </div>
          <div class="field">
            <label>Plant</label>
            <select id="pm-plant" ${plantLocked || !this.isNew ? 'disabled' : ''}>
              ${PLANTS.map((p) => `<option value="${p}" ${d.plant === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="field" id="pm-field-requester">
            <label>Requested By</label>
            <input type="text" id="pm-requester" value="${Utils.escapeHtml(d.requestedBy)}" placeholder="Full name" />
          </div>
          <div class="field">
            <label>Overall Status</label>
            <select id="pm-status">
              ${['Submitted', 'For Approval', 'Ordered', 'Cancelled'].map((s) => `<option value="${s}" ${d.overallStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
              ${['Partially Delivered', 'Completed'].includes(d.overallStatus) ? `<option value="${d.overallStatus}" selected>${d.overallStatus} (auto)</option>` : ''}
            </select>
          </div>
          <div class="field" id="pm-field-submitted">
            <label>Date Submitted</label>
            <input type="date" id="pm-date-submitted" value="${d.dateSubmitted}" />
          </div>
          <div class="field">
            <label>Expected Arrival <span style="text-transform:none;font-weight:400;">(optional)</span></label>
            <input type="date" id="pm-expected" value="${d.expectedArrival}" />
          </div>
          <div class="field">
            <label>Date Fully Arrived</label>
            <input type="date" id="pm-fully-arrived" value="${d.dateFullyArrived}" />
          </div>
          <div class="field span-2">
            <label>Remarks</label>
            <textarea id="pm-remarks" rows="2" placeholder="Notes for this requisition">${Utils.escapeHtml(d.remarks)}</textarea>
          </div>
        </div>

        <div class="section-label">
          <span>Items</span>
          <button class="btn btn-sm" id="pm-add-item">+ Add item</button>
        </div>
        <div class="item-row-head">
          <span>Description</span><span>Qty</span><span>U/M</span><span>Date arrived</span><span>Issue status</span><span>Remarks</span><span></span>
        </div>
        <div id="pm-items"></div>

        <div class="section-label">PR Form Attachment</div>
        <div class="attach-grid" id="pm-attach-form"></div>

        <div class="section-label">Item Photos</div>
        <div class="attach-grid" id="pm-attach-items"></div>

        ${!this.isNew ? `<div class="section-label">Activity</div>
          <p style="font-size:12px;color:var(--text-muted);margin:0;">
            Created by ${Utils.escapeHtml(d.createdBy)} on ${Utils.formatDate((d.createdAt || '').slice(0, 10))}
            ${d.updatedAt && d.updatedAt !== d.createdAt ? ` · last updated ${Utils.formatDate((d.updatedAt || '').slice(0, 10))}` : ''}
          </p>` : ''}
      </div>
      <div class="modal-footer">
        ${!this.isNew && user.role === 'admin' ? `<button class="btn btn-danger" id="pm-delete" style="margin-right:auto;">Delete</button>` : ''}
        <button class="btn" id="pm-cancel">Cancel</button>
        <button class="btn btn-primary" id="pm-save">Save requisition</button>
      </div>
    `;
  },

  wireStaticFields() {
    const b = this.backdrop;
    b.querySelector('#pm-close').addEventListener('click', () => this.close());
    b.querySelector('#pm-cancel').addEventListener('click', () => this.close());

    b.querySelector('#pm-prnumber').addEventListener('input', (e) => { this.draft.prNumber = e.target.value; });
    b.querySelector('#pm-prnumber').addEventListener('blur', (e) => {
      const dup = e.target.value.trim() && Data.isDuplicatePRNumber(e.target.value, this.draft.id);
      b.querySelector('#pm-field-prnumber').classList.toggle('invalid', dup);
    });
    b.querySelector('#pm-plant').addEventListener('change', (e) => { this.draft.plant = e.target.value; });
    b.querySelector('#pm-requester').addEventListener('input', (e) => { this.draft.requestedBy = e.target.value; });
    b.querySelector('#pm-status').addEventListener('change', (e) => {
      this.draft.overallStatus = e.target.value;
      this.updateDerivedUI();
    });
    b.querySelector('#pm-date-submitted').addEventListener('change', (e) => { this.draft.dateSubmitted = e.target.value; this.updateDerivedUI(); });
    b.querySelector('#pm-expected').addEventListener('change', (e) => { this.draft.expectedArrival = e.target.value; });
    b.querySelector('#pm-fully-arrived').addEventListener('change', (e) => { this.draft.dateFullyArrived = e.target.value; this.updateDerivedUI(); });
    b.querySelector('#pm-remarks').addEventListener('input', (e) => { this.draft.remarks = e.target.value; });

    b.querySelector('#pm-add-item').addEventListener('click', () => {
      this.draft.items.push({ id: Utils.uid('item'), description: '', orderQty: 1, uom: 'pcs', dateArrived: '', issueStatus: 'Pending', remarks: '' });
      this.renderItems();
      this.updateDerivedUI();
    });

    b.querySelector('#pm-save').addEventListener('click', () => this.save());
    const delBtn = b.querySelector('#pm-delete');
    if (delBtn) delBtn.addEventListener('click', () => this.deleteFromModal());

    ['pm-attach-form', 'pm-attach-items'].forEach((id) => {}); // grids wired in renderAttachments
  },

  renderItems() {
    const container = this.backdrop.querySelector('#pm-items');
    if (!this.draft.items.length) {
      container.innerHTML = `<div style="font-size:12.5px;color:var(--text-muted);padding:10px 0;">No items added yet. Use “+ Add item” once the requisition is broken down into line items.</div>`;
      return;
    }
    container.innerHTML = this.draft.items.map((it) => `
      <div class="item-row" data-item-id="${it.id}">
        <input type="text" class="it-desc" placeholder="Item description" value="${Utils.escapeHtml(it.description)}" />
        <input type="number" min="0" step="1" class="it-qty" value="${it.orderQty}" />
        <select class="it-uom">${UOM_OPTIONS.map((u) => `<option value="${u}" ${it.uom === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
        <input type="date" class="it-arrived" value="${it.dateArrived || ''}" />
        <select class="it-status">${ITEM_STATUSES.map((s) => `<option value="${s}" ${it.issueStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <input type="text" class="it-remarks" placeholder="Remarks" value="${Utils.escapeHtml(it.remarks || '')}" />
        <button class="remove-item-btn" title="Remove item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.item-row').forEach((row) => {
      const id = row.dataset.itemId;
      const item = this.draft.items.find((i) => i.id === id);
      row.querySelector('.it-desc').addEventListener('input', (e) => { item.description = e.target.value; });
      row.querySelector('.it-qty').addEventListener('input', (e) => { item.orderQty = Number(e.target.value) || 0; });
      row.querySelector('.it-uom').addEventListener('change', (e) => { item.uom = e.target.value; });
      row.querySelector('.it-arrived').addEventListener('change', (e) => { item.dateArrived = e.target.value; });
      row.querySelector('.it-remarks').addEventListener('input', (e) => { item.remarks = e.target.value; });
      row.querySelector('.it-status').addEventListener('change', (e) => {
        item.issueStatus = e.target.value;
        if (item.issueStatus !== 'Pending' && !item.dateArrived) item.dateArrived = Utils.todayISO();
        this.renderItems();
        this.updateDerivedUI();
      });
      row.querySelector('.remove-item-btn').addEventListener('click', () => {
        this.draft.items = this.draft.items.filter((i) => i.id !== id);
        this.renderItems();
        this.updateDerivedUI();
      });
    });
  },

  renderAttachments(group) {
    const containerId = group === 'form' ? 'pm-attach-form' : 'pm-attach-items';
    const container = this.backdrop.querySelector(`#${containerId}`);
    const items = this.draft.attachments.filter((a) => a.group === group);

    container.innerHTML = items.map((a) => `
      <div class="attach-thumb" data-att-id="${a.id}">
        <img src="${a.dataUrl}" alt="Attachment" />
        <button class="rm" data-att-id="${a.id}" title="Remove">✕</button>
      </div>
    `).join('') + `
      <label class="attach-add">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add photo
        <input type="file" accept="image/*" multiple style="display:none;" class="attach-input" />
      </label>
    `;

    container.querySelectorAll('.attach-thumb img').forEach((img) => {
      img.addEventListener('click', () => this.openLightbox(img.src));
    });
    container.querySelectorAll('.rm').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.draft.attachments = this.draft.attachments.filter((a) => a.id !== btn.dataset.attId);
        this.renderAttachments(group);
      });
    });
    const fileInput = container.querySelector('.attach-input');
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        try {
          const dataUrl = await Utils.fileToResizedDataURL(file);
          this.draft.attachments.push({ id: Utils.uid('att'), group, dataUrl });
        } catch (err) {
          Utils.toast('Could not read one of the images.', 'error');
        }
      }
      this.renderAttachments(group);
    });
  },

  openLightbox(src) {
    const el = document.createElement('div');
    el.className = 'lightbox-backdrop';
    el.innerHTML = `<button class="lightbox-close">✕</button><img src="${src}" alt="Preview" />`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.classList.contains('lightbox-close')) el.remove(); });
    document.body.appendChild(el);
  },

  updateDerivedUI() {
    this.draft.overallStatus = Utils.deriveOverallStatus(this.draft);
    const tracker = this.backdrop.querySelector('#pm-tracker');
    const completion = Utils.completionPct(this.draft);
    const waiting = Utils.daysWaiting(this.draft);
    tracker.innerHTML = `
      ${PRList.fullTracker(this.draft)}
      <div style="display:flex; gap:18px; margin-top:14px; flex-wrap:wrap; align-items:center;">
        <div style="flex:1; min-width:160px;">
          <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-muted); margin-bottom:4px;">
            <span>Completion</span><span class="mono">${completion}%</span>
          </div>
          <div class="progress-bar"><div style="width:${completion}%"></div></div>
        </div>
        <div style="font-size:12px; color:var(--text-muted);">Waiting: <span class="mono" style="color:var(--text);">${waiting}d</span></div>
      </div>
    `;
    // Keep the status <select> in sync when items push it into an auto stage.
    const statusSelect = this.backdrop.querySelector('#pm-status');
    if (statusSelect && !['Submitted', 'For Approval', 'Ordered', 'Cancelled'].includes(this.draft.overallStatus)) {
      if (![...statusSelect.options].some((o) => o.value === this.draft.overallStatus)) {
        const opt = document.createElement('option');
        opt.value = this.draft.overallStatus;
        opt.textContent = `${this.draft.overallStatus} (auto)`;
        statusSelect.appendChild(opt);
      }
      statusSelect.value = this.draft.overallStatus;
    }
  },

  validate() {
    const d = this.draft;
    if (!d.prNumber.trim()) return 'PR Number is required.';
    if (Data.isDuplicatePRNumber(d.prNumber, d.id)) return 'That PR Number is already in use.';
    if (!d.plant) return 'Plant is required.';
    if (!d.requestedBy.trim()) return 'Requested By is required.';
    if (!d.dateSubmitted) return 'Date Submitted is required.';
    for (const it of d.items) {
      if (!it.description.trim()) return 'Every item needs a description (or remove the blank row).';
      if (!it.orderQty || it.orderQty <= 0) return `“${it.description}” needs a quantity greater than 0.`;
    }
    return null;
  },

  save() {
    const err = this.validate();
    if (err) { Utils.toast(err, 'error'); return; }
    const isNew = this.isNew;
    Data.upsertPR(this.draft);
    Data.logAudit({ actor: Auth.currentUser().username, action: `${isNew ? 'Created' : 'Updated'} ${this.draft.prNumber}` });
    Utils.toast(`Requisition ${isNew ? 'created' : 'saved'}.`, 'success');
    this.close();
    App.refreshCurrentView();
  },

  async deleteFromModal() {
    const ok = await App.confirmDialog({
      title: 'Delete purchase requisition?',
      message: `This will permanently delete ${this.draft.prNumber}. This cannot be undone.`,
      confirmLabel: 'Delete', danger: true
    });
    if (ok) {
      Data.deletePR(this.draft.id);
      Data.logAudit({ actor: Auth.currentUser().username, action: `Deleted ${this.draft.prNumber}` });
      this.close();
      Utils.toast('Purchase requisition deleted.', 'success');
      App.refreshCurrentView();
    }
  },

  close() {
    App.closeModal();
    this.draft = null;
  }
};
