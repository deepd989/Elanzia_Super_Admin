// Mock API for reporting, exports, privacy and platform settings - ADM-092 to
// ADM-099.
//
// ENTITY SHAPES referenced by the contracts below:
//
// HeadlineMetrics: { gmv, gmvChangePercent, orders, ordersChangePercent,
//                    activeManufacturers, manufacturerChangePercent,
//                    activeJewellers, jewellerChangePercent, avgOrderValue,
//                    enquiryToOrderPercent, conversionChangePercent,
//                    liveListings }
//   Change percentages compare the selected period against the window of the
//   same length immediately before it. A period with no prior trading returns
//   null rather than an infinite rise.
//
// SeriesPoint: { month: 'YYYY-MM', label, gmv, orders, enquiries,
//                convertedEnquiries, conversionPercent, activeManufacturers,
//                activeJewellers, liveListings }
//
// FunnelStage: { id: 'enquiries'|'quoted'|'accepted'|'ordered', count,
//                conversionFromPreviousPercent, conversionFromTopPercent }
//
// AttentionItem: { id, kind: 'settlement_pending'|'payout_failed'
//                  |'dpdp_breach'|'export_failed', count, amount: number|null,
//                  path }
//
// SavedReport: { id, name, datasetId, period, ownerId, ownerName, lastRunAt,
//                path }
//
// FinancialPeriodRow: { id, month, label, gmv, orders, commission,
//                       gstOnCommission, payoutsReleased, payoutsFailed,
//                       refunds, heldInNodal }
//   heldInNodal is the payment aggregator's balance, never Elanzia's. Only
//   commission is revenue; everything else on the row is money in transit.
//
// ManufacturerPerformance: { manufacturerId, businessName, city, speciality,
//     liveListings, orders, completedOrders, gmv, enquiries,
//     responseRatePercent, medianResponseHours: number|null,
//     fulfilmentRatePercent, onTimeDispatchPercent, disputeRatePercent,
//     returnRatePercent, rating, memberStatus,
//     badgeState: 'verified'|'at_risk'|'not_eligible'|'suspended',
//     badgeBlockers: string[], gmvBand: 'high'|'mid'|'low' }
//   badgeState and badgeBlockers are computed server side. The buyer
//   microsite, the manufacturer profile and this report must never disagree
//   about who holds a verified badge.
//
// ExportDataset: { id, module, permission, columns: string[], supportsPeriod,
//                  maxRows, containsPersonalData }
//
// ExportJob: { id, datasetId, requestedById, requestedByName, requestedAt,
//              period: string|null, filters, format: 'csv'|'xlsx',
//              status: 'queued'|'running'|'succeeded'|'failed'|'expired'
//                      |'cancelled',
//              rowCount: number|null, fileSizeBytes: number|null, startedAt,
//              completedAt, expiresAt, failureCode, failureReason,
//              containsPersonalData }
//   An expired job's file is gone; the row survives so the audit trail can
//   still show who pulled that data and when.
//
// DataRequest: { id, subjectType: 'jeweller'|'manufacturer'|'admin',
//     subjectId, subjectName,
//     type: 'access'|'correction'|'erasure'|'nomination'|'grievance',
//     channel: 'portal'|'email'|'support_desk', raisedAt, dueAt, respondedAt,
//     status: 'received'|'identity_pending'|'in_progress'|'fulfilled'
//             |'rejected'|'withdrawn',
//     slaState: 'on_track'|'due_soon'|'breached'|'closed',
//     identityVerified: boolean, outcome, rejectionReason, handledById,
//     handledByName, note, retainedRecords: RetainedRecord[], daysRemaining }
//
// RetainedRecord: { kind, count, reason }
//   What an erasure cannot take away, and why. A refusal a data principal
//   cannot see the shape of is not an answer.
//
// ConsentRecord: { id, subjectType, subjectId, subjectName,
//     purpose: 'marketing_email'|'whatsapp_updates'|'catalogue_analytics'
//              |'partner_sharing',
//     state: 'granted'|'withdrawn'|'never_given', capturedAt, withdrawnAt,
//     source: 'signup'|'settings'|'support_desk'|'broadcast_unsubscribe',
//     policyVersion }
//
// AuditEntry: { id, at, actorId, actorName, actorRoleId, actorRoleName,
//     module, action, severity: 'info'|'notable'|'sensitive', entityType,
//     entityId, entityLabel, entityPath, summary, ipAddress, userAgent,
//     onBehalfOfId, onBehalfOfName, requestId }
//
// AuditEntryDetail: AuditEntry & { changes: AuditChange[],
//                                  relatedEntryIds: string[] }
// AuditChange: { field, before: string|null, after: string|null }
//
// SettingGroup: { id, settings: Setting[] }
// Setting: { key, kind: 'text'|'number'|'toggle'|'select', unit, options,
//            min, max, sensitive, restartRequired, hasHelp }
//   hasHelp says whether the client has help copy for this field. It travels
//   with the setting so a screen never has to probe its own string map.
//   Groups and values are returned separately because the shape of the form
//   belongs to the server. Adding a setting is a backend change, not a screen
//   change.

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import { adminUsers, orders, roleById, settlementLines } from '@/data/core';
import {
  AUDIT_MODULES,
  AUDIT_RETENTION_MONTHS,
  CONSENT_PURPOSES,
  DATA_REQUEST_TYPES,
  DPDP_RESPONSE_DAYS,
  EXPORT_FORMATS,
  EXPORT_RETENTION_DAYS,
  REPORTING_NOW,
  REPORT_PERIODS,
  VERIFIED_BADGE_THRESHOLDS,
  auditEntries,
  auditEntryById,
  categoryPerformance,
  cityPerformance,
  consentRecords,
  dataRequests,
  enquiryFunnel,
  exportDatasetById,
  exportDatasets,
  exportJobs,
  financialPeriods,
  financialSummary,
  gstSummary,
  listingCounts,
  manufacturerPerformance,
  marketplaceSeries,
  reportingMonths,
  savedReports,
  settingGroups,
  settingValues,
  settingsMeta,
  settlementAgeing,
  slaStateOf,
} from '@/data/reportingFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let exportJobRecords = exportJobs.map((row) => ({ ...row }));
let dataRequestRecords = dataRequests.map((row) => ({ ...row }));
let auditRecords = auditEntries.map((row) => ({ ...row }));
let auditDetailById = { ...auditEntryById };
let settingRecord = { ...settingValues };
let settingMetaRecord = { ...settingsMeta };

