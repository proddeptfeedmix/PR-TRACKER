/* ============================================================
   seed.js — first-run sample data so the app isn't empty
   ============================================================ */

const Seed = {
  run() {
    if (!Store.get('users', null)) {
      Store.set('users', DEFAULT_USERS.map((u) => ({ ...u })));
    }
    if (!Store.get('prs', null)) {
      Store.set('prs', this.buildSamplePRs());
    }
    if (!Store.get('settings', null)) {
      Store.set('settings', { companyName: 'Feedmix Manufacturing Co.', theme: 'dark' });
    }
    if (!Store.get('auditLog', null)) {
      Store.set('auditLog', []);
    }
  },

  buildSamplePRs() {
    const item = (description, qty, uom, issueStatus, dateArrived, remarks = '') => ({
      id: Utils.uid('item'),
      description, orderQty: qty, uom, issueStatus, dateArrived, remarks
    });

    const pr = (opts) => {
      const items = opts.items || [];
      const base = {
        id: Utils.uid('pr'),
        prNumber: opts.prNumber,
        plant: opts.plant,
        requestedBy: opts.requestedBy,
        dateSubmitted: opts.dateSubmitted,
        expectedArrival: opts.expectedArrival || '',
        dateFullyArrived: opts.dateFullyArrived || '',
        overallStatus: opts.overallStatus,
        remarks: opts.remarks || '',
        items,
        attachments: [],
        createdBy: opts.plant.toLowerCase().replace(' ', ''),
        createdAt: opts.dateSubmitted + 'T08:00:00',
        updatedAt: opts.dateSubmitted + 'T08:00:00'
      };
      base.overallStatus = Utils.deriveOverallStatus(base);
      return base;
    };

    return [
      pr({
        prNumber: 'PR-2026-0041', plant: 'Plant 1', requestedBy: 'J. Ramos',
        dateSubmitted: '2026-06-02', expectedArrival: '2026-06-16', dateFullyArrived: '2026-06-15',
        overallStatus: 'Completed', remarks: 'Quarterly mill roller replacement',
        items: [
          item('Roller mill bearing 6205-2RS', 4, 'pcs', 'Fully Issued', '2026-06-15'),
          item('Drive belt A-42', 2, 'pcs', 'Fully Issued', '2026-06-15')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0042', plant: 'Plant 1', requestedBy: 'J. Ramos',
        dateSubmitted: '2026-06-20', expectedArrival: '2026-07-05',
        overallStatus: 'Ordered', remarks: 'Pending supplier confirmation',
        items: [
          item('Pellet die 4mm ring', 1, 'set', 'Pending', ''),
          item('Conditioner paddle set', 6, 'pcs', 'Pending', '')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0043', plant: 'Plant 1', requestedBy: 'M. Cruz',
        dateSubmitted: '2026-07-01',
        overallStatus: 'Submitted', remarks: 'For supervisor approval',
        items: [item('Grease NLGI 2, 18kg pail', 3, 'unit', 'Pending', '')]
      }),
      pr({
        prNumber: 'PR-2026-0028', plant: 'Plant 2', requestedBy: 'A. Santos',
        dateSubmitted: '2026-05-18', expectedArrival: '2026-06-01', dateFullyArrived: '2026-06-03',
        overallStatus: 'Completed', remarks: 'Annual filter change-out',
        items: [
          item('Dust collector filter bag', 12, 'pcs', 'Fully Issued', '2026-06-03'),
          item('Cartridge filter element', 8, 'pcs', 'Fully Issued', '2026-06-03')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0029', plant: 'Plant 2', requestedBy: 'A. Santos',
        dateSubmitted: '2026-06-25', expectedArrival: '2026-07-10',
        overallStatus: 'Partially Delivered', remarks: 'Motor arrived, sensor still in transit',
        items: [
          item('3-phase motor 15HP', 1, 'unit', 'Fully Issued', '2026-07-08'),
          item('Proximity sensor PNP', 4, 'pcs', 'Pending', '')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0030', plant: 'Plant 2', requestedBy: 'R. Bautista',
        dateSubmitted: '2026-07-10',
        overallStatus: 'For Approval', remarks: 'Awaiting plant manager sign-off',
        items: [item('Chain drive sprocket 32T', 2, 'pcs', 'Pending', '')]
      }),
      pr({
        prNumber: 'PR-2026-0017', plant: 'Plant 3', requestedBy: 'L. Fernandez',
        dateSubmitted: '2026-04-30', expectedArrival: '2026-05-14',
        overallStatus: 'Cancelled', remarks: 'Duplicate of PR-2026-0016',
        items: [item('Gasket set, boiler flange', 1, 'set', 'Cancelled', '')]
      }),
      pr({
        prNumber: 'PR-2026-0018', plant: 'Plant 3', requestedBy: 'L. Fernandez',
        dateSubmitted: '2026-06-14', expectedArrival: '2026-06-28', dateFullyArrived: '2026-06-27',
        overallStatus: 'Completed', remarks: '',
        items: [item('Hydraulic hose assembly', 5, 'pcs', 'Fully Issued', '2026-06-27')]
      }),
      pr({
        prNumber: 'PR-2026-0019', plant: 'Plant 3', requestedBy: 'D. Villanueva',
        dateSubmitted: '2026-07-05', expectedArrival: '2026-07-20',
        overallStatus: 'Ordered', remarks: '',
        items: [
          item('Bucket elevator cup, poly', 40, 'pcs', 'Pending', ''),
          item('Elevator belt, rubber', 1, 'roll', 'Pending', '')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0055', plant: 'Plant 4', requestedBy: 'K. Domingo',
        dateSubmitted: '2026-06-10', expectedArrival: '2026-06-24', dateFullyArrived: '2026-06-22',
        overallStatus: 'Completed', remarks: 'GT-42 line PM parts',
        items: [
          item('Timing belt GT-42', 2, 'pcs', 'Fully Issued', '2026-06-22'),
          item('Bearing housing UCP 205', 4, 'pcs', 'Fully Issued', '2026-06-22')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0056', plant: 'Plant 4', requestedBy: 'K. Domingo',
        dateSubmitted: '2026-06-28', expectedArrival: '2026-07-12',
        overallStatus: 'Partially Delivered', remarks: '',
        items: [
          item('Load cell 500kg', 2, 'pcs', 'Fully Issued', '2026-07-11'),
          item('Indicator display unit', 1, 'unit', 'Partially Issued', '2026-07-11'),
          item('Signal cable, shielded', 1, 'roll', 'Pending', '')
        ]
      }),
      pr({
        prNumber: 'PR-2026-0057', plant: 'Plant 4', requestedBy: 'T. Reyes',
        dateSubmitted: '2026-07-13',
        overallStatus: 'Submitted', remarks: 'Urgent — line down',
        items: [item('VFD drive 10HP', 1, 'unit', 'Pending', '')]
      }),
      pr({
        prNumber: 'PR-2026-0058', plant: 'Plant 4', requestedBy: 'T. Reyes',
        dateSubmitted: '2026-07-14',
        overallStatus: 'For Approval', remarks: '',
        items: [item('Lubrication schedule labels, laminated', 20, 'pcs', 'Pending', '')]
      })
    ];
  }
};
