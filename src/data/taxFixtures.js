// Feature fixtures for GST, e-invoicing and tax reporting - ADM-053, ADM-059,
// ADM-060, ADM-061.
//
// Everything here references src/data/core by id. The tax invoices themselves
// live in src/data/core/einvoices.js because Operations counts their failures
// too; this file holds what only the Tax area renders.
//
// WHO INVOICES WHOM
//
// On a marketplace there are two invoices for every supply, and confusing them
// is the commonest modelling error in this domain:
//
//   the SUPPLIER invoice   manufacturer to jeweller, for the goods, at 3 per
//                          cent GST on jewellery. One per manufacturer per
//                          order. Registered with the IRP. Lives in core.
//
//   the COMMISSION invoice Elanzia to manufacturer, for the platform's service,
//                          at 18 per cent GST on services. Raised monthly, not
//                          per order, which is how it actually works. Lives
//                          here.
//
// Elanzia is not in the chain of supply for the goods. It never buys or sells
// the jewellery, which is precisely why it is a TCS collector rather than a
// seller.

import { einvoices, manufacturerById, manufacturers, orderById, settlementLines } from '@/data/core';

export const TAX_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(TAX_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const pad = (value, width) => String(value).padStart(width, '0');
const pick = (list, index) => list[((index % list.length) + list.length) % list.length];

// GST on Elanzia's own commission. A service, not jewellery, so it is not the
// 3 per cent the goods carry.
export const COMMISSION_GST_PERCENT = 18;

// GST TCS under section 52. The operator collects one per cent of the net
// taxable value of supplies made through the platform and deposits it against
// the supplier's GSTIN, who then claims it back in their own return.
export const TCS_PERCENT = 1;

// An e-way bill is required above this consignment value. Below it the goods
// move on the invoice alone.
export const EWAY_BILL_THRESHOLD = 50000;

// Validity is one day for every 200 km, which is the rule for regular
// vehicles. Over-dimensional cargo gets a day per 20 km, which nothing in a
// jewellery consignment ever is.
export const EWAY_KM_PER_DAY = 200;

// ---------------------------------------------------------------------------
// E-way bills - ADM-060
// ---------------------------------------------------------------------------

// Road distances between the trade centres, in kilometres. Held as a table
// rather than computed, because a straight-line distance would put Rajkot to
// Kolkata inside one day's validity and it is emphatically not.
const ROAD_DISTANCE = {
  'Gujarat|Gujarat': 210,
  'Gujarat|Maharashtra': 540,
  'Gujarat|Rajasthan': 640,
  'Gujarat|Tamil Nadu': 1780,
  'Gujarat|Telangana': 1210,
  'Gujarat|West Bengal': 2050,
  'Gujarat|Karnataka': 1290,
  'Maharashtra|Maharashtra': 150,
  'Maharashtra|Rajasthan': 1140,
  'Maharashtra|Tamil Nadu': 1330,
  'Maharashtra|Telangana': 710,
  'Maharashtra|West Bengal': 1960,
  'Rajasthan|Rajasthan': 190,
  'Rajasthan|Tamil Nadu': 2320,
  'Rajasthan|Telangana': 1560,
  'Rajasthan|West Bengal': 1500,
  'Tamil Nadu|Tamil Nadu': 180,
  'Tamil Nadu|Telangana': 630,
  'Tamil Nadu|West Bengal': 1660,
  'Telangana|Telangana': 160,
  'Telangana|West Bengal': 1490,
  'West Bengal|West Bengal': 170,
};

function distanceBetween(fromState, toState) {
  return (
    ROAD_DISTANCE[`${fromState}|${toState}`] ??
    ROAD_DISTANCE[`${toState}|${fromState}`] ??
    // Anything not in the table is a long haul between two states this
    // marketplace does not yet trade across.
    1400
  );
}

const TRANSPORT_MODES = ['road', 'road', 'road', 'air'];

const TRANSPORTERS = [
  { id: 'TRN-SEQ', name: 'Sequel Logistics' },
  { id: 'TRN-BVC', name: 'BVC Logistics' },
  { id: 'TRN-BRK', name: 'Brinks India' },
];

// A bill exists per registered supplier invoice on a DISPATCHED order: the
// document travels with the goods, so there is nothing to generate before the
// consignment leaves and nothing to generate for an invoice that never
// registered.
const shippable = einvoices.filter((invoice) => {
  const order = orderById[invoice.orderId];
  return invoice.status === 'generated' && Boolean(order.dispatchedAt);
});

export const ewayBills = shippable.map((invoice, index) => {
  const order = orderById[invoice.orderId];
  const manufacturer = manufacturerById[invoice.manufacturerId];
  const distanceKm = distanceBetween(manufacturer.state, invoice.placeOfSupply);
  const required = invoice.invoiceValue > EWAY_BILL_THRESHOLD;

  const generatedAt = order.dispatchedAt;
  const validDays = Math.max(1, Math.ceil(distanceKm / EWAY_KM_PER_DAY));
  const validUntil = new Date(Date.parse(generatedAt) + validDays * DAY_MS).toISOString();

  // A few bills were extended when a consignment was held at a checkpost, and
  // the extension is a real event with its own reason rather than a longer
  // original validity.
  const extended = required && index % 9 === 4;

  return {
    id: `EWB-${pad(index + 1, 4)}`,
    // The portal's own 12 digit number. Absent where no bill was needed.
    ewayBillNumber: required ? `${pad(index + 1, 4)}${pad((index * 7919) % 100000000, 8)}` : null,
    einvoiceId: invoice.id,
    orderId: invoice.orderId,
    manufacturerId: invoice.manufacturerId,
    manufacturerName: invoice.manufacturerName,
    jewellerId: invoice.jewellerId,
    jewellerName: invoice.jewellerName,
    documentNumber: invoice.documentNumber,
    consignmentValue: invoice.invoiceValue,
    required,
    fromState: manufacturer.state,
    fromCity: manufacturer.city,
    toState: invoice.placeOfSupply,
    toCity: order.shippingCity,
    distanceKm,
    transportMode: pick(TRANSPORT_MODES, index),
    transporterId: pick(TRANSPORTERS, index).id,
    transporterName: pick(TRANSPORTERS, index).name,
    vehicleNumber: required ? `GJ${pad((index % 40) + 1, 2)}${pick(['AB', 'CD', 'EF'], index)}${pad((index * 313) % 10000, 4)}` : null,
    awb: order.awb,
    // Whether the goods have landed. A bill for a consignment that arrived is
    // spent, not lapsed - see ewayStateOf.
    deliveredAt: order.deliveredAt,
    generatedAt: required ? generatedAt : null,
    validFrom: required ? generatedAt : null,
    validUntil: required ? validUntil : null,
    validDays,
    extendedCount: extended ? 1 : 0,
    extendedReason: extended ? 'Consignment held at the state checkpost for verification.' : null,
    cancelledAt: null,
  };
});

export const ewayBillById = Object.fromEntries(ewayBills.map((row) => [row.id, row]));

/**
 * What state a bill is in, computed at read time rather than stored.
 *
 * A bill expires by the clock. Storing the state would mean something has to
 * run to move it, and a consignment whose paperwork silently lapsed at midnight
 * is exactly the failure this screen exists to prevent.
 *
 * The order of the checks matters. A bill whose goods have been DELIVERED is
 * spent, not lapsed: the document did its job and the validity window running
 * out afterwards is simply what happens. Grading those as expired would put
 * fifty-odd red rows on the screen for consignments that arrived weeks ago, and
 * the three that genuinely are moving on lapsed paperwork - which is a
 * confiscation risk at the next checkpost - would be lost among them.
 */
export function ewayStateOf(bill, now = NOW_MS) {
  if (!bill.required) return 'not_required';
  if (bill.cancelledAt) return 'cancelled';
  if (!bill.validUntil) return 'pending';
  if (bill.deliveredAt) return 'completed';

  const remainingHours = (Date.parse(bill.validUntil) - now) / HOUR_MS;
  if (remainingHours <= 0) return 'expired';
  if (remainingHours <= 24) return 'expiring';
  return 'active';
}

// ---------------------------------------------------------------------------
// Elanzia's commission invoices - ADM-061
// ---------------------------------------------------------------------------

function monthKey(iso) {
  return iso.slice(0, 7);
}

// One invoice per manufacturer per month, for the commission retained on
// everything that settled in it. Monthly rather than per order because that is
// how a platform actually bills, and because a manufacturer would rather
// reconcile twelve invoices a year than four hundred.
const settledByMonth = settlementLines
  .filter((line) => line.status === 'settled' && line.settledAt)
  .reduce((map, line) => {
    const key = `${monthKey(line.settledAt)}|${line.manufacturerId}`;
    (map[key] ??= []).push(line);
    return map;
  }, {});

export const commissionInvoices = Object.entries(settledByMonth).map(([key, lines], index) => {
  const [period, manufacturerId] = key.split('|');
  const manufacturer = manufacturerById[manufacturerId];
  const taxableValue = lines.reduce((sum, line) => sum + line.commission, 0);
  const gstValue = Math.round((taxableValue * COMMISSION_GST_PERCENT) / 100);

  return {
    id: `CINV-${pad(index + 1, 4)}`,
    documentNumber: `EL/COM/2627/${pad(index + 1, 4)}`,
    period,
    manufacturerId,
    manufacturerName: manufacturer.businessName,
    recipientGstin: manufacturer.gstin,
    settlementLineIds: lines.map((line) => line.id),
    orderCount: new Set(lines.map((line) => line.orderId)).size,
    // The service Elanzia actually sold: the commission it retained.
    taxableValue,
    gstPercent: COMMISSION_GST_PERCENT,
    gstValue,
    total: taxableValue + gstValue,
    // Elanzia is a services supplier here, not a jewellery seller. HSN 9985 is
    // support services, which is what a marketplace provides.
    sac: '9985',
    issuedAt: `${period}-28T10:00:00.000Z`,
    status: 'issued',
  };
});

// ---------------------------------------------------------------------------
// TCS and GST periods - ADM-061
// ---------------------------------------------------------------------------

// Every settled supply, grouped by the month it settled in. TCS is collected on
// the NET taxable value of supplies made through the platform, so it is the
// supplier invoices that drive it, not Elanzia's own commission invoices.
const invoicesByMonth = einvoices
  .filter((invoice) => invoice.status === 'generated')
  .reduce((map, invoice) => {
    (map[monthKey(invoice.documentDate)] ??= []).push(invoice);
    return map;
  }, {});

export const taxPeriods = Object.entries(invoicesByMonth)
  .sort(([left], [right]) => right.localeCompare(left))
  .map(([period, invoices], index) => {
    const taxableValue = invoices.reduce((sum, row) => sum + row.taxableValue, 0);
    const gstValue = invoices.reduce((sum, row) => sum + row.gstValue, 0);
    const tcsCollected = Math.round((taxableValue * TCS_PERCENT) / 100);

    // The oldest periods have been filed; the current one is still open. A
    // filed period that could still change would make the return wrong.
    const filed = index > 1;

    return {
      period,
      label: new Date(`${period}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      invoiceCount: invoices.length,
      supplierCount: new Set(invoices.map((row) => row.manufacturerId)).size,
      taxableValue,
      gstValue,
      cgst: invoices.reduce((sum, row) => sum + row.cgst, 0),
      sgst: invoices.reduce((sum, row) => sum + row.sgst, 0),
      igst: invoices.reduce((sum, row) => sum + row.igst, 0),
      tcsRate: TCS_PERCENT,
      tcsCollected,
      // Deposited by the tenth of the following month, which is the GSTR-8
      // deadline.
      tcsRemitted: filed ? tcsCollected : 0,
      gstr8Status: filed ? 'filed' : index === 1 ? 'ready' : 'open',
      gstr8FiledAt: filed ? `${period}-10T10:00:00.000Z` : null,
      commissionValue: commissionInvoices
        .filter((row) => row.period === period)
        .reduce((sum, row) => sum + row.taxableValue, 0),
      commissionGst: commissionInvoices
        .filter((row) => row.period === period)
        .reduce((sum, row) => sum + row.gstValue, 0),
    };
  });

// TCS is deposited against each supplier's own GSTIN, so the operator has to be
// able to hand every manufacturer their own figure. This is the working for it.
export function tcsByManufacturer(period) {
  const invoices = (invoicesByMonth[period] ?? []).reduce((map, invoice) => {
    (map[invoice.manufacturerId] ??= []).push(invoice);
    return map;
  }, {});

  return Object.entries(invoices)
    .map(([manufacturerId, rows]) => {
      const taxableValue = rows.reduce((sum, row) => sum + row.taxableValue, 0);
      return {
        manufacturerId,
        manufacturerName: manufacturerById[manufacturerId].businessName,
        gstin: manufacturerById[manufacturerId].gstin,
        invoiceCount: rows.length,
        taxableValue,
        gstValue: rows.reduce((sum, row) => sum + row.gstValue, 0),
        tcsCollected: Math.round((taxableValue * TCS_PERCENT) / 100),
      };
    })
    .sort((left, right) => right.taxableValue - left.taxableValue);
}

// Supplies split by the state they were made to. A state-wise breakdown is what
// the return actually asks for, and deriving it at report time from the place
// of supply is the only way it can agree with the invoices.
export function suppliesByState(period) {
  const invoices = invoicesByMonth[period] ?? [];

  return Object.entries(
    invoices.reduce((map, invoice) => {
      (map[invoice.placeOfSupply] ??= { taxableValue: 0, gstValue: 0, invoiceCount: 0 });
      map[invoice.placeOfSupply].taxableValue += invoice.taxableValue;
      map[invoice.placeOfSupply].gstValue += invoice.gstValue;
      map[invoice.placeOfSupply].invoiceCount += 1;
      return map;
    }, {}),
  )
    .map(([state, totals]) => ({ state, ...totals }))
    .sort((left, right) => right.taxableValue - left.taxableValue);
}

export const MANUFACTURER_COUNT = manufacturers.length;