const NOW_MS = Date.parse(REPORTING_NOW);
const DAY_MS = 24 * 3600000;

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the audit trail names a real person, and it goes away
// with the mock layer. Do not build a route for it.
let actingAdmin = { id: adminUsers[0].id, name: adminUsers[0].name, roleId: adminUsers[0].roleId };
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
const round1 = (value) => Math.round(value * 10) / 10;

function facetOf(rows, valueKey, labelKey) {
  const seen = new Map();
  rows.forEach((row) => {
    if (row[valueKey] && !seen.has(row[valueKey])) seen.set(row[valueKey], row[labelKey]);
  });
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label: label ?? value }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
}

const PERIOD_DAYS = {
  last_7_days: 7,
  last_30_days: 30,
  last_90_days: 90,
  last_12_months: 365,
};

// The Indian financial year runs April to March, so a year-to-date report that
// started in January would answer a question no accountant asked.
function rangeFor(period) {
  if (period === 'financial_ytd') {
    const anchor = new Date(NOW_MS);
    const year = anchor.getUTCMonth() >= 3 ? anchor.getUTCFullYear() : anchor.getUTCFullYear() - 1;
    return { fromMs: Date.UTC(year, 3, 1), toMs: NOW_MS };
  }
  const days = PERIOD_DAYS[period] ?? PERIOD_DAYS.last_90_days;
  return { fromMs: NOW_MS - days * DAY_MS, toMs: NOW_MS };
}

// The window of the same length immediately before the one selected. Every
// change percentage on every tile compares against this and nothing else.
function previousRangeFor(period) {
  const { fromMs, toMs } = rangeFor(period);
  const span = toMs - fromMs;
  return { fromMs: fromMs - span, toMs: fromMs };
}

function monthsInRange({ fromMs, toMs }) {
  return reportingMonths
    .map(({ month }) => month)
    .filter((month) => {
      const startMs = Date.parse(`${month}-01T00:00:00.000Z`);
      return startMs >= fromMs - 31 * DAY_MS && startMs <= toMs;
    });
}

// A rise from nothing is not a percentage. Returning null lets the tile say so
// rather than printing an infinity at an operator.
function changePercent(current, previous) {
  if (!previous) return null;
  return round1(((current - previous) / previous) * 100);
}

const confirmedOrders = orders.filter((order) => Boolean(order.confirmedAt));

function ordersIn({ fromMs, toMs }) {
  return confirmedOrders.filter((order) => {
    const at = Date.parse(order.confirmedAt);
    return at >= fromMs && at <= toMs;
  });
}

function headlineFor(period) {
  const current = ordersIn(rangeFor(period));
  const previous = ordersIn(previousRangeFor(period));
  const gmv = current.reduce((sum, order) => sum + order.total, 0);
  const previousGmv = previous.reduce((sum, order) => sum + order.total, 0);

  const months = monthsInRange(rangeFor(period));
  const series = marketplaceSeries.filter((point) => months.includes(point.month));
  const enquiryCount = series.reduce((sum, point) => sum + point.enquiries, 0);
  const convertedCount = series.reduce((sum, point) => sum + point.convertedEnquiries, 0);

  return {
    gmv,
    gmvChangePercent: changePercent(gmv, previousGmv),
    orders: current.length,
    ordersChangePercent: changePercent(current.length, previous.length),
    avgOrderValue: current.length === 0 ? 0 : Math.round(gmv / current.length),
    activeManufacturers: new Set(current.flatMap((order) => order.manufacturerIds)).size,
    manufacturerChangePercent: changePercent(
      new Set(current.flatMap((order) => order.manufacturerIds)).size,
      new Set(previous.flatMap((order) => order.manufacturerIds)).size,
    ),
    activeJewellers: new Set(current.map((order) => order.jewellerId)).size,
    jewellerChangePercent: changePercent(
      new Set(current.map((order) => order.jewellerId)).size,
      new Set(previous.map((order) => order.jewellerId)).size,
    ),
    enquiryToOrderPercent: enquiryCount === 0 ? 0 : round1((convertedCount / enquiryCount) * 100),
    liveListings: listingCounts.live,
  };
}

