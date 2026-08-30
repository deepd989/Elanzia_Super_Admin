// Mock API for payments, settlements and revenue configuration -
// ADM-050, ADM-051, ADM-052, ADM-054 to ADM-058, ADM-062.
//
// ENTITY SHAPES referenced by the contracts below:
//
// GatewayBatch: { id, settledOn: 'YYYY-MM-DD', creditedAt: ISO, utr,
//                 transactionCount, grossAmount, fee, gstOnFee, netCredited,
//                 matchedCount, unmatchedCount,
//                 status: 'reconciled'|'part_matched', reconciledAt: ISO|null,
//                 reconciledBy: AdminUser.id|null }
//   netCredited is what reached the NODAL account, gross less the aggregator's
//   fee and the GST on that fee.
//
// GatewayTransaction: { id, batchId, orderId, jewellerId, jewellerName, method,
//                       gatewayReference, capturedAt: ISO, settledOn,
//                       grossAmount, fee, gstOnFee, netAmount,
//                       matchStatus: 'matched'|'mismatched' }
//
// ManualPayment: { id, orderId, jewellerId, jewellerName,
//                  method: 'RTGS'|'NEFT', amount, utr, receivedAt: ISO,
//                  valueDate: 'YYYY-MM-DD', bankAccountId, remitterName,
//                  narration, recordedById: AdminUser.id, recordedByName,
//                  recordedAt: ISO, note: string|null }
//
// PaymentException: { id,
//                     kind: 'unmatched_receipt'|'amount_mismatch'
//                           |'duplicate_credit'|'short_payment'|'late_credit'
//                           |'missing_capture',
//                     detail, severity: 'high'|'medium'|'low',
//                     orderId: Order.id|null, jewellerId: Jeweller.id|null,
//                     jewellerName: string|null, remitterName, narration, utr,
//                     bankAccountId, expectedAmount: number|null,
//                     receivedAmount, varianceAmount, valueDate, raisedAt: ISO,
//                     ageHours, status: 'open'|'resolved',
//                     resolution: 'matched_to_order'|'refunded_to_remitter'
//                                 |'written_off'|null,
//                     resolvedAt: ISO|null, resolvedById: AdminUser.id|null,
//                     resolvedByName: string|null, resolutionNote: string|null }
//
// SettlementRun: { id, manufacturerId, manufacturerName, manufacturerCity,
//                  settlementLineIds: SettlementLine.id[], orderIds: Order.id[],
//                  lineCount, goodsValue, commission, payout,
//                  status: 'draft'|'ready'|'released'|'part_failed'|'completed',
//                  dueAt: ISO|null, releasedAt: ISO|null,
//                  releasedById: AdminUser.id|null, releasedByName: string|null,
//                  nodalReference: string|null, failedCount, note: string|null }
//   'released' is written only by the release endpoint. A run in the fixture is
//   never born released.
//
// SettlementLine: see src/data/core/settlementLines.js. Carries `held` and
//   `holdReason` once a hold has been placed.
//
// Beneficiary: { manufacturerId, manufacturerName, accountHolder,
//                accountNumberLast4, ifsc, bankName, verified: boolean,
//                verifiedAt: ISO|null, updatedAt: ISO }
//
// PayoutAttempt: see src/data/core/payouts.js.
//
// Refund: { id, orderId, jewellerId, jewellerName, amount,
//           reason: 'order_cancelled'|'return_verified'|'payment_duplicated'
//                   |'short_shipment'|'quality_rejected',
//           status: 'awaiting_verification'|'processed'|'rejected',
//           raisedAt: ISO, verifiedAt: ISO|null, processedAt: ISO|null,
//           method, utr: string|null, note: string|null }
//
// CreditNote: { id, documentNumber, orderId, settlementLineId,
//               partyType: 'manufacturer'|'jeweller', partyId, partyName,
//               reason: 'commission_reversal'|'goodwill'|'short_weight'
//                       |'delivery_waiver'|'plan_adjustment',
//               amount, taxableValue, gstValue,
//               status: 'draft'|'issued'|'applied', issuedAt: ISO,
//               appliedAt: ISO|null, issuedById, issuedByName,
//               note: string|null }
//
// CommissionConfig: { defaultPercent,
//                     categoryRules: [{ category, percent }],
//                     volumeSlabs: [{ fromValue, discountPercent }],
//                     updatedAt: ISO, updatedById: AdminUser.id }
//
// CommissionOverride: { manufacturerId, manufacturerName, percent, reason,
//                       effectiveFrom: ISO, effectiveTo: ISO|null,
//                       settledValue }
//
// CommissionAuditRow: { id, settlementLineId, orderId, manufacturerId,
//                       manufacturerName, goodsValue, appliedPercent,
//                       commission, source, confirmedAt: ISO,
//                       settledAt: ISO|null }
//
// MembershipPlan: { id, name, audience: 'jeweller'|'manufacturer',
//                   monthlyPrice, annualPrice, listingLimit: number|null,
//                   orderLimit: number|null, commissionDiscountPercent,
//                   features: string[], status: 'draft'|'live'|'retired',
//                   updatedAt: ISO }
//
// PlanSubscription: { id, memberType, memberId, memberName, planId, planName,
//                     cycle: 'monthly'|'annual', amount: number|null,
//                     status: 'active'|'past_due'|'cancelled'|'trialing',
//                     startedAt: ISO, renewsAt: ISO, cancelledAt: ISO|null }

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import {
  jewellerById,
  manufacturerById,
  orderById,
  payoutAttempts,
  settlementLineById,
  settlementLines,
} from '@/data/core';
import {
  BANK_ACCOUNTS,
  COMMISSION_EFFECTIVE_NOTICE_DAYS,
  PAYMENTS_NOW,
  beneficiaries,
  commissionAudit,
  commissionConfig,
  commissionOverrides,
  creditNotes,
  gatewayBatches,
  gatewayTransactions,
  manualPayments,
  membershipPlans,
  nodalPosition,
  paymentExceptions,
  planSubscriptions,
  refunds,
  settlementRuns,
} from '@/data/paymentsFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let batchRecords = gatewayBatches.map((row) => ({ ...row }));
let exceptionRecords = paymentExceptions.map((row) => ({ ...row }));
let manualRecords = manualPayments.map((row) => ({ ...row }));
let runRecords = settlementRuns.map((row) => ({ ...row }));
let lineRecords = settlementLines.map((row) => ({ ...row, held: false, holdReason: null }));
let payoutRecords = payoutAttempts.map((row) => ({ ...row }));
let beneficiaryRecords = beneficiaries.map((row) => ({ ...row }));
let refundRecords = refunds.map((row) => ({ ...row }));
let creditNoteRecords = creditNotes.map((row) => ({ ...row }));
let commissionRecord = JSON.parse(JSON.stringify(commissionConfig));
let planRecords = membershipPlans.map((row) => ({ ...row }));
let subscriptionRecords = planSubscriptions.map((row) => ({ ...row }));
let nodalRecord = { ...nodalPosition };

