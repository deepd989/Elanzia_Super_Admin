// Presentation formatting. Screens and components import from here so that
// money, weight and dates read identically on every one of the 99 screens.

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INDIAN_DIGITS = new Intl.NumberFormat('en-IN');

const EMPTY = '-';

function isBlank(value) {
  return value === null || value === undefined || value === '' || Number.isNaN(value);
}

// Indian digit grouping: 1,50,000 not 150,000. Whole rupees by default -
// trade invoices quote paise, list screens do not.
export function formatINR(amount, { paise = false } = {}) {
  if (isBlank(amount)) return EMPTY;
  return paise ? INR_PAISE.format(amount) : INR.format(amount);
}

// Money without the symbol, for table columns that carry a header unit.
export function formatAmount(amount) {
  if (isBlank(amount)) return EMPTY;
  return INDIAN_DIGITS.format(Math.round(amount));
}

// Lakh and crore shorthand for dashboard tiles where the exact rupee does
// not matter but the magnitude does.
export function formatINRCompact(amount) {
  if (isBlank(amount)) return EMPTY;
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `₹${(amount / 1e3).toFixed(1)} K`;
  return formatINR(amount);
}

// Weight is always 3 decimal places. A jeweller reading 12.4g where the
// record says 12.400g will assume the portal is rounding their gold away.
export function formatGrams(grams, { unit = true } = {}) {
  if (isBlank(grams)) return EMPTY;
  const value = Number(grams).toFixed(3);
  return unit ? `${value} g` : value;
}

export function formatPercent(value, { decimals = 1 } = {}) {
  if (isBlank(value)) return EMPTY;
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatNumber(value) {
  if (isBlank(value)) return EMPTY;
  return INDIAN_DIGITS.format(value);
}

function toDate(value) {
  if (isBlank(value)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// 14 Mar 2026
export function formatDate(value) {
  const date = toDate(value);
  if (!date) return EMPTY;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// 14 Mar 2026, 4:32 pm
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return EMPTY;
  const day = formatDate(date);
  const time = date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
  return `${day}, ${time}`;
}

// Sortable, machine-shaped. Use in exports and query params, never on screen.
export function formatIsoDate(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : EMPTY;
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const RELATIVE_STEPS = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

// "3 days ago". Queue screens use this so an ageing application is obvious
// at a glance; detail screens show the absolute date alongside.
export function formatRelativeTime(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return EMPTY;

  const diff = date.getTime() - now;
  for (const [unit, ms] of RELATIVE_STEPS) {
    if (Math.abs(diff) >= ms) return RELATIVE.format(Math.round(diff / ms), unit);
  }
  return 'just now';
}

// Whole days elapsed, for SLA badges on review queues.
export function daysSince(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return null;
  return Math.floor((now - date.getTime()) / (24 * 60 * 60 * 1000));
}

// 22K, 18K. Fixtures store the karat as a number.
export function formatPurity(karat) {
  return isBlank(karat) ? EMPTY : `${karat}K`;
}

// ELZ-ORD-001042 stays readable when truncated in a narrow column.
export function formatId(id) {
  return isBlank(id) ? EMPTY : String(id).toUpperCase();
}

export function formatPhone(phone) {
  if (isBlank(phone)) return EMPTY;
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : String(phone);
}

// snake_case status keys into Title Case for any place without a mapped label.
export function humanise(value) {
  if (isBlank(value)) return EMPTY;
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