// ---------------------------------------------------------------------------
// Reports - ADM-092, ADM-093, ADM-094, ADM-098
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/reports/overview
// Query: { period: 'last_7_days'|'last_30_days'|'last_90_days'
//                  |'last_12_months'|'financial_ytd' }
// Returns: { period, headline: HeadlineMetrics, gmvSeries: SeriesPoint[],
//            funnel: FunnelStage[], attention: AttentionItem[],
//            savedReports: SavedReport[], refreshedAt: ISO }
// Notes: GMV counts confirmed orders only, valued at the price fixed at
//        confirmation. A confirmed order's price is permanent, so a closed
//        month never restates however far the metal rate moves afterwards.
//        This is the same predicate ADM-010 uses - if the two disagree about
//        a month, one of them has a bug.
export function getReportsOverview(query = {}) {
  const period = REPORT_PERIODS.includes(query.period) ? query.period : 'last_90_days';
  const months = monthsInRange(rangeFor(period));

  return mockRequest(() => {
    const breachedRequests = dataRequestRecords.filter(
      (row) => slaStateOf(row) === 'breached',
    ).length;
    const pendingLines = settlementLines.filter((line) => line.status !== 'settled');
    const failedExports = exportJobRecords.filter((job) => job.status === 'failed').length;

    return {
      period,
      headline: headlineFor(period),
      gmvSeries: marketplaceSeries
        .filter((point) => months.includes(point.month))
        .map((point) => ({ ...point })),
      funnel: enquiryFunnel.map((stage) => ({ ...stage })),

      // What is waiting on somebody, ordered by how badly. A statutory breach
      // outranks a failed export because only one of them has a deadline
      // somebody else set.
      attention: [
        {
          id: 'dpdp_breach',
          kind: 'dpdp_breach',
          count: breachedRequests,
          amount: null,
          path: '/platform/privacy',
        },
        {
          id: 'payout_failed',
          kind: 'payout_failed',
          count: financialPeriods.filter((row) => row.payoutsFailed > 0).length,
          amount: financialSummary.payoutsFailed,
          path: '/reports/financial',
        },
        {
          id: 'settlement_pending',
          kind: 'settlement_pending',
          count: pendingLines.length,
          amount: pendingLines.reduce((sum, line) => sum + line.payout, 0),
          path: '/reports/financial',
        },
        { id: 'export_failed', kind: 'export_failed', count: failedExports, amount: null, path: '/platform/exports' },
      ],

      savedReports: savedReports.map((report) => ({ ...report })),
      refreshedAt: nowIso(),
    };
  });
}

// BACKEND CONTRACT
// GET /admin/reports/marketplace
// Query: { period, filters: { city, category } }
// Returns: { period, metrics: HeadlineMetrics, gmvByMonth: SeriesPoint[],
//            listingCounts: { live, draft, pendingReview, archived,
//                             outOfStock, private },
//            topCategories: CategoryRow[], cityBreakdown: CityRow[],
//            facets: { city: Option[], category: Option[] } }
// CategoryRow: { category, listings, gmv, enquiries, orders }
// CityRow: { city, manufacturers, jewellers, gmv }
// Notes: private listings are counted in listingCounts and never broken out by
//        manufacturer or by piece. A private range must not become visible
//        through a report that nobody thought of as a public surface.
//        "Active" means one confirmed order in the period.
export function getMarketplaceMetrics(query = {}) {
  const period = REPORT_PERIODS.includes(query.period) ? query.period : 'last_12_months';
  const { city, category } = query.filters ?? {};
  const months = monthsInRange(rangeFor(period));

  return mockRequest(() => ({
    period,
    metrics: headlineFor(period),
    gmvByMonth: marketplaceSeries
      .filter((point) => months.includes(point.month))
      .map((point) => ({ ...point })),
    listingCounts: { ...listingCounts },
    topCategories: categoryPerformance
      .filter((row) => !category || row.category === category)
      .map((row) => ({ ...row })),
    cityBreakdown: cityPerformance
      .filter((row) => !city || row.city === city)
      .map((row) => ({ ...row })),
    facets: {
      city: cityPerformance.map((row) => ({ value: row.city, label: row.city })),
      category: categoryPerformance.map((row) => ({ value: row.category, label: row.category })),
    },
  }));
}