const NOW_MS = Date.parse(PAYMENTS_NOW);

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person, and it goes
// away with the mock layer. Do not build a route for it.
let actingAdmin = { id: 'STF-002', name: 'Finance desk' };
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

// ---------------------------------------------------------------------------
// Reconciliation - ADM-050
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/batches
// Query: { search, page, pageSize, sortBy, sortDir, filters: { status } }
// Returns: { items: GatewayBatch[], total, page, pageSize }
// Notes: sorted by settledOn descending by default - reconciliation is worked
//        newest first, because an unmatched credit found today is still
//        traceable and one found in March is not.
//        search matches the batch id and the UTR.
export function listGatewayBatches(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(batchRecords, search, ['id', 'utr']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'settledOn', sortBy ? sortDir : 'desc');
    return paginate(rows, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/payments/reconciliation/summary
// Returns: { capturedValue, creditedValue, feesRetained, matchedCount,
//            unmatchedCount, openExceptionValue, matchRate, nodal: NodalPosition,
//            facets: { statuses: Option[] } }
// NodalPosition: { accountId, balance, dueToRelease, commissionRetained,
//                  asOf: ISO }
// Notes: capturedValue is what the PLATFORM believes it took; creditedValue is
//        what the aggregator actually put in the nodal account. The gap between
//        them is the aggregator's fee plus anything that has not tied out, and
//        showing them as one number is how a shortfall goes unnoticed for a
//        quarter.
//        matchRate is matched transactions over all transactions, not over
//        batches. A batch that is 99 per cent matched is not a matched batch.
export function getReconciliationSummary() {
  return mockRequest(() => {
    const matched = gatewayTransactions.filter((row) => row.matchStatus === 'matched').length;

    return {
      capturedValue: gatewayTransactions.reduce((sum, row) => sum + row.grossAmount, 0),
      creditedValue: batchRecords.reduce((sum, row) => sum + row.netCredited, 0),
      feesRetained: batchRecords.reduce((sum, row) => sum + row.fee + row.gstOnFee, 0),
      matchedCount: matched,
      unmatchedCount: gatewayTransactions.length - matched,
      openExceptionValue: exceptionRecords
        .filter((row) => row.status === 'open')
        .reduce((sum, row) => sum + Math.abs(row.varianceAmount ?? 0), 0),
      matchRate:
        gatewayTransactions.length === 0
          ? 100
          : Number(((matched / gatewayTransactions.length) * 100).toFixed(1)),
      nodal: nodalRecord,
      facets: { statuses: facetOf(batchRecords, 'status', 'status') },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/payments/batches/:batchId
// Returns: { batch: GatewayBatch, transactions: GatewayTransaction[],
//            exceptions: PaymentException[] }
// Errors: 404 batch_not_found
// Notes: transactions are ordered mismatched first. A reconciler opening a
//        batch is looking for what did not tie out, and making them sort for it
//        is the difference between a tool and a report.
export function getBatch(batchId) {
  const batch = batchRecords.find((row) => row.id === batchId);
  if (!batch) return mockError('batch_not_found', 'That settlement batch no longer exists', 404);

  return mockRequest(() => ({
    batch,
    transactions: gatewayTransactions
      .filter((row) => row.batchId === batchId)
      .sort((left, right) => Number(right.matchStatus === 'mismatched') - Number(left.matchStatus === 'mismatched')),
    exceptions: exceptionRecords.filter((row) => row.valueDate === batch.settledOn),
  }));
}

// ---------------------------------------------------------------------------
// Exceptions and unmatched money - ADM-051
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/exceptions
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { kind, severity, status } }
// Returns: { items: PaymentException[], total, page, pageSize,
//            openValue, openCount,
//            facets: { kinds: Option[] } }
// Notes: sorted by raisedAt descending by default, and the queue OPENS on
//        status 'open' because resolved exceptions are history. An empty result
//        under that default means the desk is clear, not that the filters are
//        too narrow - the screen distinguishes the two.
//        openValue is the absolute money at stake: an overpayment and an
//        underpayment of the same size are both a lakh out of place.
export function listPaymentExceptions(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(exceptionRecords, search, ['id', 'utr', 'narration', 'remitterName', 'orderId']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'raisedAt', sortBy ? sortDir : 'desc');

    const open = exceptionRecords.filter((row) => row.status === 'open');

    return {
      ...paginate(rows, { page, pageSize }),
      openCount: open.length,
      openValue: open.reduce((sum, row) => sum + Math.abs(row.varianceAmount ?? 0), 0),
      facets: { kinds: facetOf(exceptionRecords, 'kind', 'kind') },
    };
  });
}

// BACKEND CONTRACT
// POST /admin/payments/exceptions/resolve
// Body: { exceptionIds: PaymentException.id[],
//         resolution: 'matched_to_order'|'refunded_to_remitter'|'written_off',
//         orderId: Order.id|null, note: string }
// Returns: { updated: PaymentException[] }
// Errors: 422 no_exceptions_selected, 422 resolution_required,
//         422 order_required_for_match, 422 resolution_note_required,
//         409 exception_already_resolved, 404 order_not_found
// Notes: matching to an order requires the order. Resolving an unmatched credit
//        as "matched" without saying what it was matched to leaves the money
//        exactly as untraceable as it was, with the queue now claiming it is not.
//        Writing money off needs a note, because it is the one resolution that
//        makes a real loss and somebody will be asked about it at audit.
export function resolveExceptions({ exceptionIds = [], resolution, orderId = null, note = '' } = {}) {
  if (exceptionIds.length === 0) {
    return mockError('no_exceptions_selected', 'Select at least one exception', 422);
  }
  if (!resolution) return mockError('resolution_required', 'Choose how these are being resolved', 422);
  if (resolution === 'matched_to_order' && !orderId) {
    return mockError('order_required_for_match', 'Say which order this money belongs to', 422);
  }
  if (resolution === 'matched_to_order' && !orderById[orderId]) {
    return mockError('order_not_found', 'That order no longer exists', 404);
  }
  if (resolution === 'written_off' && note.trim().length === 0) {
    return mockError('resolution_note_required', 'Writing money off needs a note', 422);
  }

  const already = exceptionRecords.find(
    (row) => exceptionIds.includes(row.id) && row.status === 'resolved',
  );
  if (already) {
    return mockError('exception_already_resolved', `${already.id} has already been resolved`, 409);
  }

  return mockRequest(() => {
    const at = nowIso();
    exceptionRecords = exceptionRecords.map((row) =>
      exceptionIds.includes(row.id)
        ? {
            ...row,
            status: 'resolved',
            resolution,
            orderId: resolution === 'matched_to_order' ? orderId : row.orderId,
            resolvedAt: at,
            resolvedById: actingAdmin.id,
            resolvedByName: actingAdmin.name,
            resolutionNote: note.trim() || null,
          }
        : row,
    );

    return { updated: exceptionRecords.filter((row) => exceptionIds.includes(row.id)) };
  });
}

// ---------------------------------------------------------------------------
// Manual payment recording - ADM-052
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/match-candidates
// Query: { amount, remitterName, jewellerId }
// Returns: { candidates: [{ orderId, jewellerId, jewellerName, total,
//                           placedAt: ISO, paymentStatus, confidence,
//                           reasons: string[] }] }
// Notes: ranked, best first, and every candidate says WHY it is a candidate.
//        An exact amount against an unpaid order from the same jeweller is a
//        near certainty; the same amount against a paid one is a duplicate and
//        the reason says so. A matcher that offers a ranked list without its
//        reasoning just moves the guessing to the operator.
export function findMatchCandidates({ amount, remitterName = '', jewellerId = null } = {}) {
  return mockRequest(() => {
    const target = Number(amount) || 0;

    const candidates = Object.values(orderById)
      .map((order) => {
        const jeweller = jewellerById[order.jewellerId];
        const reasons = [];
        let confidence = 0;

        if (order.total === target) {
          confidence += 55;
          reasons.push('exact_amount');
        } else if (Math.abs(order.total - target) <= 1000) {
          confidence += 25;
          reasons.push('near_amount');
        }
        if (jewellerId && order.jewellerId === jewellerId) {
          confidence += 25;
          reasons.push('same_jeweller');
        }
        if (
          remitterName &&
          jeweller.businessName.toLowerCase().includes(String(remitterName).toLowerCase().slice(0, 8))
        ) {
          confidence += 15;
          reasons.push('remitter_name');
        }
        if (order.payment.status !== 'captured') {
          confidence += 15;
          reasons.push('awaiting_payment');
        } else {
          reasons.push('already_paid');
          confidence -= 20;
        }

        return {
          orderId: order.id,
          jewellerId: order.jewellerId,
          jewellerName: jeweller.businessName,
          total: order.total,
          placedAt: order.placedAt,
          paymentStatus: order.payment.status,
          confidence,
          reasons,
        };
      })
      .filter((row) => row.confidence > 20)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, 8);

    return { candidates };
  });
}

// BACKEND CONTRACT
// POST /admin/payments/manual
// Body: { orderId, method: 'RTGS'|'NEFT', amount, utr, receivedAt: ISO,
//         bankAccountId, remitterName, note }
// Returns: { payment: ManualPayment, order: { id, paymentStatus } }
// Errors: 404 order_not_found, 422 utr_required, 422 amount_invalid,
//         409 duplicate_utr, 409 order_already_paid,
//         409 amount_does_not_match_order
// Notes: the UTR is mandatory and unique. It is the only handle the bank, the
//        jeweller and Elanzia all share, and a manual receipt without one
//        cannot be traced back to a statement line by anybody.
//        The amount must equal the order total. A part payment is not a
//        payment against this order; it is an exception, and it belongs in the
//        queue at POST /admin/payments/exceptions/resolve rather than being
//        quietly recorded here as though the order were settled.
//        Recording is attributed to the signed-in admin, because this is the
//        one place money enters the platform on somebody's say-so.
export function recordManualPayment({
  orderId,
  method = 'NEFT',
  amount,
  utr = '',
  receivedAt,
  bankAccountId = BANK_ACCOUNTS[0].id,
  remitterName = '',
  note = '',
} = {}) {
  const order = orderById[orderId];
  if (!order) return mockError('order_not_found', 'That order no longer exists', 404);
  if (utr.trim().length === 0) return mockError('utr_required', 'Enter the UTR from the bank statement', 422);

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return mockError('amount_invalid', 'Enter the amount credited', 422);
  }
  if (manualRecords.some((row) => row.utr === utr.trim())) {
    return mockError('duplicate_utr', 'That UTR has already been recorded against an order', 409);
  }
  if (order.payment.status === 'captured') {
    return mockError('order_already_paid', `${orderId} is already paid in full`, 409);
  }
  if (value !== order.total) {
    return mockError(
      'amount_does_not_match_order',
      `${orderId} is for ${order.total}. Raise an exception for a part payment rather than recording it here.`,
      409,
    );
  }

  return mockRequest(() => {
    const at = receivedAt ?? nowIso();
    const payment = {
      id: `MAN-${pad(manualRecords.length + 1, 4)}`,
      orderId,
      jewellerId: order.jewellerId,
      jewellerName: jewellerById[order.jewellerId].businessName,
      method,
      amount: value,
      utr: utr.trim(),
      receivedAt: at,
      valueDate: at.slice(0, 10),
      bankAccountId,
      remitterName: remitterName || jewellerById[order.jewellerId].businessName,
      narration: `${method} CR ${(remitterName || jewellerById[order.jewellerId].businessName).toUpperCase().slice(0, 18)}`,
      recordedById: actingAdmin.id,
      recordedByName: actingAdmin.name,
      recordedAt: nowIso(),
      note: note.trim() || null,
    };

    manualRecords = [payment, ...manualRecords];
    return { payment, order: { id: orderId, paymentStatus: 'captured' } };
  });
}

// BACKEND CONTRACT
// GET /admin/payments/manual
// Query: { search, page, pageSize, sortBy, sortDir, filters: { method } }
// Returns: { items: ManualPayment[], total, page, pageSize,
//            recordedToday, recordedValue }
// Notes: sorted by recordedAt descending by default, so the row somebody just
//        entered is the first thing they see and a mistake is caught while it
//        is still fresh.
export function listManualPayments(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(manualRecords, search, ['id', 'utr', 'orderId', 'jewellerName', 'remitterName']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'recordedAt', sortBy ? sortDir : 'desc');

    const today = new Date(NOW_MS).toISOString().slice(0, 10);

    return {
      ...paginate(rows, { page, pageSize }),
      recordedToday: manualRecords.filter((row) => row.recordedAt.slice(0, 10) === today).length,
      recordedValue: manualRecords.reduce((sum, row) => sum + row.amount, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Settlement runs - ADM-054, ADM-055
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/settlements
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, manufacturerId } }
// Returns: { items: SettlementRun[], total, page, pageSize }
// Notes: sorted by dueAt descending by default. A run batches one
//        manufacturer's due lines so they leave as ONE bank transfer - a
//        manufacturer with four due orders is expecting one credit on their
//        statement, not four.
export function listSettlementRuns(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(runRecords, search, ['id', 'manufacturerName', 'nodalReference']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'dueAt', sortBy ? sortDir : 'desc');
    return paginate(rows, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/payments/settlements/summary
// Returns: { nodal: NodalPosition, dueNow, dueNowValue, heldValue,
//            releasedThisMonth, commissionRetained, runsReady,
//            facets: { manufacturers: Option[], statuses: Option[] } }
// Notes: dueNow counts runs whose return window has CLOSED. A run that is due
//        next week is not money the desk can release today, and mixing the two
//        makes the number useless for deciding what to do this morning.
export function getSettlementSummary() {
  return mockRequest(() => {
    const due = runRecords.filter(
      (row) => ['draft', 'ready'].includes(row.status) && row.dueAt && Date.parse(row.dueAt) <= NOW_MS,
    );

    return {
      nodal: nodalRecord,
      dueNow: due.length,
      dueNowValue: due.reduce((sum, row) => sum + row.payout, 0),
      heldValue: lineRecords.filter((row) => row.held).reduce((sum, row) => sum + row.payout, 0),
      releasedThisMonth: runRecords
        .filter((row) => row.status === 'completed' || row.status === 'released')
        .reduce((sum, row) => sum + row.payout, 0),
      commissionRetained: runRecords.reduce((sum, row) => sum + row.commission, 0),
      runsReady: runRecords.filter((row) => row.status === 'ready').length,
      facets: {
        manufacturers: facetOf(runRecords, 'manufacturerId', 'manufacturerName'),
        statuses: facetOf(runRecords, 'status', 'status'),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/payments/settlements/:settlementId
// Returns: { run: SettlementRun, lines: SettlementLine[],
//            payouts: PayoutAttempt[],
//            manufacturer: { id, businessName, city, state, gstin,
//                            commissionPercent },
//            beneficiary: Beneficiary, nodal: NodalPosition }
// Errors: 404 settlement_not_found
// Notes: :settlementId accepts EITHER a settlement run id or an ORDER id. The
//        payout failure alert on ADM-012 links here with the order it failed
//        against, because that is the identifier the operator has in front of
//        them; resolving it to the run that order settles in is this endpoint's
//        job rather than the caller's.
export function getSettlement(settlementId) {
  let run = runRecords.find((row) => row.id === settlementId);

  if (!run) {
    // Handed an order id: find the run carrying that order's lines. Where an
    // order spans several manufacturers it appears in several runs, and the
    // one still outstanding is the one somebody is asking about.
    const candidates = runRecords.filter((row) => row.orderIds.includes(settlementId));
    run = candidates.find((row) => row.status !== 'completed') ?? candidates[0];
  }
  if (!run) return mockError('settlement_not_found', 'That settlement no longer exists', 404);

  return mockRequest(() => {
    const lines = run.settlementLineIds.map((id) => lineRecords.find((row) => row.id === id)).filter(Boolean);
    const manufacturer = manufacturerById[run.manufacturerId];

    return {
      run,
      lines,
      payouts: payoutRecords.filter((row) => run.settlementLineIds.includes(row.settlementLineId)),
      manufacturer: {
        id: manufacturer.id,
        businessName: manufacturer.businessName,
        city: manufacturer.city,
        state: manufacturer.state,
        gstin: manufacturer.gstin,
        commissionPercent: manufacturer.commissionPercent,
      },
      beneficiary: beneficiaryRecords.find((row) => row.manufacturerId === run.manufacturerId) ?? null,
      nodal: nodalRecord,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/payments/settlements/:runId/release
// Body: { note: string }
// Returns: { run: SettlementRun, payouts: PayoutAttempt[],
//            nodal: NodalPosition }
// Errors: 404 settlement_not_found, 409 run_already_released,
//         409 settlement_window_open, 409 nodal_insufficient,
//         409 beneficiary_unverified, 409 run_fully_held
// Notes: THE FOUR THINGS THAT STOP A RELEASE, and each one is money.
//        settlement_window_open - the return window has not closed on every
//        line. Paying a manufacturer for goods that are about to come back
//        means clawing it back, and clawing back from a workshop is a
//        relationship, not a transaction.
//        nodal_insufficient - the aggregator's nodal balance does not cover the
//        batch. Elanzia's own account is not an alternative source: that money
//        is not Elanzia's.
//        beneficiary_unverified - the bank details do not resolve, so the
//        transfer would come straight back and burn a day.
//        Held lines are skipped rather than blocking the rest; a run where
//        every line is held has nothing to release.
export function releaseSettlementRun({ runId, note = '' } = {}) {
  const run = runRecords.find((row) => row.id === runId);
  if (!run) return mockError('settlement_not_found', 'That settlement run no longer exists', 404);
  if (run.status === 'completed' || run.status === 'released') {
    return mockError('run_already_released', 'That run has already been released', 409);
  }

  const lines = run.settlementLineIds.map((id) => lineRecords.find((row) => row.id === id)).filter(Boolean);
  const releasable = lines.filter((line) => !line.held);
  if (releasable.length === 0) {
    return mockError('run_fully_held', 'Every line in this run is on hold', 409);
  }

  const openWindow = releasable.find((line) => line.dueAt && Date.parse(line.dueAt) > NOW_MS);
  if (openWindow) {
    return mockError(
      'settlement_window_open',
      `The return window on ${openWindow.orderId} does not close until ${openWindow.dueAt.slice(0, 10)}`,
      409,
    );
  }

  const amount = releasable.reduce((sum, line) => sum + line.payout, 0);
  if (amount > nodalRecord.balance) {
    return mockError(
      'nodal_insufficient',
      `The nodal account holds ${nodalRecord.balance}, short of the ${amount} this run needs`,
      409,
    );
  }

  const beneficiary = beneficiaryRecords.find((row) => row.manufacturerId === run.manufacturerId);
  if (!beneficiary?.verified) {
    return mockError(
      'beneficiary_unverified',
      `${run.manufacturerName}'s bank details do not resolve. Correct them before releasing.`,
      409,
    );
  }

  return mockRequest(() => {
    const at = nowIso();

    const newPayouts = releasable.map((line, index) => ({
      id: `PYT-R${pad(payoutRecords.length + index + 1, 4)}`,
      settlementLineId: line.id,
      orderId: line.orderId,
      manufacturerId: line.manufacturerId,
      manufacturerName: run.manufacturerName,
      attemptNumber: (payoutRecords.filter((row) => row.settlementLineId === line.id).length ?? 0) + 1,
      amount: line.payout,
      rail: line.payout >= 200000 ? 'RTGS' : 'NEFT',
      nodalReference: run.nodalReference,
      status: 'queued',
      attemptedAt: null,
      queuedAt: at,
      completedAt: null,
      utr: null,
      failureCode: null,
      failureReason: null,
      retryCount: 0,
      slaHours: 72,
      dueAt: line.dueAt,
    }));

    payoutRecords = [...payoutRecords, ...newPayouts];

    const updated = {
      ...run,
      status: 'released',
      releasedAt: at,
      releasedById: actingAdmin.id,
      releasedByName: actingAdmin.name,
      note: note.trim() || null,
    };
    runRecords = runRecords.map((row) => (row.id === runId ? updated : row));

    // The money leaves the nodal account. Commission stays behind, and is swept
    // to Elanzia separately - it never rides out with the payout.
    nodalRecord = {
      ...nodalRecord,
      balance: nodalRecord.balance - amount,
      dueToRelease: nodalRecord.dueToRelease - amount,
    };

    return { run: updated, payouts: newPayouts, nodal: nodalRecord };
  });
}

// BACKEND CONTRACT
// POST /admin/payments/settlements/lines/:lineId/hold
// Body: { reason: string, release: boolean }
// Returns: SettlementLine
// Errors: 404 settlement_line_not_found, 422 hold_reason_required,
//         409 line_already_settled
// Notes: a hold keeps one line back while the rest of the run goes out, which
//        is what a single disputed order in an otherwise clean batch needs. A
//        settled line cannot be held: the money has gone, and the remedy is a
//        credit note against the next run.
//        `release: true` lifts an existing hold.
export function holdSettlementLine({ lineId, reason = '', release = false } = {}) {
  const line = lineRecords.find((row) => row.id === lineId);
  if (!line) return mockError('settlement_line_not_found', 'That settlement line no longer exists', 404);
  if (!release && reason.trim().length === 0) {
    return mockError('hold_reason_required', 'Say why this line is being held back', 422);
  }
  if (!release && line.status === 'settled') {
    return mockError('line_already_settled', 'That money has already gone out', 409);
  }

  return mockRequest(() => {
    const updated = { ...line, held: !release, holdReason: release ? null : reason.trim() };
    lineRecords = lineRecords.map((row) => (row.id === lineId ? updated : row));
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Payout failures - ADM-056
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/payouts
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, failureCode, manufacturerId } }
// Returns: { items: PayoutAttempt[], total, page, pageSize, failedCount,
//            failedValue, queuedCount,
//            facets: { failureCodes: Option[], manufacturers: Option[] } }
// Notes: the queue is over the OUTSTANDING attempt per settlement line - the
//        newest one, and only where it did not clear. The log also holds
//        failures a later retry fixed, and listing those would have the desk
//        chasing money that has already arrived.
//        Opens on status 'failed'. An empty result under that default means
//        nothing is broken, not that the filters are too narrow.
export function listPayoutFailures(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    // Recomputed from the live records rather than read off the fixture, so a
    // retry inside this session moves the row out of the queue.
    const byLine = payoutRecords.reduce((map, row) => {
      (map[row.settlementLineId] ??= []).push(row);
      return map;
    }, {});
    const outstanding = Object.values(byLine)
      .map((attempts) => attempts[attempts.length - 1])
      .filter((attempt) => attempt.status === 'failed' || attempt.status === 'queued');

    let rows = applySearch(outstanding, search, ['id', 'orderId', 'manufacturerName', 'nodalReference']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'queuedAt', sortBy ? sortDir : 'desc');

    const failed = outstanding.filter((row) => row.status === 'failed');

    return {
      ...paginate(rows, { page, pageSize }),
      failedCount: failed.length,
      failedValue: failed.reduce((sum, row) => sum + row.amount, 0),
      queuedCount: outstanding.filter((row) => row.status === 'queued').length,
      facets: {
        failureCodes: facetOf(outstanding.filter((row) => row.failureCode), 'failureCode', 'failureCode'),
        manufacturers: facetOf(outstanding, 'manufacturerId', 'manufacturerName'),
      },
    };
  });
}

// BACKEND CONTRACT
// POST /admin/payments/payouts/retry
// Body: { payoutIds: PayoutAttempt.id[], note: string }
// Returns: { updated: PayoutAttempt[] }
// Errors: 422 no_payouts_selected, 409 payout_not_failed,
//         409 beneficiary_unverified
// Notes: a retry against unverified bank details is guaranteed to fail again,
//        so it is refused rather than queued. Roughly nine failures in ten on
//        this desk are a bank detail problem, and retrying without fixing them
//        is the single commonest way a payout queue stops moving while looking
//        busy.
//        A retry APPENDS an attempt. The failed one stays in the log, because
//        "paid on the third attempt" is a sentence the desk has to be able to
//        read six months later.
export function retryPayouts({ payoutIds = [], note = '' } = {}) {
  if (payoutIds.length === 0) return mockError('no_payouts_selected', 'Select at least one payout', 422);

  const targets = payoutRecords.filter((row) => payoutIds.includes(row.id));
  const notFailed = targets.find((row) => row.status !== 'failed');
  if (notFailed) {
    return mockError('payout_not_failed', `${notFailed.id} has not failed, so there is nothing to retry`, 409);
  }

  const unverified = targets.find(
    (row) => !beneficiaryRecords.find((b) => b.manufacturerId === row.manufacturerId)?.verified,
  );
  if (unverified) {
    return mockError(
      'beneficiary_unverified',
      `${unverified.manufacturerName}'s bank details still do not resolve. Correct them first.`,
      409,
    );
  }

  return mockRequest(() => {
    const at = nowIso();
    const added = targets.map((row, index) => ({
      ...row,
      id: `PYT-T${pad(payoutRecords.length + index + 1, 4)}`,
      attemptNumber: row.attemptNumber + 1,
      status: 'queued',
      attemptedAt: null,
      queuedAt: at,
      completedAt: null,
      utr: null,
      failureCode: null,
      failureReason: null,
      retryCount: row.attemptNumber,
      note: note.trim() || null,
    }));

    payoutRecords = [...payoutRecords, ...added];
    return { updated: added };
  });
}

// BACKEND CONTRACT
// PUT /admin/payments/beneficiaries/:manufacturerId
// Body: { accountNumber, ifsc, accountHolder, note }
// Returns: Beneficiary
// Errors: 404 manufacturer_not_found, 422 ifsc_invalid,
//         422 account_number_invalid
// Notes: the IFSC is validated for shape, not merely for presence. Four letters,
//        a zero, then six alphanumerics is the RBI format, and a typo here
//        sends a lakh to nobody and costs a working day.
//        Correcting the details marks the beneficiary verified, which is what
//        unblocks the retry at POST /admin/payments/payouts/retry.
//        Only the last four digits of the account number are ever returned.
export function updateBeneficiary({ manufacturerId, accountNumber = '', ifsc = '', accountHolder, note = '' } = {}) {
  const beneficiary = beneficiaryRecords.find((row) => row.manufacturerId === manufacturerId);
  if (!beneficiary) return mockError('manufacturer_not_found', 'That manufacturer no longer exists', 404);

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
    return mockError('ifsc_invalid', 'An IFSC is four letters, a zero, then six characters', 422);
  }
  if (!/^\d{9,18}$/.test(String(accountNumber).trim())) {
    return mockError('account_number_invalid', 'Enter the full account number', 422);
  }

  return mockRequest(() => {
    const updated = {
      ...beneficiary,
      accountNumberLast4: String(accountNumber).trim().slice(-4),
      ifsc: ifsc.trim().toUpperCase(),
      accountHolder: accountHolder || beneficiary.accountHolder,
      bankName: beneficiary.bankName,
      verified: true,
      verifiedAt: nowIso(),
      updatedAt: nowIso(),
      note: note.trim() || null,
    };
    beneficiaryRecords = beneficiaryRecords.map((row) =>
      row.manufacturerId === manufacturerId ? updated : row,
    );
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Refunds and credit notes - ADM-057
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/refunds
// Query: { search, page, pageSize, sortBy, sortDir, filters: { status, reason } }
// Returns: { items: Refund[], total, page, pageSize, awaitingCount,
//            awaitingValue }
// Notes: sorted by raisedAt descending by default. Rows sitting at
//        awaiting_verification are the NORMAL state of this queue, not a
//        backlog: no refund is shown as processed before the returned goods
//        have been verified, so a jeweller cannot be told their money is on the
//        way before anybody has weighed what came back.
export function listRefunds(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(refundRecords, search, ['id', 'orderId', 'jewellerName', 'utr']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'raisedAt', sortBy ? sortDir : 'desc');

    const awaiting = refundRecords.filter((row) => row.status === 'awaiting_verification');

    return {
      ...paginate(rows, { page, pageSize }),
      awaitingCount: awaiting.length,
      awaitingValue: awaiting.reduce((sum, row) => sum + row.amount, 0),
    };
  });
}

// BACKEND CONTRACT
// GET /admin/payments/credit-notes
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, partyType, reason } }
// Returns: { items: CreditNote[], total, page, pageSize, issuedValue }
// Notes: sorted by issuedAt descending by default. A credit note is not a
//        refund: it reduces what is owed rather than sending money back, which
//        is why the two live on one screen but never in one list.
export function listCreditNotes(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(creditNoteRecords, search, ['id', 'documentNumber', 'orderId', 'partyName']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'issuedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      issuedValue: creditNoteRecords
        .filter((row) => row.status !== 'draft')
        .reduce((sum, row) => sum + row.amount, 0),
    };
  });
}

// BACKEND CONTRACT
// POST /admin/payments/refunds
// Body: { orderId, amount, reason, note }
// Returns: Refund
// Errors: 404 order_not_found, 422 refund_reason_required,
//         422 refund_amount_invalid, 409 refund_before_verification,
//         409 amount_exceeds_capture, 409 refund_already_raised
// Notes: THE RULE THIS ENDPOINT EXISTS TO ENFORCE. Where goods have come back,
//        the return must be VERIFIED before a refund can be raised. Weight and
//        purity are the two things a jeweller disputes, and refunding before
//        the assay means refunding on a claim rather than on a fact.
//        A cancellation before dispatch has no goods to verify, so it is exempt.
//        The refund cannot exceed what was actually captured. Refunding more
//        than was taken is not a generous gesture, it is a hole in the ledger.
export function issueRefund({ orderId, amount, reason, note = '' } = {}) {
  const order = orderById[orderId];
  if (!order) return mockError('order_not_found', 'That order no longer exists', 404);
  if (!reason) return mockError('refund_reason_required', 'Choose why this is being refunded', 422);

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return mockError('refund_amount_invalid', 'Enter an amount greater than zero', 422);
  }
  if (value > order.total) {
    return mockError(
      'amount_exceeds_capture',
      `Only ${order.total} was captured on ${orderId}`,
      409,
    );
  }
  // Checked BEFORE the duplicate guard on purpose. Both can be true at once,
  // and being told "a refund is already open" when the real blocker is that
  // nobody has weighed the returned goods sends the operator to the wrong
  // screen. The rule that protects the money is the one that speaks.
  if (order.return && !order.return.verifiedAt) {
    return mockError(
      'refund_before_verification',
      'The returned goods have not been verified yet. Nothing is refunded on a claim alone.',
      409,
    );
  }
  if (refundRecords.some((row) => row.orderId === orderId && row.status !== 'rejected')) {
    return mockError('refund_already_raised', `A refund is already open on ${orderId}`, 409);
  }

  return mockRequest(() => {
    const refund = {
      id: `REF-${pad(refundRecords.length + 1, 4)}`,
      orderId,
      jewellerId: order.jewellerId,
      jewellerName: jewellerById[order.jewellerId].businessName,
      amount: value,
      reason,
      status: 'processed',
      raisedAt: nowIso(),
      verifiedAt: order.return?.verifiedAt ?? nowIso(),
      processedAt: nowIso(),
      method: order.payment.method,
      utr: `RFD${pad(refundRecords.length + 1, 6)}${orderId.slice(4)}`,
      note: note.trim() || null,
    };
    refundRecords = [refund, ...refundRecords];
    return refund;
  });
}

// BACKEND CONTRACT
// POST /admin/payments/credit-notes
// Body: { orderId, settlementLineId, partyType: 'manufacturer'|'jeweller',
//         reason, amount, note }
// Returns: CreditNote
// Errors: 404 order_not_found, 404 settlement_line_not_found,
//         422 credit_note_reason_required, 422 credit_note_amount_invalid,
//         409 amount_exceeds_line
// Notes: a note against a manufacturer reduces the next payout; one against a
//        jeweller reduces the next invoice. Same document, opposite direction,
//        and issuing it against the wrong party moves money the wrong way.
//        It cannot exceed the settlement line it corrects. GST follows the
//        supply being corrected, at the rate that supply carried.
export function issueCreditNote({
  orderId,
  settlementLineId,
  partyType = 'manufacturer',
  reason,
  amount,
  note = '',
} = {}) {
  if (!orderById[orderId]) return mockError('order_not_found', 'That order no longer exists', 404);

  const line = settlementLineById[settlementLineId];
  if (!line) return mockError('settlement_line_not_found', 'That settlement line no longer exists', 404);
  if (!reason) return mockError('credit_note_reason_required', 'Choose why this note is being issued', 422);

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return mockError('credit_note_amount_invalid', 'Enter an amount greater than zero', 422);
  }
  if (value > line.goodsValue) {
    return mockError(
      'amount_exceeds_line',
      `That line is ${line.goodsValue}. A credit note cannot exceed what it corrects.`,
      409,
    );
  }

  return mockRequest(() => {
    const taxableValue = Math.round(value / 1.03);
    const creditNote = {
      id: `CRN-${pad(creditNoteRecords.length + 1, 4)}`,
      documentNumber: `EL/CN/2627/${pad(creditNoteRecords.length + 1, 4)}`,
      orderId,
      settlementLineId,
      partyType,
      partyId: partyType === 'manufacturer' ? line.manufacturerId : line.jewellerId,
      partyName:
        partyType === 'manufacturer'
          ? manufacturerById[line.manufacturerId].businessName
          : jewellerById[line.jewellerId].businessName,
      reason,
      amount: value,
      taxableValue,
      gstValue: value - taxableValue,
      status: 'issued',
      issuedAt: nowIso(),
      appliedAt: null,
      issuedById: actingAdmin.id,
      issuedByName: actingAdmin.name,
      note: note.trim() || null,
    };
    creditNoteRecords = [creditNote, ...creditNoteRecords];
    return creditNote;
  });
}

// ---------------------------------------------------------------------------
// Commission configuration - ADM-058
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/commission
// Returns: { config: CommissionConfig, overrides: CommissionOverride[],
//            noticeDays, effectiveFrom: ISO }
// Notes: this is SETTLEMENT-side commission - what Elanzia deducts at the nodal
//        split. It is a different thing from the listing-side bands at
//        GET /admin/pricing/charge-rules, which govern what a manufacturer may
//        quote at, and the two are deliberately not merged.
//        effectiveFrom is the earliest date a change saved now could take
//        effect: manufacturers are owed notice of a rate change.
export function getCommissionConfig() {
  return mockRequest(() => ({
    config: commissionRecord,
    overrides: commissionOverrides,
    noticeDays: COMMISSION_EFFECTIVE_NOTICE_DAYS,
    effectiveFrom: new Date(NOW_MS + COMMISSION_EFFECTIVE_NOTICE_DAYS * 24 * 3600000).toISOString(),
  }));
}

// BACKEND CONTRACT
// PUT /admin/payments/commission
// Body: CommissionConfig without the audit fields
// Returns: { config: CommissionConfig, effectiveFrom: ISO, ordersAffected: 0 }
// Errors: 422 percent_out_of_range, 422 slab_order_invalid,
//         422 category_percent_missing
// Notes: ordersAffected is ALWAYS zero, and it is returned rather than omitted
//        so the screen can say so out loud. A confirmed order's commission was
//        fixed at confirmation along with its price; changing the rate today
//        changes what is deducted from settlements confirmed on or after
//        effectiveFrom and restates nothing that has already happened. A
//        marketplace that retro-prices its own take is one manufacturers stop
//        trusting.
//        Slabs must ascend by threshold. A slab table out of order silently
//        applies the wrong discount to the largest sellers.
export function updateCommissionConfig(draft = {}) {
  const percents = [
    draft.defaultPercent,
    ...(draft.categoryRules ?? []).map((rule) => rule.percent),
  ].map(Number);

  if (percents.some((value) => !Number.isFinite(value) || value < 0 || value > 25)) {
    return mockError('percent_out_of_range', 'A commission rate sits between 0 and 25 per cent', 422);
  }
  if ((draft.categoryRules ?? []).some((rule) => rule.percent === '' || rule.percent === null)) {
    return mockError('category_percent_missing', 'Every category needs a rate', 422);
  }

  const slabs = draft.volumeSlabs ?? [];
  const ascending = slabs.every(
    (slab, index) => index === 0 || Number(slab.fromValue) > Number(slabs[index - 1].fromValue),
  );
  if (!ascending) {
    return mockError('slab_order_invalid', 'Volume slabs must ascend by threshold', 422);
  }

  return mockRequest(() => {
    commissionRecord = {
      ...commissionRecord,
      ...draft,
      updatedAt: nowIso(),
      updatedById: actingAdmin.id,
    };

    return {
      config: commissionRecord,
      effectiveFrom: new Date(NOW_MS + COMMISSION_EFFECTIVE_NOTICE_DAYS * 24 * 3600000).toISOString(),
      // Not a placeholder. See the note above.
      ordersAffected: 0,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/payments/commission/audit
// Query: { search, page, pageSize, sortBy, sortDir, filters: { manufacturerId } }
// Returns: { items: CommissionAuditRow[], total, page, pageSize, retainedValue }
// Notes: read only, and appended to rather than edited. This is the answer to
//        "why was I charged that", order by order, and a gap in it is worse
//        than no list at all. Sorted by confirmedAt descending by default.
export function getCommissionAudit(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(commissionAudit, search, ['orderId', 'manufacturerName', 'settlementLineId']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'confirmedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      retainedValue: commissionAudit.reduce((sum, row) => sum + row.commission, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Membership plans - ADM-062
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/payments/plans
// Returns: { plans: MembershipPlan[],
//            subscriptionCounts: { <planId>: number }, mrr, arr,
//            pastDueCount }
// Notes: mrr normalises annual subscriptions to a monthly figure, so the number
//        means the same thing whichever way members pay. Free plans contribute
//        nothing and are counted separately rather than as zero-value revenue.
export function listMembershipPlans() {
  return mockRequest(() => {
    const active = subscriptionRecords.filter((row) => row.status === 'active' || row.status === 'past_due');
    const mrr = active.reduce(
      (sum, row) => sum + (row.amount === null ? 0 : row.cycle === 'annual' ? row.amount / 12 : row.amount),
      0,
    );

    return {
      plans: planRecords,
      subscriptionCounts: subscriptionRecords.reduce((counts, row) => {
        counts[row.planId] = (counts[row.planId] ?? 0) + 1;
        return counts;
      }, {}),
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      pastDueCount: subscriptionRecords.filter((row) => row.status === 'past_due').length,
    };
  });
}

// BACKEND CONTRACT
// PUT /admin/payments/plans/:planId
// Body: MembershipPlan without the audit fields
// Returns: { plan: MembershipPlan, subscribersAffected, effectiveFrom: ISO }
// Errors: 404 plan_not_found, 422 plan_price_invalid, 422 plan_name_required,
//         409 live_plan_price_change
// Notes: the price of a LIVE plan cannot be changed in place. Members on it
//        agreed to that price; changing it under them is a different plan, and
//        the honest move is to retire this one and publish a new one so
//        existing subscriptions keep what they signed up to. Changing anything
//        else on a live plan - features, limits, name - is allowed.
//        subscribersAffected says how many members the change reaches, so
//        nobody edits a plan with four hundred members thinking it has four.
export function updateMembershipPlan(plan = {}) {
  const existing = planRecords.find((row) => row.id === plan.id);
  if (!existing) return mockError('plan_not_found', 'That plan no longer exists', 404);
  if (!plan.name || String(plan.name).trim().length === 0) {
    return mockError('plan_name_required', 'A plan needs a name', 422);
  }

  const monthly = Number(plan.monthlyPrice);
  const annual = Number(plan.annualPrice);
  if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(annual) || annual < 0) {
    return mockError('plan_price_invalid', 'Prices cannot be negative', 422);
  }

  const priceChanged = monthly !== existing.monthlyPrice || annual !== existing.annualPrice;
  if (existing.status === 'live' && priceChanged) {
    return mockError(
      'live_plan_price_change',
      'Members are on this price. Retire this plan and publish a new one instead of repricing it under them.',
      409,
    );
  }

  return mockRequest(() => {
    const updated = { ...existing, ...plan, monthlyPrice: monthly, annualPrice: annual, updatedAt: nowIso() };
    planRecords = planRecords.map((row) => (row.id === plan.id ? updated : row));

    return {
      plan: updated,
      subscribersAffected: subscriptionRecords.filter((row) => row.planId === plan.id).length,
      effectiveFrom: nowIso(),
    };
  });
}

// BACKEND CONTRACT
// GET /admin/payments/plans/subscriptions
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { planId, status, memberType } }
// Returns: { items: PlanSubscription[], total, page, pageSize }
// Notes: sorted by renewsAt ascending by default - the next renewal is the one
//        worth looking at, and a past_due subscription that renews tomorrow is
//        the row somebody has to act on today.
export function listPlanSubscriptions(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(subscriptionRecords, search, ['id', 'memberName', 'planName']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'renewsAt', sortBy ? sortDir : 'asc');
    return paginate(rows, { page, pageSize });
  });
}

// Re-exported so a screen can build its filter options without importing a
// fixture. These are platform vocabulary, not data.
export { BANK_ACCOUNTS };
