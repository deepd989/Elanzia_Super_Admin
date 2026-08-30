// Mock API for GST, e-invoicing and tax reporting - ADM-053, ADM-059, ADM-060,
// ADM-061.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Einvoice: { id, settlementLineId, orderId, manufacturerId, manufacturerName,
//             jewellerId, jewellerName, documentNumber, documentType: 'INV',
//             documentDate: ISO, supplierGstin, recipientGstin, placeOfSupply,
//             supplyType: 'intra_state'|'inter_state', hsnCodes: string[],
//             itemCount, taxableValue, gstRate, cgst, sgst, igst, gstValue,
//             invoiceValue,
//             status: 'generated'|'failed'|'pending'|'cancelled',
//             irn: string|null, ackNumber: string|null, ackDate: ISO|null,
//             generatedAt: ISO|null, attemptedAt: ISO|null,
//             failureCode: string|null, failureReason: string|null,
//             retryCount, qrPayload: QrPayload|null, cancelledAt: ISO|null,
//             cancellationReason: string|null, cancellable: boolean }
//   cancellable is computed at read time from ackDate against the statutory
//   24 hour window. It is never stored.
//
// QrPayload: { SellerGstin, BuyerGstin, DocNo, DocTyp, DocDt, TotInvVal,
//              ItemCnt, MainHsnCode, Irn, IrnDt }
//   Stored and returned whole because the printed invoice has to carry the
//   signed QR verbatim; a re-derived one would not verify.
//
// EwayBill: { id, ewayBillNumber: string|null, einvoiceId, orderId,
//             manufacturerId, manufacturerName, jewellerId, jewellerName,
//             documentNumber, consignmentValue, required: boolean,
//             fromState, fromCity, toState, toCity, distanceKm,
//             transportMode: 'road'|'air', transporterId, transporterName,
//             vehicleNumber: string|null, awb: string|null,
//             generatedAt: ISO|null, validFrom: ISO|null,
//             validUntil: ISO|null, validDays, extendedCount,
//             extendedReason: string|null, cancelledAt: ISO|null,
//             state: 'active'|'expiring'|'expired'|'cancelled'|'not_required'
//                    |'pending', hoursRemaining: number|null }
//   state and hoursRemaining are computed at read time. A consignment whose
//   paperwork lapsed at midnight must read as expired without anything having
//   had to run.
//
// TaxPeriod: { period: 'YYYY-MM', label, invoiceCount, supplierCount,
//              taxableValue, gstValue, cgst, sgst, igst, tcsRate, tcsCollected,
//              tcsRemitted, gstr8Status: 'open'|'ready'|'filed',
//              gstr8FiledAt: ISO|null, commissionValue, commissionGst }
//
// TcsRow: { manufacturerId, manufacturerName, gstin, invoiceCount,
//           taxableValue, gstValue, tcsCollected }
//
// StateRow: { state, taxableValue, gstValue, invoiceCount }
//
// CommissionInvoice: { id, documentNumber, period, manufacturerId,
//                      manufacturerName, recipientGstin,
//                      settlementLineIds: string[], orderCount, taxableValue,
//                      gstPercent, gstValue, total, sac, issuedAt: ISO,
//                      status }

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import {
  IRN_CANCELLATION_WINDOW_HOURS,
  einvoices,
  isCancellable,
  orderById,
} from '@/data/core';
import {
  EWAY_BILL_THRESHOLD,
  EWAY_KM_PER_DAY,
  TAX_NOW,
  TCS_PERCENT,
  commissionInvoices,
  ewayBills,
  ewayStateOf,
  suppliesByState,
  taxPeriods,
  tcsByManufacturer,
} from '@/data/taxFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let invoiceRecords = einvoices.map((row) => ({ ...row }));
let ewayRecords = ewayBills.map((row) => ({ ...row }));