// BACKEND CONTRACT
// GET /admin/reports/financial
// Permission: reports.financial.view
// Query: { period, filters: { basis: 'accrual'|'cash' } }
// Returns: { period, basis, summary, periods: FinancialPeriodRow[],
//            settlementAgeing: AgeingBucket[], gstSummary }
// summary: { gmv, orders, commissionEarned, effectiveCommissionPercent,
//            gstOnCommission, payoutsReleased, payoutsPending, payoutsFailed,
//            refunds, heldInNodal }
// AgeingBucket: { bucket: 'not_due'|'0-3'|'4-7'|'8-14'|'15+', label, count,
//                 amount }
// gstSummary: { invoiceCount, taxableValue, cgst, sgst, igst, total }
// Notes: payoutsPending and heldInNodal are balances as they stand now, not
//        period totals - money does not sit in an account "during March".
//        Every other figure is scoped to the period.
//        Commission is the only line here that is Elanzia revenue. Settlement
//        money sits in the payment aggregator's nodal account and splits to
//        the manufacturer net of commission, so heldInNodal is never a
//        platform balance.
//        Refunds appear only after return verification, so a raised but
//        unverified return contributes nothing to the refund column.
//        Ageing runs off dueAt, not the order date: a payout is late because
//        the return window closed and the money did not move.
export function getFinancialReport(query = {}) {
  const period = REPORT_PERIODS.includes(query.period) ? query.period : 'financial_ytd';
  const basis = query.filters?.basis === 'cash' ? 'cash' : 'accrual';
  const months = monthsInRange(rangeFor(period));
  const rows = financialPeriods.filter((row) => months.includes(row.month));

  return mockRequest(() => {
    const gmv = rows.reduce((sum, row) => sum + row.gmv, 0);
    const commission = rows.reduce((sum, row) => sum + row.commission, 0);

    return {
      period,
      basis,
      summary: {
        ...financialSummary,
        gmv,
        orders: rows.reduce((sum, row) => sum + row.orders, 0),
        commissionEarned: commission,
        effectiveCommissionPercent: gmv === 0 ? 0 : Number(((commission / gmv) * 100).toFixed(2)),
        gstOnCommission: rows.reduce((sum, row) => sum + row.gstOnCommission, 0),
        payoutsReleased: rows.reduce((sum, row) => sum + row.payoutsReleased, 0),
        payoutsFailed: rows.reduce((sum, row) => sum + row.payoutsFailed, 0),
        refunds: rows.reduce((sum, row) => sum + row.refunds, 0),
      },
      periods: rows.map((row) => ({ ...row })),
      settlementAgeing: settlementAgeing.map((row) => ({ ...row })),
      gstSummary: { ...gstSummary },
    };
  });
}

// A band rather than a raw threshold, so the filter means the same thing to
// everyone reading the report.
function bandOf(row) {
  if (row.gmv >= 10000000) return 'high';
  if (row.gmv >= 2500000) return 'mid';
  return 'low';
}

