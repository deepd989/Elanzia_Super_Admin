// CANONICAL FIXTURE - the supplier tax invoice registered with the IRP.
//
// This is core rather than a feature fixture because three areas read it and
// none of them may disagree: Tax registers and repairs it (ADM-053, ADM-059 to
// ADM-061), Orders shows it on the order record (ADM-049), and Operations
// counts the failures on the dashboard (ADM-010, ADM-012).
//
// ONE INVOICE PER SUPPLIER, NOT PER ORDER
//
// On a marketplace the operator does not sell the goods. Each manufacturer
// sells to the jeweller under its own GSTIN and raises its own tax invoice, so
// a three-manufacturer order produces three invoices, each registered with the
// Invoice Registration Portal separately and each carrying its own IRN. That is
// why this file keys on a settlement line rather than on an order.
//
// Elanzia's own commission invoice is a different document with a different
// GSTIN and a different HSN, raised monthly rather than per order. It lives in
// src/data/taxFixtures.js because only the Tax area renders it.
//
// WHERE THE NUMBERS COME FROM
//
// An order line's unitPrice is GST inclusive - it is the product's price.total,
// which already carries the 3 per cent. So the taxable value is not the line
// total divided by 1.03; it is the sum of the products' own `subtotal` figures,
// which core already holds exactly. Deriving it by division would introduce
// rounding into a number that has to tie out to the rupee on a GST return.
//
// CGST AND SGST, OR IGST
//
// Where the manufacturer and the jeweller are in the same state the tax splits
// into CGST and SGST at half the rate each. Where they are not, it is IGST at
// the full rate. Same total either way, and getting it wrong is a filing error
// rather than a display bug, which is why it is decided here once.

import { orders } from './orders';
import { products } from './products';
import { manufacturers } from './manufacturers';
import { jewellers } from './jewellers';
import { settlementLines } from './settlementLines';

// The statutory window in which a registered IRN may still be cancelled. After
// it closes the only remedy is a credit note, which is a different document
// with different consequences.
export const IRN_CANCELLATION_WINDOW_HOURS = 24;

export const EINVOICE_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(EINVOICE_NOW);
const HOUR_MS = 3600000;

const productById = Object.fromEntries(products.map((row) => [row.id, row]));
const manufacturerById = Object.fromEntries(manufacturers.map((row) => [row.id, row]));
const jewellerById = Object.fromEntries(jewellers.map((row) => [row.id, row]));
const orderById = Object.fromEntries(orders.map((row) => [row.id, row]));

// Real IRP rejection codes. A made-up code would send the backend team looking
// for it in the NIC documentation and not finding it.
const IRN_FAILURES = [
  { code: '2150', reason: 'Duplicate IRN for the same document number and financial year' },
  { code: '2172', reason: 'Recipient GSTIN is inactive on the portal' },
  { code: '3028', reason: 'Recipient GSTIN not found in the GSTN register' },
  { code: 'GTW-504', reason: 'IRP gateway timed out before returning an acknowledgement' },
];

const pad = (value, width) => String(value).padStart(width, '0');

// Only a confirmed order has a document to register. An order that was never
// confirmed was never a supply - which is why the two cancelled orders in core
// produce no invoice at all rather than a cancelled one. A cancellation AFTER
// registration is a different thing entirely, reachable only by calling the
// portal inside the 24 hour window, so 'cancelled' is a status this file never
// writes and only POST /admin/tax/einvoices/:id/cancel ever sets.
const invoiceable = settlementLines.filter((line) => Boolean(orderById[line.orderId].confirmedAt));

// The most recently confirmed documents have not been pushed to the portal yet.
// Held as a set rather than a time comparison so the count stays fixed as the
// anchor date moves, and the console always has a few rows in flight.
const PENDING_PUSH_COUNT = 3;
const byConfirmedDesc = [...invoiceable].sort(
  (left, right) =>
    Date.parse(orderById[right.orderId].confirmedAt) - Date.parse(orderById[left.orderId].confirmedAt),
);
const pendingLineIds = new Set(
  byConfirmedDesc.slice(0, PENDING_PUSH_COUNT).map((line) => line.id),
);

// Documents whose first push was rejected and which were re-registered this
// morning. Their acknowledgement is hours old rather than days, which is what
// puts them inside the statutory cancellation window - the only rows on which
// ADM-059 can offer to pull an IRN back. Without them the 24 hour rule would be
// unreachable in every state of this fixture, and an unreachable rule is one
// nobody notices is broken.
const recoveredLineIds = new Map(
  byConfirmedDesc
    .slice(PENDING_PUSH_COUNT, PENDING_PUSH_COUNT + 2)
    .map((line, index) => [line.id, 8 + index * 11]),
);

// Each supplier runs its own invoice series inside the financial year, so the
// sequence restarts per manufacturer rather than running across the platform.
const seriesCounter = {};