const NOW_MS = Date.parse(TAX_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person, and it goes
// away with the mock layer. Do not build a route for it.
let actingAdmin = { id: 'STF-002', name: 'Tax desk' };
export function setActingAdmin(admin) {
  actingAdmin = admin ?? actingAdmin;
}

function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

const nowIso = () => new Date().toISOString();
const pad = (value, width) => String(value).padStart(width, '0');

function facetOf(rows, valueKey, labelKey) {
  const seen = new Map();
  rows.forEach((row) => {
    if (row[valueKey] && !seen.has(row[valueKey])) seen.set(row[valueKey], row[labelKey]);
  });
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label: label ?? value }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
}

// The cancellation window is a clock, so it is answered at read time. An
// invoice that aged out of it overnight reads as uncancellable without anything
// having had to run.
function decorateInvoice(invoice) {
  return { ...invoice, cancellable: isCancellable(invoice, NOW_MS) };
}

function decorateEway(bill) {
  const state = ewayStateOf(bill, NOW_MS);
  return {
    ...bill,
    state,
    hoursRemaining: bill.validUntil
      ? Math.round((Date.parse(bill.validUntil) - NOW_MS) / HOUR_MS)
      : null,
  };
}

// ---------------------------------------------------------------------------
// E-invoice console - ADM-053
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/tax/einvoices
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, manufacturerId, supplyType, period } }
// Returns: { items: Einvoice[], total, page, pageSize,
//            facets: { manufacturers: Option[], periods: Option[] } }
// Notes: sorted by documentDate descending by default.
//        One invoice per SUPPLIER, not per order. Each manufacturer on a
//        multi-supplier order invoices the jeweller under its own GSTIN, so an
//        order with three manufacturers produces three rows here and three IRNs.
//        search matches the document number, the IRN, the order id and both
//        party names.
export function listEinvoices(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;
  const { period, ...rest } = filters;

  return mockRequest(() => {
    let rows = invoiceRecords.map(decorateInvoice);
    if (period) rows = rows.filter((row) => row.documentDate.slice(0, 7) === period);
    rows = applySearch(rows, search, [
      'documentNumber',
      'irn',
      'orderId',
      'manufacturerName',
      'jewellerName',
    ]);
    rows = applyFilters(rows, rest);
    rows = applySort(rows, sortBy ?? 'documentDate', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        manufacturers: facetOf(invoiceRecords, 'manufacturerId', 'manufacturerName'),
        periods: [...new Set(invoiceRecords.map((row) => row.documentDate.slice(0, 7)))]
          .sort((left, right) => right.localeCompare(left))
          .map((value) => ({ value, label: value })),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/tax/einvoices/summary
// Query: { period }
// Returns: { generated, failed, pending, cancelled, taxableValue, gstValue,
//            invoiceValue, cancellableCount, windowHours }
// Notes: counts are of DOCUMENTS, not orders. cancellableCount is how many
//        registered invoices are still inside the statutory window, which is
//        the only set on which a cancellation can be offered at all.
export function getEinvoiceSummary({ period } = {}) {
  return mockRequest(() => {
    const rows = invoiceRecords
      .map(decorateInvoice)
      .filter((row) => !period || row.documentDate.slice(0, 7) === period);

    const registered = rows.filter((row) => row.status === 'generated');

    return {
      generated: registered.length,
      failed: rows.filter((row) => row.status === 'failed').length,
      pending: rows.filter((row) => row.status === 'pending').length,
      cancelled: rows.filter((row) => row.status === 'cancelled').length,
      taxableValue: registered.reduce((sum, row) => sum + row.taxableValue, 0),
      gstValue: registered.reduce((sum, row) => sum + row.gstValue, 0),
      invoiceValue: registered.reduce((sum, row) => sum + row.invoiceValue, 0),
      cancellableCount: rows.filter((row) => row.cancellable).length,
      windowHours: IRN_CANCELLATION_WINDOW_HOURS,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/tax/einvoices/:einvoiceId
// Returns: { einvoice: Einvoice, order: { id, status, placedAt, total },
//            ewayBill: EwayBill|null }
// Errors: 404 einvoice_not_found
// Notes: the signed QR payload comes back whole. It is what the printed invoice
//        has to carry, character for character, and a client that rebuilds it
//        from the fields produces something that will not verify at a checkpost.
export function getEinvoice(einvoiceId) {
  const invoice = invoiceRecords.find((row) => row.id === einvoiceId);
  if (!invoice) return mockError('einvoice_not_found', 'That invoice no longer exists', 404);

  return mockRequest(() => {
    const order = orderById[invoice.orderId];
    const bill = ewayRecords.find((row) => row.einvoiceId === einvoiceId);

    return {
      einvoice: decorateInvoice(invoice),
      order: { id: order.id, status: order.status, placedAt: order.placedAt, total: order.total },
      ewayBill: bill ? decorateEway(bill) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// IRN failures - ADM-059
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/tax/einvoices/failures
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { failureCode, manufacturerId } }
// Returns: { items: Einvoice[], total, page, pageSize, failedValue,
//            facets: { failureCodes: Option[] } }
// Notes: failures only, sorted by attemptedAt descending. An unregistered
//        invoice cannot travel with the goods, so every row here is a
//        consignment that cannot be dispatched - which is why this is a desk
//        queue and not a background retry job.
//        Three of the four IRP codes are recipient-side problems the
//        manufacturer cannot fix alone, so retrying without a call to the
//        jeweller usually fails again.
export function listIrnFailures(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    const failed = invoiceRecords.filter((row) => row.status === 'failed').map(decorateInvoice);

    let rows = applySearch(failed, search, ['documentNumber', 'orderId', 'manufacturerName', 'failureCode']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'attemptedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      failedValue: failed.reduce((sum, row) => sum + row.invoiceValue, 0),
      facets: { failureCodes: facetOf(failed, 'failureCode', 'failureCode') },
    };
  });
}

// BACKEND CONTRACT
// POST /admin/tax/einvoices/retry
// Body: { einvoiceIds: Einvoice.id[] }
// Returns: { updated: Einvoice[], stillFailing: Einvoice[] }
// Errors: 422 no_invoices_selected, 409 irn_already_generated
// Notes: a retry pushes the same document back to the portal. Codes 2172 and
//        3028 are recipient GSTIN problems: the portal will reject them again
//        until the jeweller's registration is fixed, so those come back in
//        `stillFailing` rather than being reported as success. A gateway
//        timeout usually clears on the second attempt, which is the one that
//        makes retrying worth offering at all.
export function retryIrn({ einvoiceIds = [] } = {}) {
  if (einvoiceIds.length === 0) return mockError('no_invoices_selected', 'Select at least one invoice', 422);

  const already = invoiceRecords.find(
    (row) => einvoiceIds.includes(row.id) && row.status === 'generated',
  );
  if (already) {
    return mockError('irn_already_generated', `${already.documentNumber} is already registered`, 409);
  }

  return mockRequest(() => {
    const at = nowIso();
    const stillFailing = [];

    invoiceRecords = invoiceRecords.map((row) => {
      if (!einvoiceIds.includes(row.id)) return row;

      // A recipient GSTIN problem is not fixed by asking the portal again.
      const recipientProblem = row.failureCode === '2172' || row.failureCode === '3028';
      if (recipientProblem) {
        const unchanged = { ...row, attemptedAt: at, retryCount: row.retryCount + 1 };
        stillFailing.push(unchanged);
        return unchanged;
      }

      return {
        ...row,
        status: 'generated',
        irn: `${row.orderId.replace('-', '')}${row.manufacturerId.slice(4)}${pad(row.retryCount + 1, 6)}`,
        ackNumber: `1120${pad(Date.parse(at) % 10000000000, 10)}`,
        ackDate: at,
        generatedAt: at,
        attemptedAt: at,
        failureCode: null,
        failureReason: null,
        retryCount: row.retryCount + 1,
        qrPayload: {
          SellerGstin: row.supplierGstin,
          BuyerGstin: row.recipientGstin,
          DocNo: row.documentNumber,
          DocTyp: 'INV',
          DocDt: row.documentDate.slice(0, 10),
          TotInvVal: row.invoiceValue,
          ItemCnt: row.itemCount,
          MainHsnCode: row.hsnCodes[0],
          Irn: `${row.orderId.replace('-', '')}${row.manufacturerId.slice(4)}${pad(row.retryCount + 1, 6)}`,
          IrnDt: at,
        },
      };
    });

    return {
      updated: invoiceRecords.filter((row) => einvoiceIds.includes(row.id)).map(decorateInvoice),
      stillFailing: stillFailing.map(decorateInvoice),
    };
  });
}

// BACKEND CONTRACT
// POST /admin/tax/einvoices/:einvoiceId/cancel
// Body: { reason: string, note: string }
// Returns: Einvoice
// Errors: 404 einvoice_not_found, 422 cancellation_reason_required,
//         409 irn_not_registered, 409 irn_cancellation_window_closed,
//         409 eway_bill_active
// Notes: THE STATUTORY RULE. A registered IRN can be cancelled on the portal
//        for 24 hours from acknowledgement and not a minute longer. After that
//        the only remedy is a credit note, which is a different document with
//        different consequences for both parties' returns, so the refusal here
//        names it rather than just saying no.
//        An invoice with a live e-way bill cannot be cancelled either: the
//        goods are moving against it, and cancelling the document they travel
//        on strands a consignment at the next checkpost.
export function cancelIrn({ einvoiceId, reason, note = '' } = {}) {
  const invoice = invoiceRecords.find((row) => row.id === einvoiceId);
  if (!invoice) return mockError('einvoice_not_found', 'That invoice no longer exists', 404);
  if (!reason) return mockError('cancellation_reason_required', 'Choose why this is being cancelled', 422);
  if (invoice.status !== 'generated') {
    return mockError('irn_not_registered', 'Only a registered invoice can be cancelled', 409);
  }
  if (!isCancellable(invoice, NOW_MS)) {
    return mockError(
      'irn_cancellation_window_closed',
      `The ${IRN_CANCELLATION_WINDOW_HOURS} hour window closed. Raise a credit note instead.`,
      409,
    );
  }

  const bill = ewayRecords.find((row) => row.einvoiceId === einvoiceId);
  if (bill && ['active', 'expiring'].includes(ewayStateOf(bill, NOW_MS))) {
    return mockError(
      'eway_bill_active',
      'A live e-way bill travels against this invoice. Cancel the bill first.',
      409,
    );
  }

  return mockRequest(() => {
    const updated = {
      ...invoice,
      status: 'cancelled',
      cancelledAt: nowIso(),
      cancellationReason: reason,
      note: note.trim() || null,
    };
    invoiceRecords = invoiceRecords.map((row) => (row.id === einvoiceId ? updated : row));
    return decorateInvoice(updated);
  });
}

// ---------------------------------------------------------------------------
// E-way bills - ADM-060
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/tax/eway-bills
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { state, transportMode, manufacturerId } }
// Returns: { items: EwayBill[], total, page, pageSize,
//            facets: { manufacturers: Option[] } }
// Notes: sorted by validUntil ascending by default - the bill about to lapse is
//        the one somebody has to act on, and burying it under newly generated
//        ones is how a consignment gets stopped.
//        `state` is computed from validUntil at read time, never stored.
export function listEwayBills(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = ewayRecords.map(decorateEway);
    rows = applySearch(rows, search, ['ewayBillNumber', 'orderId', 'documentNumber', 'manufacturerName', 'vehicleNumber']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'validUntil', sortBy ? sortDir : 'asc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: { manufacturers: facetOf(ewayRecords, 'manufacturerId', 'manufacturerName') },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/tax/eway-bills/summary
// Returns: { active, expiring, expired, completed, notRequired, cancelled,
//            consignmentValue, expiredValue, threshold, kmPerDay }
// Notes: expiring means inside 24 hours. It is counted separately from active
//        because it is the only bucket where doing something today still helps.
//        expired means goods still IN TRANSIT on lapsed paperwork, which is a
//        confiscation risk at the next checkpost. A bill whose consignment was
//        delivered reads as completed instead: the document did its job.
export function getEwayBillSummary() {
  return mockRequest(() => {
    const rows = ewayRecords.map(decorateEway);
    const count = (state) => rows.filter((row) => row.state === state).length;

    return {
      active: count('active'),
      expiring: count('expiring'),
      expired: count('expired'),
      completed: count('completed'),
      notRequired: count('not_required'),
      cancelled: count('cancelled'),
      consignmentValue: rows.filter((row) => row.required).reduce((sum, row) => sum + row.consignmentValue, 0),
      expiredValue: rows
        .filter((row) => row.state === 'expired')
        .reduce((sum, row) => sum + row.consignmentValue, 0),
      threshold: EWAY_BILL_THRESHOLD,
      kmPerDay: EWAY_KM_PER_DAY,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/tax/eway-bills/:ewayBillId/extend
// Body: { reason: string, additionalDistanceKm: number }
// Returns: EwayBill
// Errors: 404 eway_bill_not_found, 422 extension_reason_required,
//         409 eway_bill_not_required, 409 eway_bill_expired,
//         409 extension_window_not_open
// Notes: a bill may only be extended in the eight hours either side of its
//        expiry. Extending a bill with three days left is not a thing the
//        portal permits, and neither is reviving one that has already lapsed -
//        that consignment needs a fresh bill and, usually, an explanation.
export function extendEwayBill({ ewayBillId, reason, additionalDistanceKm = 0 } = {}) {
  const bill = ewayRecords.find((row) => row.id === ewayBillId);
  if (!bill) return mockError('eway_bill_not_found', 'That e-way bill no longer exists', 404);
  if (!reason) return mockError('extension_reason_required', 'Say why the consignment needs longer', 422);
  if (!bill.required) {
    return mockError('eway_bill_not_required', 'This consignment is below the threshold and carries no bill', 409);
  }

  const state = ewayStateOf(bill, NOW_MS);
  if (state === 'expired') {
    return mockError('eway_bill_expired', 'That bill has lapsed. The consignment needs a fresh one.', 409);
  }
  if (state !== 'expiring') {
    return mockError(
      'extension_window_not_open',
      'A bill can only be extended within eight hours of its expiry',
      409,
    );
  }

  return mockRequest(() => {
    const extraDays = Math.max(1, Math.ceil(Number(additionalDistanceKm) / EWAY_KM_PER_DAY));
    const updated = {
      ...bill,
      validUntil: new Date(Date.parse(bill.validUntil) + extraDays * DAY_MS).toISOString(),
      validDays: bill.validDays + extraDays,
      extendedCount: bill.extendedCount + 1,
      extendedReason: reason,
      extendedById: actingAdmin.id,
    };
    ewayRecords = ewayRecords.map((row) => (row.id === ewayBillId ? updated : row));
    return decorateEway(updated);
  });
}

// ---------------------------------------------------------------------------
// TCS and tax reports - ADM-061
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/tax/periods
// Returns: { periods: TaxPeriod[], currentPeriod: 'YYYY-MM' }
// Notes: newest first. A period reads as 'open' while supplies can still be
//        added to it, 'ready' once the month has closed, and 'filed' once
//        GSTR-8 has gone in. A filed period whose numbers could still move
//        would make the return wrong, so nothing here edits one.
export function listTaxPeriods() {
  return mockRequest(() => ({
    periods: taxPeriods,
    currentPeriod: taxPeriods[0]?.period ?? null,
  }));
}

// BACKEND CONTRACT
// GET /admin/tax/tcs
// Query: { period }
// Returns: { period: TaxPeriod, byManufacturer: TcsRow[], byState: StateRow[],
//            commissionInvoices: CommissionInvoice[], rate, dueOn: ISO }
// Errors: 404 tax_period_not_found
// Notes: Elanzia collects tax at source as the marketplace operator under
//        section 52: one per cent of the net taxable value of supplies made
//        through the platform, deposited against each SUPPLIER's GSTIN, which
//        they then claim back in their own return. It is not Elanzia's tax and
//        never appears in its own liability.
//        In production the deduction happens at the nodal split. In this
//        prototype the settlement payout in src/data/core is authoritative and
//        fixed at goodsValue less commission, so TCS is reported alongside
//        rather than deducted from it. The backend team should deduct at the
//        split; nothing else about this report changes when they do.
//        byManufacturer and byState both sum exactly to the period's taxable
//        value. If they ever do not, the return is wrong.
//        dueOn is the tenth of the following month, the GSTR-8 deadline.
export function getTcsReport({ period } = {}) {
  const target = period ?? taxPeriods[0]?.period;
  const row = taxPeriods.find((entry) => entry.period === target);
  if (!row) return mockError('tax_period_not_found', 'That period has no supplies', 404);

  return mockRequest(() => {
    const [year, month] = target.split('-').map(Number);
    const dueMonth = month === 12 ? 1 : month + 1;
    const dueYear = month === 12 ? year + 1 : year;

    return {
      period: row,
      byManufacturer: tcsByManufacturer(target),
      byState: suppliesByState(target),
      commissionInvoices: commissionInvoices.filter((entry) => entry.period === target),
      rate: TCS_PERCENT,
      dueOn: `${dueYear}-${pad(dueMonth, 2)}-10T00:00:00.000Z`,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/tax/summary
// Query: { period }
// Returns: { outwardSupplies, gstCollected, cgst, sgst, igst, commissionValue,
//            commissionGst, tcsCollected, series: [{ period, label,
//            taxableValue, gstValue, tcsCollected }] }
// Notes: the goods GST at 3 per cent and Elanzia's commission GST at 18 per
//        cent are reported separately and never added together. They are
//        different supplies by different suppliers under different HSN and SAC
//        codes, and one figure covering both would be wrong on every return it
//        touched.
export function getGstSummary({ period } = {}) {
  const target = period ?? taxPeriods[0]?.period;
  const row = taxPeriods.find((entry) => entry.period === target);
  if (!row) return mockError('tax_period_not_found', 'That period has no supplies', 404);

  return mockRequest(() => ({
    outwardSupplies: row.taxableValue,
    gstCollected: row.gstValue,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    commissionValue: row.commissionValue,
    commissionGst: row.commissionGst,
    tcsCollected: row.tcsCollected,
    // Oldest first, because a chart reads left to right.
    series: [...taxPeriods]
      .sort((left, right) => left.period.localeCompare(right.period))
      .map((entry) => ({
        period: entry.period,
        label: entry.label,
        taxableValue: entry.taxableValue,
        gstValue: entry.gstValue,
        tcsCollected: entry.tcsCollected,
      })),
  }));
}

// BACKEND CONTRACT
// GET /admin/tax/export
// Query: { report: 'gstr8'|'einvoices'|'eway_bills'|'tcs', period,
//          format: 'csv'|'json' }
// Returns: { fileName, rowCount, generatedAt: ISO, report, period }
// Errors: 422 report_required, 404 tax_period_not_found,
//         409 period_not_ready
// Notes: GSTR-8 cannot be exported from an OPEN period. A return filed off a
//        month that can still take supplies is a return that will need
//        amending, and amending a TCS return means every supplier's credit
//        moves with it.
export function exportTaxReport({ report, period, format = 'csv' } = {}) {
  if (!report) return mockError('report_required', 'Choose which report to export', 422);

  const target = period ?? taxPeriods[0]?.period;
  const row = taxPeriods.find((entry) => entry.period === target);
  if (!row) return mockError('tax_period_not_found', 'That period has no supplies', 404);
  if (report === 'gstr8' && row.gstr8Status === 'open') {
    return mockError('period_not_ready', 'That month is still open and can take more supplies', 409);
  }

  return mockRequest(() => {
    const rowCount =
      report === 'einvoices'
        ? invoiceRecords.filter((entry) => entry.documentDate.slice(0, 7) === target).length
        : report === 'eway_bills'
          ? ewayRecords.length
          : tcsByManufacturer(target).length;

    return {
      fileName: `elanzia-${report}-${target}.${format}`,
      rowCount,
      generatedAt: nowIso(),
      report,
      period: target,
    };
  });
}
