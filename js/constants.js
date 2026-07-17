/* ============================================================
   constants.js — shared enums, lookups, and config
   ============================================================ */

const STORAGE_PREFIX = 'prt_';

const PLANTS = ['Plant 1', 'Plant 2', 'Plant 3', 'Plant 4'];

// Ordered — order encodes the real lifecycle of a requisition.
const OVERALL_STATUSES = [
  'Submitted',
  'For Approval',
  'Ordered',
  'Partially Delivered',
  'Completed',
  'Cancelled'
];

const ITEM_STATUSES = ['Pending', 'Partially Issued', 'Fully Issued', 'Cancelled'];

const UOM_OPTIONS = ['pcs', 'set', 'box', 'kg', 'g', 'L', 'mL', 'm', 'roll', 'unit', 'pair', 'pack'];

// Status → stage index on the tracker (Cancelled sits outside the normal flow)
const STATUS_STAGE_INDEX = {
  'Submitted': 0,
  'For Approval': 1,
  'Ordered': 2,
  'Partially Delivered': 3,
  'Completed': 4,
  'Cancelled': -1
};

const STATUS_COLORS = {
  'Submitted': { bg: 'var(--st-submitted-bg)', fg: 'var(--st-submitted-fg)' },
  'For Approval': { bg: 'var(--st-approval-bg)', fg: 'var(--st-approval-fg)' },
  'Ordered': { bg: 'var(--st-ordered-bg)', fg: 'var(--st-ordered-fg)' },
  'Partially Delivered': { bg: 'var(--st-partial-bg)', fg: 'var(--st-partial-fg)' },
  'Completed': { bg: 'var(--st-completed-bg)', fg: 'var(--st-completed-fg)' },
  'Cancelled': { bg: 'var(--st-cancelled-bg)', fg: 'var(--st-cancelled-fg)' }
};

const ITEM_STATUS_COLORS = {
  'Pending': { bg: 'var(--st-submitted-bg)', fg: 'var(--st-submitted-fg)' },
  'Partially Issued': { bg: 'var(--st-partial-bg)', fg: 'var(--st-partial-fg)' },
  'Fully Issued': { bg: 'var(--st-completed-bg)', fg: 'var(--st-completed-fg)' },
  'Cancelled': { bg: 'var(--st-cancelled-bg)', fg: 'var(--st-cancelled-fg)' }
};

// Default accounts — changeable per-user from Settings after first login.
const DEFAULT_USERS = [
  { username: 'admin', password: 'admin', role: 'admin', plant: null, label: 'Administrator' },
  { username: 'plant1', password: 'plant1', role: 'plant', plant: 'Plant 1', label: 'Plant 1' },
  { username: 'plant2', password: 'plant2', role: 'plant', plant: 'Plant 2', label: 'Plant 2' },
  { username: 'plant3', password: 'plant3', role: 'plant', plant: 'Plant 3', label: 'Plant 3' },
  { username: 'plant4', password: 'plant4', role: 'plant', plant: 'Plant 4', label: 'Plant 4' }
];

const MAX_IMAGE_DIM = 1280; // px, images are downscaled to this before storage
const IMAGE_JPEG_QUALITY = 0.72;