export const einvoices = invoiceable.map((line, index) => {
  const order = orderById[line.orderId];
  const manufacturer = manufacturerById[line.manufacturerId];
  const jeweller = jewellerById[line.jewellerId];

  const lines = order.lines.filter((row) => line.lineIds.includes(row.id));
  const taxableValue = lines.reduce(
    (sum, row) => sum + productById[row.productId].price.subtotal * row.quantity,
    0,
  );
  // The rest of the GST-inclusive line total is the tax. Subtraction, not
  // division, so this ties out to the rupee against the settlement line.
  const gstValue = line.goodsValue - taxableValue;
  const gstRate = productById[lines[0].productId].price.gstPercent;

  // Place of supply is the recipient's state. Intra-state splits the same total
  // across the two heads; inter-state carries it all as IGST.
  const intraState = manufacturer.state === jeweller.state;
  const halfway = Math.round(gstValue / 2);

  const seriesKey = manufacturer.id;
  seriesCounter[seriesKey] = (seriesCounter[seriesKey] ?? 0) + 1;

  const documentDate = order.confirmedAt;
  const recoveredHoursAgo = recoveredLineIds.get(line.id) ?? null;
  const attemptedAt =
    recoveredHoursAgo === null
      ? new Date(Date.parse(documentDate) + 2 * HOUR_MS).toISOString()
      : new Date(NOW_MS - recoveredHoursAgo * HOUR_MS).toISOString();

  // Roughly one document in seven is rejected by the portal, and three of the
  // four codes are recipient-side problems the manufacturer cannot fix alone -
  // which is exactly why ADM-059 exists as a desk queue rather than a cron job.
  const failed = index % 7 === 3;
  const pending = !failed && pendingLineIds.has(line.id);
  const failure = IRN_FAILURES[index % IRN_FAILURES.length];

  const status = failed ? 'failed' : pending ? 'pending' : 'generated';
  const registered = status === 'generated';
  const irn = registered ? `${order.id.replace('-', '')}${manufacturer.id.slice(4)}${pad(index + 1, 6)}` : null;
  const ackDate = registered ? attemptedAt : null;

  return {
    id: `IRN-${pad(index + 1, 4)}`,
    settlementLineId: line.id,
    orderId: order.id,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    jewellerId: jeweller.id,
    jewellerName: jeweller.businessName,

    // The document, as it would read on paper.
    documentNumber: `${manufacturer.id.slice(4)}/2627/${pad(seriesCounter[seriesKey], 4)}`,
    documentType: 'INV',
    documentDate,
    supplierGstin: manufacturer.gstin,
    recipientGstin: jeweller.gstin,
    placeOfSupply: jeweller.state,
    supplyType: intraState ? 'intra_state' : 'inter_state',
    hsnCodes: [...new Set(lines.map((row) => productById[row.productId].hsn))],
    itemCount: lines.length,

    taxableValue,
    gstRate,
    cgst: intraState ? halfway : 0,
    sgst: intraState ? gstValue - halfway : 0,
    igst: intraState ? 0 : gstValue,
    gstValue,
    invoiceValue: line.goodsValue,

    // The IRP exchange.
    status,
    irn,
    ackNumber: registered ? `1120${pad(index + 1, 10)}` : null,
    ackDate,
    generatedAt: registered ? attemptedAt : null,
    attemptedAt: pending ? null : attemptedAt,
    failureCode: failed ? failure.code : null,
    failureReason: failed ? failure.reason : null,
    // A recovered document carries the attempts it took to register, because a
    // clean-looking invoice that needed three pushes is worth knowing about.
    retryCount: failed ? (index % 3) + 1 : recoveredHoursAgo === null ? 0 : 2,

    // The signed QR the portal returns. Stored whole because the printed
    // invoice has to carry it verbatim and a re-derived one would not verify.
    qrPayload: registered
      ? {
          SellerGstin: manufacturer.gstin,
          BuyerGstin: jeweller.gstin,
          DocNo: `${manufacturer.id.slice(4)}/2627/${pad(seriesCounter[seriesKey], 4)}`,
          DocTyp: 'INV',
          DocDt: documentDate.slice(0, 10),
          TotInvVal: line.goodsValue,
          ItemCnt: lines.length,
          MainHsnCode: productById[lines[0].productId].hsn,
          Irn: irn,
          IrnDt: ackDate,
        }
      : null,

    cancelledAt: null,
    cancellationReason: null,
  };
});

export const einvoiceById = Object.fromEntries(einvoices.map((row) => [row.id, row]));

export const einvoicesByOrderId = einvoices.reduce((map, row) => {
  (map[row.orderId] ??= []).push(row);
  return map;
}, {});

/**
 * Whether a registered invoice can still be pulled back from the portal.
 *
 * Computed at read time rather than stored, so an invoice ages out of its
 * cancellation window without anything having to run. `now` is injectable so
 * the mock API and a test can ask the question at a fixed moment.
 */
export function isCancellable(einvoice, now = NOW_MS) {
  if (einvoice.status !== 'generated' || !einvoice.ackDate) return false;
  return now - Date.parse(einvoice.ackDate) < IRN_CANCELLATION_WINDOW_HOURS * HOUR_MS;
}