// BACKEND CONTRACT
// GET /admin/reports/manufacturer-performance
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { city, badgeState, gmvBand } }
// Returns: { items: ManufacturerPerformance[], total, page, pageSize,
//            facets: { city: Option[], badgeState: Option[],
//                      gmvBand: Option[] },
//            thresholds: VERIFIED_BADGE_THRESHOLDS }
// Notes: sorted by gmv descending by default. Search matches business name and
//        city.
//        badgeState is computed here and never in a screen. The thresholds
//        travel with the response so the report can state the rule it applied
//        rather than hard-coding a number that later moves.
//        Dispute rate counts only disputes upheld against the manufacturer, on
//        orders that reached an end state. A raised dispute is an allegation,
//        and a badge that punishes allegations rewards the loudest buyer
//        rather than the best supplier.
export function listManufacturerPerformance(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    const decorated = manufacturerPerformance.map((row) => ({ ...row, gmvBand: bandOf(row) }));
    let rows = applySearch(decorated, search, ['businessName', 'city']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'gmv', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        city: facetOf(decorated, 'city', 'city'),
        badgeState: facetOf(decorated, 'badgeState', 'badgeState'),
        gmvBand: facetOf(decorated, 'gmvBand', 'gmvBand'),
      },
      thresholds: { ...VERIFIED_BADGE_THRESHOLDS },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/reports/manufacturer-performance/summary
// Returns: { verified, atRisk, notEligible, suspended, medianResponseHours,
//            medianFulfilmentPercent }
// Notes: medians rather than means. One workshop that never answers drags a
//        mean far enough to hide that everybody else is fine.
export function getManufacturerPerformanceSummary() {
  return mockRequest(() => {
    const countOf = (state) =>
      manufacturerPerformance.filter((row) => row.badgeState === state).length;
    const medianOf = (values) => {
      const sorted = values.filter((value) => value !== null).sort((left, right) => left - right);
      if (sorted.length === 0) return null;
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? round1((sorted[middle - 1] + sorted[middle]) / 2)
        : round1(sorted[middle]);
    };

    return {
      verified: countOf('verified'),
      atRisk: countOf('at_risk'),
      notEligible: countOf('not_eligible'),
      suspended: countOf('suspended'),
      medianResponseHours: medianOf(manufacturerPerformance.map((row) => row.medianResponseHours)),
      medianFulfilmentPercent: medianOf(
        manufacturerPerformance.map((row) => row.fulfilmentRatePercent),
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Export centre - ADM-095
// ---------------------------------------------------------------------------

function decorateJob(job) {
  const dataset = exportDatasetById[job.datasetId];
  return {
    ...job,
    datasetLabel: dataset?.id ?? job.datasetId,
    datasetModule: dataset?.module ?? null,
  };
}

// BACKEND CONTRACT
// GET /admin/exports/datasets
// Returns: { items: ExportDataset[] }
// Notes: the real endpoint filters this to the datasets the caller's
//        permissions actually allow, so an unpermitted dataset is absent
//        rather than present and disabled. A report must not be a side door
//        into data the portal already refused to show.
export function getExportDatasets() {
  return mockRequest(() => ({ items: exportDatasets.map((dataset) => ({ ...dataset })) }));
}

// BACKEND CONTRACT
// GET /admin/exports
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { datasetId, status, requestedById } }
// Returns: { items: ExportJob[], total, page, pageSize,
//            facets: { datasetId: Option[], status: Option[],
//                      requestedById: Option[] },
//            retentionDays: number }
// Notes: sorted by requestedAt descending by default. Search matches job id
//        and requester name.
//        A succeeded job expires EXPORT_RETENTION_DAYS after completion.
//        Expired is a distinct status from failed because the fix differs:
//        re-run it, versus find out what broke.
export function listExportJobs(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    const decorated = exportJobRecords.map(decorateJob);
    let rows = applySearch(decorated, search, ['id', 'requestedByName', 'datasetId']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'requestedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        datasetId: facetOf(decorated, 'datasetId', 'datasetId'),
        status: facetOf(decorated, 'status', 'status'),
        requestedById: facetOf(decorated, 'requestedById', 'requestedByName'),
      },
      retentionDays: EXPORT_RETENTION_DAYS,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/exports
// Body: { datasetId, period: string|null, filters, format: 'csv'|'xlsx' }
// Returns: ExportJob                                      (status 'queued')
// Errors: 404 dataset_not_found, 422 period_required, 422 format_not_supported,
//         403 dataset_not_permitted, 429 export_limit_reached
// Notes: the job is queued, not built. The real worker writes the file, then
//        the row moves to succeeded with a rowCount and an expiry.
//        A dataset that supports a period requires one - an unbounded pull of
//        the order book is how an export times out at three in the morning.
export function requestExport(payload = {}) {
  const dataset = exportDatasetById[payload.datasetId];
  if (!dataset) return mockError('dataset_not_found', 'That dataset does not exist.', 404);
  if (dataset.supportsPeriod && !payload.period) {
    return mockError('period_required', 'Choose a period before requesting this export.', 422);
  }
  if (!EXPORT_FORMATS.includes(payload.format)) {
    return mockError('format_not_supported', 'That file format is not available.', 422);
  }

  const queuedToday = exportJobRecords.filter(
    (job) => job.requestedById === actingAdmin.id && NOW_MS - Date.parse(job.requestedAt) < DAY_MS,
  ).length;
  if (queuedToday >= 20) {
    return mockError('export_limit_reached', 'You have reached the daily export limit.', 429);
  }

  return mockRequest(() => {
    const job = {
      id: `EXP-${pad(exportJobRecords.length + 1, 4)}`,
      datasetId: dataset.id,
      requestedById: actingAdmin.id,
      requestedByName: actingAdmin.name,
      requestedAt: nowIso(),
      period: dataset.supportsPeriod ? payload.period : null,
      filters: payload.filters ?? {},
      format: payload.format,
      status: 'queued',
      rowCount: null,
      fileSizeBytes: null,
      startedAt: null,
      completedAt: null,
      expiresAt: null,
      failureCode: null,
      failureReason: null,
      containsPersonalData: dataset.containsPersonalData,
    };

    exportJobRecords = [job, ...exportJobRecords];
    return decorateJob(job);
  });
}

// BACKEND CONTRACT
// POST /admin/exports/:jobId/cancel
// Returns: ExportJob
// Errors: 404 export_not_found, 409 export_already_complete
// Notes: cancelling a finished job would hide a pull that already happened, so
//        only a queued or running job can be stopped.
export function cancelExportJob(jobId) {
  const job = exportJobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('export_not_found', 'That export job does not exist.', 404);
  if (!['queued', 'running'].includes(job.status)) {
    return mockError('export_already_complete', 'That export has already finished.', 409);
  }

  return mockRequest(() => {
    job.status = 'cancelled';
    job.failureCode = 'cancelled_by_operator';
    job.failureReason = `Cancelled by ${actingAdmin.name}.`;
    job.completedAt = nowIso();
    return decorateJob(job);
  });
}

// BACKEND CONTRACT
// POST /admin/exports/:jobId/retry
// Returns: ExportJob                                      (status 'queued')
// Errors: 404 export_not_found, 409 export_not_retryable
// Notes: a failed, expired or cancelled job can be re-run and a succeeded one
//        cannot - the first three have no file, the last still has one.
export function retryExportJob(jobId) {
  const job = exportJobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('export_not_found', 'That export job does not exist.', 404);
  if (!['failed', 'expired', 'cancelled'].includes(job.status)) {
    return mockError('export_not_retryable', 'Only a job with no file can be re-run.', 409);
  }

  return mockRequest(() => {
    job.status = 'queued';
    job.requestedAt = nowIso();
    job.requestedById = actingAdmin.id;
    job.requestedByName = actingAdmin.name;
    job.startedAt = null;
    job.completedAt = null;
    job.expiresAt = null;
    job.rowCount = null;
    job.fileSizeBytes = null;
    job.failureCode = null;
    job.failureReason = null;
    return decorateJob(job);
  });
}

// BACKEND CONTRACT
// GET /admin/exports/:jobId/download
// Returns: { url, expiresAt }
// Errors: 404 export_not_found, 409 export_not_ready, 410 export_expired
// Notes: the real endpoint returns a short-lived signed URL and writes an
//        audit entry naming who downloaded which personal-data export, which
//        is why the download is an endpoint at all rather than a static link.
//        The mock returns a placeholder and produces no file.
export function getExportDownloadUrl(jobId) {
  const job = exportJobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('export_not_found', 'That export job does not exist.', 404);
  if (job.status === 'expired') {
    return mockError('export_expired', 'That export has lapsed and must be re-run.', 410);
  }
  if (job.status !== 'succeeded') {
    return mockError('export_not_ready', 'That export has not finished building.', 409);
  }

  return mockRequest(() => {
    appendAuditEntry({
      module: 'platform',
      action: 'export.downloaded',
      severity: 'sensitive',
      entityType: 'export_job',
      entityId: job.id,
      entityLabel: job.id,
      entityPath: '/platform/exports',
      changes: [{ field: 'reason', before: null, after: 'Operator download' }],
    });

    return {
      url: `https://exports.elanzia.example/${job.id}.${job.format}`,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Consent and data requests - ADM-096
// ---------------------------------------------------------------------------

// The statutory clock is answered at read time. A request that ran out of time
// at midnight reads as breached the next morning without anything having had
// to run, because the deadline belongs to the law and not to the portal.
function decorateRequest(request) {
  const slaState = slaStateOf(request);
  return {
    ...request,
    slaState,
    daysRemaining:
      slaState === 'closed' ? null : Math.floor((Date.parse(request.dueAt) - NOW_MS) / DAY_MS),
  };
}

// BACKEND CONTRACT
// GET /admin/privacy/data-requests
// Permission: platform.privacy.view
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { type, status, subjectType, slaState } }
// Returns: { items: DataRequest[], total, page, pageSize,
//            facets: { type: Option[], status: Option[],
//                      subjectType: Option[], slaState: Option[] },
//            responseDays: number }
// Notes: sorted by dueAt ascending by default. This queue is worked by
//        deadline, not by arrival, so the oldest promise comes first.
//        dueAt is raisedAt plus DPDP_RESPONSE_DAYS, counted from when the
//        request landed rather than from when identity was proved - a
//        fiduciary must not be able to extend its own statutory clock by being
//        slow to ask for a document.
export function listDataRequests(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    const decorated = dataRequestRecords.map(decorateRequest);
    let rows = applySearch(decorated, search, ['id', 'subjectName', 'subjectId']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'dueAt', sortBy ? sortDir : 'asc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        type: DATA_REQUEST_TYPES.map((value) => ({ value, label: value })),
        status: facetOf(decorated, 'status', 'status'),
        subjectType: facetOf(decorated, 'subjectType', 'subjectType'),
        slaState: facetOf(decorated, 'slaState', 'slaState'),
      },
      responseDays: DPDP_RESPONSE_DAYS,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/privacy/data-requests/summary
// Permission: platform.privacy.view
// Returns: { open, dueSoon, breached, fulfilledLast30Days,
//            medianDaysToRespond: number|null }
// Notes: breached is the number that matters and it is never rolled into
//        "open" - a count that hides the ones already past their deadline is
//        the reason a deadline gets missed twice.
export function getDataRequestSummary() {
  return mockRequest(() => {
    const decorated = dataRequestRecords.map(decorateRequest);
    const responded = decorated.filter((row) => row.respondedAt);
    const turnarounds = responded.map((row) =>
      Math.max(0, Math.round((Date.parse(row.respondedAt) - Date.parse(row.raisedAt)) / DAY_MS)),
    );
    const sorted = [...turnarounds].sort((left, right) => left - right);

    return {
      open: decorated.filter((row) => row.slaState !== 'closed').length,
      dueSoon: decorated.filter((row) => row.slaState === 'due_soon').length,
      breached: decorated.filter((row) => row.slaState === 'breached').length,
      fulfilledLast30Days: decorated.filter(
        (row) =>
          row.status === 'fulfilled' && NOW_MS - Date.parse(row.respondedAt) <= 30 * DAY_MS,
      ).length,
      medianDaysToRespond: sorted.length === 0 ? null : sorted[Math.floor(sorted.length / 2)],
    };
  });
}

// BACKEND CONTRACT
// POST /admin/privacy/data-requests/:requestId/decision
// Permission: platform.privacy.respond
// Body: { outcome: 'fulfil'|'reject'|'request_identity', note,
//         identityVerified: boolean }
// Returns: DataRequest
// Errors: 404 request_not_found, 409 request_already_closed,
//         422 decision_note_required, 422 identity_not_verified
// Notes: identity must be proved before fulfil or reject. Handing a member's
//        trading history to whoever asked for it cannot be undone, and it is
//        the failure this queue exists to prevent.
//        A rejection without a written reason produces a data principal who
//        cannot tell what to do next, so the note is required for everything
//        except a clean fulfil.
//        Fulfilling an erasure does not delete a confirmed order, a tax
//        invoice or a settlement record. Those are held under statutory
//        obligation and come back on the response as retainedRecords so the
//        refusal can be explained.
export function recordDataRequestDecision(payload = {}) {
  const request = dataRequestRecords.find((row) => row.id === payload.requestId);
  if (!request) return mockError('request_not_found', 'That data request does not exist.', 404);
  if (['fulfilled', 'rejected', 'withdrawn'].includes(request.status)) {
    return mockError('request_already_closed', 'That request has already been answered.', 409);
  }

  const note = (payload.note ?? '').trim();
  if (payload.outcome !== 'fulfil' && note.length === 0) {
    return mockError('decision_note_required', 'Write a reason before recording this decision.', 422);
  }
  if (['fulfil', 'reject'].includes(payload.outcome) && !payload.identityVerified) {
    return mockError(
      'identity_not_verified',
      'Verify the requester is who they say they are before answering.',
      422,
    );
  }

  return mockRequest(() => {
    request.identityVerified = Boolean(payload.identityVerified);
    request.handledById = actingAdmin.id;
    request.handledByName = actingAdmin.name;
    request.note = note || request.note;

    if (payload.outcome === 'request_identity') {
      request.status = 'identity_pending';
    } else {
      request.status = payload.outcome === 'fulfil' ? 'fulfilled' : 'rejected';
      request.outcome = payload.outcome === 'fulfil' ? 'fulfilled' : 'rejected';
      request.rejectionReason = payload.outcome === 'reject' ? note : null;
      request.respondedAt = nowIso();
    }

    appendAuditEntry({
      module: 'platform',
      action: `data_request.${payload.outcome}`,
      severity: 'sensitive',
      entityType: 'data_request',
      entityId: request.id,
      entityLabel: `${request.type} for ${request.subjectName}`,
      entityPath: '/platform/privacy',
      changes: [{ field: 'status', before: 'in_progress', after: request.status }],
    });

    return decorateRequest(request);
  });
}

// BACKEND CONTRACT
// GET /admin/privacy/consents
// Permission: platform.privacy.view
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { purpose, state, subjectType } }
// Returns: { items: ConsentRecord[], total, page, pageSize,
//            facets: { purpose: Option[], state: Option[],
//                      subjectType: Option[] } }
// Notes: sorted by capturedAt descending by default.
//        There is no delete endpoint on this collection and there must never
//        be one. Withdrawn consent is retained, because proving when a member
//        withdrew is the entire point of keeping a ledger.
//        ADM-085 must exclude 'withdrawn' and 'never_given' from every
//        broadcast audience.
export function listConsentRecords(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(consentRecords, search, ['subjectName', 'subjectId']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'capturedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        purpose: CONSENT_PURPOSES.map((value) => ({ value, label: value })),
        state: facetOf(consentRecords, 'state', 'state'),
        subjectType: facetOf(consentRecords, 'subjectType', 'subjectType'),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Audit log - ADM-099
// ---------------------------------------------------------------------------

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The audit log is written by the actions themselves, never by a caller. It is
// here so that a settings change or an export download in this prototype
// leaves the same trail it will leave in production, and so ADM-097 and
// ADM-099 read the same record.
function appendAuditEntry({ changes = [], ...entry }) {
  const actor = adminUsers.find((user) => user.id === actingAdmin.id) ?? adminUsers[0];
  const row = {
    id: `AUD-${pad(20000 + auditRecords.length, 5)}`,
    at: nowIso(),
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.roleId,
    actorRoleName: roleById[actor.roleId]?.name ?? actor.roleId,
    summary: `${actor.name} performed ${entry.action} on ${entry.entityLabel}`,
    ipAddress: '103.21.8.2',
    userAgent: 'Chrome 141 on macOS',
    onBehalfOfId: null,
    onBehalfOfName: null,
    requestId: `REQ-${pad(900000 + auditRecords.length, 6)}`,
    ...entry,
  };

  auditRecords = [row, ...auditRecords];
  auditDetailById = { ...auditDetailById, [row.id]: { ...row, changes } };
  return row;
}

// BACKEND CONTRACT
// GET /admin/audit
// Permission: platform.audit.view
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { module, action, actorId, severity, from, to } }
// Returns: { items: AuditEntry[], total, page, pageSize,
//            facets: { module: Option[], action: Option[], actorId: Option[],
//                      severity: Option[] },
//            retentionMonths: number }
// Notes: append only. There is no create, update or delete endpoint on this
//        collection and there must never be one - a log an admin can edit
//        proves nothing about what an admin did.
//        Sorted by at descending. from and to are inclusive ISO dates and are
//        applied before pagination.
//        severity 'sensitive' marks the entries that moved money, changed who
//        can do what, or reached member data. onBehalfOfName is populated for
//        actions taken inside an ADM-008 impersonation session, which is the
//        first thing a reviewer filters to.
export function listAuditEntries(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;
  const { from, to, ...rest } = filters;

  return mockRequest(() => {
    let rows = applySearch(auditRecords, search, [
      'id',
      'actorName',
      'entityId',
      'entityLabel',
      'summary',
    ]);
    if (from) rows = rows.filter((row) => row.at >= from);
    if (to) rows = rows.filter((row) => row.at <= `${to}T23:59:59.999Z`);
    rows = applyFilters(rows, rest);
    rows = applySort(rows, sortBy ?? 'at', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        module: AUDIT_MODULES.map((value) => ({ value, label: value })),
        action: facetOf(auditRecords, 'action', 'action'),
        actorId: facetOf(auditRecords, 'actorId', 'actorName'),
        severity: facetOf(auditRecords, 'severity', 'severity'),
      },
      retentionMonths: AUDIT_RETENTION_MONTHS,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/audit/:entryId
// Permission: platform.audit.view
// Returns: AuditEntryDetail
// Errors: 404 audit_entry_not_found
// Notes: the change diff lives here rather than on the list, so a twenty field
//        before and after never rides along in a queue payload.
//        relatedEntryIds are other entries from the same request, which is how
//        a reviewer sees that one click changed four things.
export function getAuditEntry(entryId) {
  const entry = auditDetailById[entryId];
  if (!entry) return mockError('audit_entry_not_found', 'That audit entry does not exist.', 404);

  return mockRequest(() => ({
    ...entry,
    changes: entry.changes.map((change) => ({ ...change })),
    relatedEntryIds: auditRecords
      .filter((row) => row.requestId === entry.requestId && row.id !== entry.id)
      .map((row) => row.id),
  }));
}

// ---------------------------------------------------------------------------
// System settings - ADM-097
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/settings
// Permission: platform.settings.view
// Returns: { groups: SettingGroup[], values: Record<string, string|number|boolean>,
//            updatedAt, updatedById, updatedByName }
// Notes: the shape of the form belongs to the server. Adding a setting is a
//        backend change, not a screen change, so ADM-097 renders whatever
//        comes back rather than holding its own field list.
export function getSystemSettings() {
  return mockRequest(() => ({
    groups: settingGroups.map((group) => ({
      ...group,
      settings: group.settings.map((setting) => ({ ...setting })),
    })),
    values: { ...settingRecord },
    ...settingMetaRecord,
  }));
}

const settingByKey = Object.fromEntries(
  settingGroups.flatMap((group) => group.settings.map((setting) => [setting.key, setting])),
);

// BACKEND CONTRACT
// PUT /admin/settings
// Permission: platform.settings.manage
// Body: { values: Record<string, string|number|boolean>, reason }
// Returns: { values, updatedAt, updatedById, updatedByName, auditEntryId }
// Errors: 422 change_reason_required,
//         422 validation_failed (with fieldErrors: Record<key, code>),
//         403 setting_not_permitted
// fieldErrors codes: 'unknown_setting' | 'required' | 'below_minimum'
//                    | 'above_maximum' | 'not_an_option' | 'not_a_number'
// Notes: only changed keys need be sent.
//        Every save writes an audit entry, so ADM-097 and ADM-099 read the
//        same record and a settings change is never invisible. That is why the
//        reason is required rather than optional: the entry has to say why as
//        well as what.
export function saveSystemSettings(payload = {}) {
  const values = payload.values ?? {};
  const reason = (payload.reason ?? '').trim();
  if (reason.length === 0) {
    return mockError('change_reason_required', 'Say why these settings are changing.', 422);
  }

  const fieldErrors = {};
  Object.entries(values).forEach(([key, value]) => {
    const setting = settingByKey[key];
    if (!setting) {
      fieldErrors[key] = 'unknown_setting';
      return;
    }
    if (setting.kind === 'number') {
      const numeric = Number(value);
      if (value === '' || Number.isNaN(numeric)) fieldErrors[key] = 'not_a_number';
      else if (setting.min !== undefined && numeric < setting.min) fieldErrors[key] = 'below_minimum';
      else if (setting.max !== undefined && numeric > setting.max) fieldErrors[key] = 'above_maximum';
    }
    if (setting.kind === 'text' && String(value).trim().length === 0) fieldErrors[key] = 'required';
    if (setting.kind === 'select' && !setting.options.includes(value)) fieldErrors[key] = 'not_an_option';
  });

  if (Object.keys(fieldErrors).length > 0) {
    return mockRequest(null).then(() => {
      const error = new MockApiError('Some settings could not be saved.', {
        status: 422,
        code: 'validation_failed',
      });
      error.fieldErrors = fieldErrors;
      throw error;
    });
  }

  return mockRequest(() => {
    const changes = Object.entries(values)
      .filter(([key, value]) => settingRecord[key] !== value)
      .map(([key, value]) => ({
        field: key,
        before: String(settingRecord[key]),
        after: String(value),
      }));

    Object.entries(values).forEach(([key, value]) => {
      const setting = settingByKey[key];
      settingRecord[key] = setting.kind === 'number' ? Number(value) : value;
    });

    settingMetaRecord = {
      updatedAt: nowIso(),
      updatedById: actingAdmin.id,
      updatedByName: actingAdmin.name,
    };

    const entry = appendAuditEntry({
      module: 'platform',
      action: 'settings.updated',
      severity: 'sensitive',
      entityType: 'setting',
      entityId: 'platform-settings',
      entityLabel: 'Platform settings',
      entityPath: '/platform/settings',
      summary: reason,
      changes,
    });

    return { values: { ...settingRecord }, ...settingMetaRecord, auditEntryId: entry.id };
  });
}

// Platform vocabulary, not data. Exported so screens get their enum options
// without importing a fixture.
export {
  AUDIT_MODULES,
  CONSENT_PURPOSES,
  DATA_REQUEST_TYPES,
  DPDP_RESPONSE_DAYS,
  EXPORT_FORMATS,
  EXPORT_RETENTION_DAYS,
  REPORT_PERIODS,
  VERIFIED_BADGE_THRESHOLDS,
};
