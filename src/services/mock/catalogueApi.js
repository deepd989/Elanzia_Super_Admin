// Mock API for Catalogue control - ADM-023 to ADM-034.
//
// ENTITY SHAPES referenced by the contracts below:
//
// CatalogueRow: { id, sku, title, manufacturerId, manufacturerName,
//                 manufacturerCity, manufacturerStatus, category, speciality,
//                 purity, grossWeight, stoneWeight, netWeight, hallmarked,
//                 huid, hsn, hsnSource: 'product'|'category', hsnIsOverride,
//                 gstRate, visibility: 'public'|'private', imageCount,
//                 hasVideo, stockQuantity, minOrderQuantity, leadTimeDays,
//                 status: 'draft'|'pending_review'|'live'|'out_of_stock'
//                         |'archived'|'rejected',
//                 listedAt, priceTotal, rejectionReason,
//                 flags: ProductFlag[], flagCount, topSeverity,
//                 queue: 'awaiting'|'flagged'|'clear' }
//
// ProductFlag: { code, severity: 'critical'|'high'|'medium'|'low',
//                summary, detail }
//   code: 'hallmark_missing' | 'below_media_standard' | 'no_video'
//       | 'manufacturer_not_approved' | 'stale_listing' | 'zero_stock_live'
//       | 'hsn_gst_mismatch'
//
// ProductDetail: CatalogueRow + { price: PriceBreakup, media: MediaItem[],
//                                 audit: AuditEntry[], attributeSetId,
//                                 categoryDefaultHsn, lockedByOrder: boolean }
//
// PriceBreakup: { purity, netWeight, grossWeight, metalRatePerGram, metalValue,
//                 wastagePercent, wastageValue, makingChargesPerGram,
//                 makingCharges, stoneValue, subtotal, gstPercent, gstValue,
//                 total }
//
// MediaItem: { id, type: 'image'|'video'|'document', url: string|null,
//              label, caption }
//
// AuditEntry: { id, productId, at, actorId, actorName, action, summary, reason }
//
// Category: { id, name, parentId: Category.id|null, slug,
//             status: 'active'|'hidden', defaultHsn, attributeSetId,
//             productCount, liveCount, order, createdAt, updatedAt }
//
// Attribute: { id, label, group: 'metal'|'weight'|'stone'|'making'|'compliance',
//              type: 'enum'|'number'|'text'|'boolean', unit, required,
//              derived: boolean, options: string[], helpText }
//
// AttributeSet: { id, name, description, categoryIds, attributeIds,
//                 productCount, updatedAt, updatedBy }
//
// MediaStandards: { minResolutionPx, maxFileSizeMb, allowedFormats,
//                   background: 'plain_white'|'plain_grey'|'any',
//                   requiredAngles, minImages, maxImages, videoRequired,
//                   videoMaxSeconds, updatedAt, updatedBy }
//
// HsnCode: { code, description, chapter, kind: 'goods'|'service', gstRate,
//            categoryIds, productCount, effectiveFrom, updatedAt }
//
// AiJob: { id, manufacturerId, manufacturerName, manufacturerCity,
//          sourceImageCount, model,
//          status: 'queued'|'running'|'needs_review'|'published'|'rejected'
//                  |'failed'|'cancelled',
//          submittedAt, startedAt, completedAt, durationMs, creditsUsed,
//          overallConfidence, lowConfidenceFields: string[],
//          productId, productSku, reviewedBy, reviewedByName, reviewedAt,
//          failureCode, failureReason, retryCount,
//          extracted: { <field>: ExtractedField }|null,
//          sourceImages: MediaItem[] }
// ExtractedField: { value, confidence: 0..1, sourceImageIndex }
//
// AiCreditRow: { manufacturerId, manufacturerName, city, plan, balance,
//                grantedTotal, consumedTotal, consumedThisMonth, jobsThisMonth,
//                successRate, lastJobAt,
//                state: 'healthy'|'low'|'exhausted' }
//
// PrivateRange: { manufacturerId, manufacturerName, city, pieceCount,
//                 sealed: true, activeGrants, expiredGrants, revokedGrants,
//                 viewsLast30Days, firstSealedAt, lastViewedAt }
//   Carries NO piece title, image or price. See the visibility section.
//
// AccessGrant: { id, manufacturerId, jewellerId, jewellerName, jewellerCity,
//                grantedAt, expiresAt, status: 'active'|'expired'|'revoked',
//                grantedBy: 'manufacturer', viewCount, lastViewedAt,
//                revokedAt, revokedReason }
//
// PrivateViewLog: { id, manufacturerId, at,
//                   viewerType: 'jeweller'|'admin', viewerId, viewerName,
//                   action: 'viewed_range'|'viewed_piece'|'unsealed',
//                   grantId, reason }

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import { adminUsers, manufacturerById, products } from '@/data/core';
import {
  REQUIRED_ATTRIBUTE_IDS,
  UNSEAL_REASON_MIN_LENGTH,
  UNSEAL_WINDOW_MINUTES,
  accessGrants,
  aiCreditAccounts,
  aiListingJobs,
  aiUsageSeries,
  attributeDefinitions,
  attributeSets,
  bulkRuns,
  categoryTree,
  hsnCodes,
  mediaItemsFor,
  mediaStandards,
  privateViewLogs,
  privateRanges,
  productAuditTrail,
  productIdsOnConfirmedOrders,
  toCatalogueRow,
  unsealRequests,
} from '@/data/catalogueFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let productRecords = products.map((product) => ({ ...product, price: { ...product.price } }));
let categoryRecords = categoryTree.map((row) => ({ ...row }));
let attributeSetRecords = attributeSets.map((row) => ({ ...row, attributeIds: [...row.attributeIds] }));
let mediaStandardRecords = { ...mediaStandards, requiredAngles: [...mediaStandards.requiredAngles] };
let hsnRecords = hsnCodes.map((row) => ({ ...row }));
let jobRecords = aiListingJobs.map((row) => ({ ...row }));
let creditRecords = aiCreditAccounts.map((row) => ({ ...row }));
let grantRecords = accessGrants.map((row) => ({ ...row }));
let viewLogRecords = privateViewLogs.map((row) => ({ ...row }));
let unsealRecords = unsealRequests.map((row) => ({ ...row }));
let bulkRunRecords = bulkRuns.map((row) => ({ ...row }));
let auditRecords = productAuditTrail.map((row) => ({ ...row }));

// Previews handed out by previewBulkAction, keyed by token. A run has to quote
// one back, so the server can refuse to act on a set nobody has looked at.
const bulkPreviews = new Map();

// The signed-in admin. The real client reads this from the session.
const actingAdmin = adminUsers.find((user) => user.status === 'active');

function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

function nowIso() {
  return new Date().toISOString();
}

function rows() {
  return productRecords.map(toCatalogueRow);
}

function findProduct(productId) {
  return productRecords.find((product) => product.id === productId);
}

// Price = (metal rate x net weight) + wastage + making charges + stone value
// + GST. Wastage is ADDED, not deducted - trade convention. Reproduces every
// figure already in src/data/core/products.js, which is how we know an edit
// reprices the same way the piece was priced originally.
function repriceFrom(price, { netWeight, grossWeight, purity }) {
  const metalValue = Math.round(price.metalRatePerGram * netWeight);
  const wastageValue = Math.round((metalValue * price.wastagePercent) / 100);
  const makingCharges = Math.round(price.makingChargesPerGram * netWeight);
  const subtotal = metalValue + wastageValue + makingCharges + price.stoneValue;
  const gstValue = Math.round((subtotal * price.gstPercent) / 100);

  return {
    ...price,
    purity,
    netWeight,
    grossWeight,
    metalValue,
    wastageValue,
    makingCharges,
    subtotal,
    gstValue,
    total: subtotal + gstValue,
  };
}

function writeAudit({ productId, action, summary, reason }) {
  const entry = {
    id: `PAU-${productId}-${Date.now()}`,
    productId,
    at: nowIso(),
    actorId: actingAdmin.id,
    actorName: actingAdmin.name,
    action,
    summary,
    reason,
  };
  auditRecords = [entry, ...auditRecords];
  return entry;
}

// ---------------------------------------------------------------------------
// Moderation queue - ADM-023
// ---------------------------------------------------------------------------

const MODERATION_SEARCH_FIELDS = ['id', 'sku', 'title', 'manufacturerName', 'huid', 'hsn'];

function narrowRows({ search, filters = {} }) {
  let result = applySearch(rows(), search, MODERATION_SEARCH_FIELDS);

  result = applyFilters(result, {
    queue: filters.queue === 'all' ? '' : filters.queue,
    status: filters.status,
    category: filters.category,
    manufacturerId: filters.manufacturerId,
    visibility: filters.visibility,
  });

  // flags is an array, so applyFilters cannot reach it - it compares top level
  // fields by equality only.
  if (filters.flag) {
    result = result.filter((row) => row.flags.some((flag) => flag.code === filters.flag));
  }

  return result;
}

// BACKEND CONTRACT
// GET /admin/catalogue/moderation
// Query: { search, queue, status, category, manufacturerId, visibility, flag,
//          page, pageSize, sortBy, sortDir }
//        queue: 'awaiting'|'flagged'|'clear'|'all'
//        status: 'draft'|'pending_review'|'live'|'out_of_stock'|'archived'
//                |'rejected'
//        flag: any ProductFlag code
// Returns: { items: CatalogueRow[], total, page, pageSize }
// Notes: queue 'awaiting' is exactly status pending_review or draft. That is
//        the SAME rule GET /admin/operations/alerts uses for its
//        listing_moderation category, and the two counts must never disagree -
//        the dashboard links straight here.
//        Default sort listedAt desc. Private pieces ARE listed: this is an
//        internal surface and an admin moderating the catalogue has to know
//        they exist. Their designs are protected by the visibility endpoints,
//        not by hiding the rows here.
export function listModerationQueue({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const narrowed = narrowRows({ search, filters });
    const sorted = applySort(narrowed, sortBy ?? 'listedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/catalogue/moderation/counts
// Query: { search, category, manufacturerId, flag }
// Returns: { awaitingDecision, flagged, clear, total, live, archived, rejected,
//            byFlag: { <code>: number }, byStatus: { <status>: number },
//            byCategory: { <name>: number } }
// Notes: unpaginated and computed WITHOUT the queue and status filters, so the
//        tab counts do not collapse to one number the moment a tab is chosen.
export function getModerationCounts({ search, filters = {} } = {}) {
  return mockRequest(() => {
    const scoped = narrowRows({
      search,
      filters: { ...filters, queue: '', status: '' },
    });

    const tally = (key) =>
      scoped.reduce((counts, row) => {
        counts[row[key]] = (counts[row[key]] ?? 0) + 1;
        return counts;
      }, {});

    const byStatus = tally('status');
    const byQueue = tally('queue');

    return {
      total: scoped.length,
      awaitingDecision: byQueue.awaiting ?? 0,
      flagged: byQueue.flagged ?? 0,
      clear: byQueue.clear ?? 0,
      live: byStatus.live ?? 0,
      archived: byStatus.archived ?? 0,
      rejected: byStatus.rejected ?? 0,
      byStatus,
      byCategory: tally('category'),
      byFlag: scoped.reduce((counts, row) => {
        row.flags.forEach((flag) => {
          counts[flag.code] = (counts[flag.code] ?? 0) + 1;
        });
        return counts;
      }, {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Product review, decision and edit - ADM-024, ADM-025
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/products/:productId
// Returns: ProductDetail
// Errors: 404 product_not_found
// Notes: resolves for EVERY product id including archived, rejected and
//        private ones - the alerts feed and global search both deep link here
//        and a dead end would be worse than a sealed one.
//        lockedByOrder is true when the piece sits on a confirmed order line.
//        That order's price is permanent, so the edit screen renders read only.
export function getProduct(productId) {
  const product = findProduct(productId);
  if (!product) return mockError('product_not_found', 'That listing no longer exists', 404);

  const row = toCatalogueRow(product);
  const category = categoryRecords.find((entry) => entry.name === product.category);

  return mockRequest(() => ({
    ...row,
    price: product.price,
    media: mediaItemsFor(product),
    audit: auditRecords.filter((entry) => entry.productId === productId),
    attributeSetId: category?.attributeSetId ?? null,
    categoryDefaultHsn: category?.defaultHsn ?? null,
    lockedByOrder: productIdsOnConfirmedOrders.includes(productId),
  }));
}

// BACKEND CONTRACT
// GET /admin/catalogue/products/:productId/audit
// Returns: { items: AuditEntry[] }
// Notes: newest first. Never truncated - the trail is the only record of who
//        changed a manufacturer's listing and on what grounds.
export function getProductAuditTrail(productId) {
  if (!findProduct(productId)) {
    return mockError('product_not_found', 'That listing no longer exists', 404);
  }
  return mockRequest(() => ({
    items: auditRecords.filter((entry) => entry.productId === productId),
  }));
}

const DECISION_STATUS = { approve: 'live', reject: 'rejected', request_changes: 'draft' };

// BACKEND CONTRACT
// POST /admin/catalogue/products/:productId/decision
// Body: { decision: 'approve'|'reject'|'request_changes', reason, note }
// Returns: CatalogueRow
// Errors: 404 product_not_found, 409 product_already_live,
//         422 rejection_reason_required, 403 manufacturer_not_approved,
//         422 unknown_decision
// Notes: approving publishes to the marketplace, so it is refused when the
//        owning manufacturer is not approved. No manufacturer that owns a
//        listing is unapproved today, but onboarding can suspend one at any
//        time and a suspended workshop must not be able to publish.
//        A rejection or a change request without a written reason leaves a
//        manufacturer who cannot fix anything, so the reason is mandatory
//        server side and not merely disabled in the UI.
export function decideProduct({ productId, decision, reason, note } = {}) {
  const product = findProduct(productId);
  if (!product) return mockError('product_not_found', 'That listing no longer exists', 404);
  if (!DECISION_STATUS[decision]) {
    return mockError('unknown_decision', 'That is not a decision this queue takes', 422);
  }
  if (decision === 'approve' && product.status === 'live') {
    return mockError('product_already_live', 'That listing is already on the marketplace', 409);
  }
  if (decision !== 'approve' && !String(reason ?? '').trim()) {
    return mockError('rejection_reason_required', 'Say what the manufacturer has to fix', 422);
  }

  const manufacturer = manufacturerById[product.manufacturerId];
  if (decision === 'approve' && manufacturer.status !== 'approved') {
    return mockError(
      'manufacturer_not_approved',
      `${manufacturer.businessName} cannot publish while its account is ${manufacturer.status.replace(/_/g, ' ')}`,
      403,
    );
  }

  const updated = {
    ...product,
    status: DECISION_STATUS[decision],
    rejectionReason: decision === 'reject' ? String(reason).trim() : null,
  };

  productRecords = productRecords.map((row) => (row.id === productId ? updated : row));
  writeAudit({
    productId,
    action: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested',
    summary: note?.trim() || `Listing ${decision.replace(/_/g, ' ')}`,
    reason: reason?.trim() ?? null,
  });

  return mockRequest(toCatalogueRow(updated));
}

// BACKEND CONTRACT
// POST /admin/catalogue/products/decisions
// Body: { productIds: string[], decision, reason }
// Returns: { updated: CatalogueRow[], blocked: [{ productId, code, reason }] }
// Errors: 422 validation_failed, 422 rejection_reason_required
// Notes: partial success is the normal outcome. A listing that cannot take the
//        decision is returned in `blocked` with the reason, never silently
//        skipped - an operator who selected 20 rows needs to know which 3 did
//        not move and why.
export function bulkDecideProducts({ productIds, decision, reason } = {}) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return mockError('validation_failed', 'Select at least one listing', 422);
  }
  if (!DECISION_STATUS[decision]) {
    return mockError('unknown_decision', 'That is not a decision this queue takes', 422);
  }
  if (decision !== 'approve' && !String(reason ?? '').trim()) {
    return mockError('rejection_reason_required', 'Say what the manufacturers have to fix', 422);
  }

  const updated = [];
  const blocked = [];

  productIds.forEach((productId) => {
    const product = findProduct(productId);
    if (!product) {
      blocked.push({ productId, code: 'product_not_found', reason: 'No longer exists' });
      return;
    }

    const manufacturer = manufacturerById[product.manufacturerId];
    if (decision === 'approve' && manufacturer.status !== 'approved') {
      blocked.push({
        productId,
        code: 'manufacturer_not_approved',
        reason: `${manufacturer.businessName} is ${manufacturer.status.replace(/_/g, ' ')}`,
      });
      return;
    }
    if (decision === 'approve' && product.status === 'live') {
      blocked.push({ productId, code: 'product_already_live', reason: 'Already on the marketplace' });
      return;
    }

    const next = {
      ...product,
      status: DECISION_STATUS[decision],
      rejectionReason: decision === 'reject' ? String(reason).trim() : null,
    };
    productRecords = productRecords.map((row) => (row.id === productId ? next : row));
    writeAudit({
      productId,
      action: decision === 'approve' ? 'approved' : 'changes_requested',
      summary: `Bulk ${decision.replace(/_/g, ' ')}`,
      reason: reason?.trim() ?? null,
    });
    updated.push(toCatalogueRow(next));
  });

  return mockRequest({ updated, blocked });
}

const EDITABLE_FIELDS = [
  'title', 'category', 'speciality', 'purity', 'grossWeight', 'stoneWeight',
  'hallmarked', 'huid', 'hsn', 'visibility', 'minOrderQuantity',
  'stockQuantity', 'leadTimeDays',
];

// BACKEND CONTRACT
// PATCH /admin/catalogue/products/:productId
// Body: { patch: Partial<Product>, reason }
// Returns: ProductDetail
// Errors: 404 product_not_found, 422 edit_reason_required,
//         422 validation_failed, 409 product_locked_by_order,
//         422 field_not_editable
// Notes: `reason` is mandatory. An admin editing somebody else's listing with
//        no reason recorded is indistinguishable from tampering, and the trail
//        is what the manufacturer is shown if they dispute the change.
//        netWeight is DERIVED and cannot be patched: the server recomputes
//        net = gross - stone and reprices from it. The jeweller pays the metal
//        rate on net only, and letting the two numbers disagree is exactly how
//        the most disputed figure in the trade goes wrong.
//        huid follows hallmarked: clearing the hallmark clears the HUID,
//        because the number is what hallmarking issues.
//        A listing on a confirmed order line is refused outright - that order's
//        price is permanent and it must keep describing what was bought.
export function updateProduct({ productId, patch = {}, reason } = {}) {
  const product = findProduct(productId);
  if (!product) return mockError('product_not_found', 'That listing no longer exists', 404);
  if (!String(reason ?? '').trim()) {
    return mockError('edit_reason_required', 'Record why this listing is being changed', 422);
  }
  if (productIdsOnConfirmedOrders.includes(productId)) {
    return mockError(
      'product_locked_by_order',
      'This piece sits on a confirmed order. That order keeps the price it was confirmed at',
      409,
    );
  }

  const offending = Object.keys(patch).find((field) => !EDITABLE_FIELDS.includes(field));
  if (offending) {
    return mockError('field_not_editable', `${offending} is derived and cannot be set by hand`, 422);
  }
  if (patch.grossWeight !== undefined && Number(patch.grossWeight) <= 0) {
    return mockError('validation_failed', 'Gross weight must be greater than zero', 422);
  }

  const grossWeight = Number(patch.grossWeight ?? product.grossWeight);
  const stoneWeight = Number(patch.stoneWeight ?? product.stoneWeight);
  if (stoneWeight < 0 || stoneWeight >= grossWeight) {
    return mockError('validation_failed', 'Stone weight must be less than the gross weight', 422);
  }

  const netWeight = Number((grossWeight - stoneWeight).toFixed(3));
  const purity = Number(patch.purity ?? product.purity);
  const hallmarked = patch.hallmarked ?? product.hallmarked;

  const updated = {
    ...product,
    ...patch,
    purity,
    grossWeight,
    stoneWeight,
    netWeight,
    hallmarked,
    huid: hallmarked ? (patch.huid ?? product.huid) : null,
    price: repriceFrom(product.price, { netWeight, grossWeight, purity }),
  };

  productRecords = productRecords.map((row) => (row.id === productId ? updated : row));
  writeAudit({
    productId,
    action: 'field_corrected',
    summary: `Corrected ${Object.keys(patch).join(', ')}`,
    reason: String(reason).trim(),
  });

  const category = categoryRecords.find((entry) => entry.name === updated.category);

  return mockRequest(() => ({
    ...toCatalogueRow(updated),
    price: updated.price,
    media: mediaItemsFor(updated),
    audit: auditRecords.filter((entry) => entry.productId === productId),
    attributeSetId: category?.attributeSetId ?? null,
    categoryDefaultHsn: category?.defaultHsn ?? null,
    lockedByOrder: false,
  }));
}

// ---------------------------------------------------------------------------
// Category management - ADM-026
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/categories
// Returns: { items: Category[] }
// Notes: the whole tree in one call - it is 17 rows and a lazy tree would cost
//        more round trips than it saves. Ordered parents first, then children
//        by `order`. productCount counts the exact category and never the
//        subtree, so moving a listing between two siblings does not change
//        what their parent claims to hold.
export function listCategories() {
  return mockRequest(() => ({
    items: categoryRecords.map((row) => ({
      ...row,
      productCount: productRecords.filter((product) => product.category === row.name).length,
      liveCount: productRecords.filter(
        (product) => product.category === row.name && product.status === 'live',
      ).length,
    })),
  }));
}

// BACKEND CONTRACT
// POST   /admin/catalogue/categories
// PATCH  /admin/catalogue/categories/:categoryId
// Body: { id, name, parentId, defaultHsn, attributeSetId, status }
// Returns: Category
// Errors: 404 category_not_found, 404 parent_not_found, 409 name_taken,
//         422 validation_failed, 422 nesting_too_deep, 404 hsn_not_found
// Notes: two levels only. A child cannot become a parent's parent and a
//        grandchild is refused - a deeper tree makes the HSN default
//        ambiguous, and the default is what sets the GST rate.
export function saveCategory({ id, name, parentId, defaultHsn, attributeSetId, status } = {}) {
  if (!String(name ?? '').trim()) {
    return mockError('validation_failed', 'A category needs a name', 422);
  }
  if (defaultHsn && !hsnRecords.some((row) => row.code === defaultHsn)) {
    return mockError('hsn_not_found', 'That HSN code is not in the register', 404);
  }
  if (parentId) {
    const parent = categoryRecords.find((row) => row.id === parentId);
    if (!parent) return mockError('parent_not_found', 'That parent no longer exists', 404);
    if (parent.parentId) {
      return mockError('nesting_too_deep', 'The taxonomy is two levels and stays two levels', 422);
    }
  }
  if (
    categoryRecords.some(
      (row) => row.id !== id && row.name.toLowerCase() === String(name).trim().toLowerCase(),
    )
  ) {
    return mockError('name_taken', 'A category with that name already exists', 409);
  }

  if (id) {
    const existing = categoryRecords.find((row) => row.id === id);
    if (!existing) return mockError('category_not_found', 'That category no longer exists', 404);

    const updated = {
      ...existing,
      name: String(name).trim(),
      parentId: parentId ?? null,
      defaultHsn: defaultHsn ?? null,
      attributeSetId: attributeSetId ?? null,
      status: status ?? existing.status,
      updatedAt: nowIso(),
    };
    categoryRecords = categoryRecords.map((row) => (row.id === id ? updated : row));
    return mockRequest(updated);
  }

  const created = {
    id: `CAT-${String(name).trim().toLowerCase().replace(/\s+/g, '-')}`,
    name: String(name).trim(),
    parentId: parentId ?? null,
    slug: String(name).trim().toLowerCase().replace(/\s+/g, '-'),
    status: status ?? 'active',
    defaultHsn: defaultHsn ?? null,
    attributeSetId: attributeSetId ?? null,
    productCount: 0,
    liveCount: 0,
    order: categoryRecords.length,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  categoryRecords = [...categoryRecords, created];
  return mockRequest(created);
}

// BACKEND CONTRACT
// POST /admin/catalogue/categories/:categoryId/archive
// Body: { reassignToId }
// Returns: { category: Category, reassigned: number }
// Errors: 404 category_not_found, 409 category_has_children,
//         409 category_has_products, 404 reassign_target_not_found
// Notes: a category is hidden, never deleted. A live listing pointing at a
//        deleted category has no default HSN and therefore no GST rate, so
//        the products move first or the archive is refused.
export function archiveCategory({ categoryId, reassignToId } = {}) {
  const category = categoryRecords.find((row) => row.id === categoryId);
  if (!category) return mockError('category_not_found', 'That category no longer exists', 404);

  if (categoryRecords.some((row) => row.parentId === categoryId)) {
    return mockError('category_has_children', 'Move or archive the child categories first', 409);
  }

  const owned = productRecords.filter((product) => product.category === category.name);
  if (owned.length > 0 && !reassignToId) {
    return mockError(
      'category_has_products',
      `${owned.length} listings still sit in ${category.name}. Choose where they move to`,
      409,
    );
  }

  let reassigned = 0;
  if (owned.length > 0) {
    const target = categoryRecords.find((row) => row.id === reassignToId);
    if (!target) return mockError('reassign_target_not_found', 'That category no longer exists', 404);

    productRecords = productRecords.map((product) =>
      product.category === category.name ? { ...product, category: target.name } : product,
    );
    reassigned = owned.length;
  }

  const updated = { ...category, status: 'hidden', updatedAt: nowIso() };
  categoryRecords = categoryRecords.map((row) => (row.id === categoryId ? updated : row));

  return mockRequest({ category: updated, reassigned });
}

// ---------------------------------------------------------------------------
// Attribute sets - ADM-027
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/attribute-sets
// Returns: { sets: AttributeSet[], definitions: Attribute[] }
// Notes: the definitions come back with the sets because the editor needs the
//        full vocabulary to offer, not only what is already assigned.
export function listAttributeSets() {
  return mockRequest(() => ({
    sets: attributeSetRecords,
    definitions: attributeDefinitions,
  }));
}

// BACKEND CONTRACT
// GET /admin/catalogue/attribute-sets/:setId
// Returns: AttributeSet
// Errors: 404 attribute_set_not_found
export function getAttributeSet(setId) {
  const set = attributeSetRecords.find((row) => row.id === setId);
  if (!set) return mockError('attribute_set_not_found', 'That attribute set no longer exists', 404);
  return mockRequest(set);
}

// BACKEND CONTRACT
// PUT /admin/catalogue/attribute-sets/:setId
// Body: { id, name, description, categoryIds, attributeIds }
// Returns: AttributeSet
// Errors: 404 attribute_set_not_found, 422 validation_failed,
//         422 required_attribute_missing, 404 attribute_not_found
// Notes: purity, gross weight and HSN cannot be dropped from any set. The
//        first two price the piece and the third taxes it, so a set without
//        them describes a listing nobody can sell.
export function saveAttributeSet({ id, name, description, categoryIds = [], attributeIds = [] } = {}) {
  const set = attributeSetRecords.find((row) => row.id === id);
  if (!set) return mockError('attribute_set_not_found', 'That attribute set no longer exists', 404);
  if (!String(name ?? '').trim()) {
    return mockError('validation_failed', 'An attribute set needs a name', 422);
  }

  const unknown = attributeIds.find(
    (attributeId) => !attributeDefinitions.some((row) => row.id === attributeId),
  );
  if (unknown) return mockError('attribute_not_found', `${unknown} is not a known attribute`, 404);

  const missing = REQUIRED_ATTRIBUTE_IDS.filter((required) => !attributeIds.includes(required));
  if (missing.length > 0) {
    const labels = missing.map(
      (attributeId) => attributeDefinitions.find((row) => row.id === attributeId).label,
    );
    return mockError(
      'required_attribute_missing',
      `${labels.join(' and ')} price and tax the piece and cannot be removed`,
      422,
    );
  }

  const updated = {
    ...set,
    name: String(name).trim(),
    description: description ?? set.description,
    categoryIds,
    attributeIds,
    updatedAt: nowIso(),
    updatedBy: actingAdmin.id,
  };
  attributeSetRecords = attributeSetRecords.map((row) => (row.id === id ? updated : row));

  return mockRequest(updated);
}

// ---------------------------------------------------------------------------
// Media standards - ADM-032
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/media-standards
// Returns: MediaStandards
export function getMediaStandards() {
  return mockRequest(mediaStandardRecords);
}

// BACKEND CONTRACT
// GET /admin/catalogue/media-standards/compliance
// Query: { minImages, videoRequired }   optional, to preview a proposed change
// Returns: { total, compliant, belowMinimum, missingVideo,
//            byCategory: [{ category, total, compliant }] }
// Notes: compliance is computed against the standard passed in, falling back
//        to the saved one. That is what lets ADM-032 answer "how many listings
//        does this break" BEFORE the tighter standard is saved, rather than
//        after, when it is already somebody else's problem.
export function getMediaCompliance({ minImages, videoRequired } = {}) {
  return mockRequest(() => {
    const floor = minImages ?? mediaStandardRecords.minImages;
    const needsVideo = videoRequired ?? mediaStandardRecords.videoRequired;

    const isCompliant = (product) =>
      product.imageCount >= floor && (!needsVideo || product.hasVideo);

    const categories = [...new Set(productRecords.map((product) => product.category))].sort();

    return {
      total: productRecords.length,
      compliant: productRecords.filter(isCompliant).length,
      belowMinimum: productRecords.filter((product) => product.imageCount < floor).length,
      missingVideo: needsVideo
        ? productRecords.filter((product) => !product.hasVideo).length
        : 0,
      byCategory: categories.map((category) => {
        const owned = productRecords.filter((product) => product.category === category);
        return {
          category,
          total: owned.length,
          compliant: owned.filter(isCompliant).length,
        };
      }),
    };
  });
}

// BACKEND CONTRACT
// PUT /admin/catalogue/media-standards
// Body: MediaStandards
// Returns: MediaStandards
// Errors: 422 validation_failed
// Notes: tightening a standard puts existing listings out of compliance the
//        moment it saves. That is intended - the flag appears on the
//        moderation queue rather than the listings being pulled down, because
//        a photograph below standard is a nudge, not a reason to stop trade.
export function updateMediaStandards(payload = {}) {
  const minImages = Number(payload.minImages);
  const maxImages = Number(payload.maxImages);

  if (!Number.isFinite(minImages) || minImages < 1) {
    return mockError('validation_failed', 'A listing needs at least one image', 422);
  }
  if (!Number.isFinite(maxImages) || maxImages < minImages) {
    return mockError('validation_failed', 'The maximum cannot be below the minimum', 422);
  }
  if ((payload.requiredAngles ?? []).length > minImages) {
    return mockError(
      'validation_failed',
      'More angles are required than the minimum image count allows',
      422,
    );
  }

  mediaStandardRecords = {
    ...mediaStandardRecords,
    ...payload,
    minImages,
    maxImages,
    updatedAt: nowIso(),
    updatedBy: actingAdmin.id,
  };

  return mockRequest(mediaStandardRecords);
}

// ---------------------------------------------------------------------------
// HSN register - ADM-033
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/hsn-codes
// Query: { search, kind, gstRate, page, pageSize, sortBy, sortDir }
// Returns: { items: HsnCode[], total, page, pageSize }
// Notes: each row carries the categories defaulting to it and the number of
//        listings resolving to it, because the blast radius of a rate change
//        is the only thing that makes the change safe to judge.
//        Codes with no listings are returned, not hidden - the register is a
//        reference table and an unused code is a normal row.
export function listHsnCodes({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const enriched = hsnRecords.map((row) => ({
      ...row,
      categoryIds: categoryRecords.filter((entry) => entry.defaultHsn === row.code).map((entry) => entry.id),
      categoryNames: categoryRecords
        .filter((entry) => entry.defaultHsn === row.code)
        .map((entry) => entry.name),
      productCount: rows().filter((product) => product.hsn === row.code).length,
    }));

    const searched = applySearch(enriched, search, ['code', 'description', 'chapter']);
    const filtered = applyFilters(searched, { kind: filters.kind, gstRate: filters.gstRate });
    const sorted = applySort(filtered, sortBy ?? 'code', sortDir ?? 'asc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// POST  /admin/catalogue/hsn-codes
// PATCH /admin/catalogue/hsn-codes/:code
// Body: { code, description, chapter, kind, gstRate, effectiveFrom }
// Returns: HsnCode
// Errors: 409 code_taken, 422 validation_failed, 404 hsn_not_found,
//         409 rate_conflicts_with_orders
// Notes: the GST rate lives on the code and nowhere else. Changing it reprices
//        the tax on every listing that resolves to it, which is why this needs
//        catalogue.hsn.manage and why it is refused when a listing under this
//        code sits on a confirmed order - that order charged a rate and the
//        invoice has to keep saying so.
export function saveHsnCode({ code, description, chapter, kind, gstRate, effectiveFrom } = {}) {
  const trimmed = String(code ?? '').trim();
  if (!trimmed) return mockError('validation_failed', 'An HSN needs a code', 422);
  if (!String(description ?? '').trim()) {
    return mockError('validation_failed', 'An HSN needs a description', 422);
  }

  const rate = Number(gstRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 28) {
    return mockError('validation_failed', 'GST rate must be between 0 and 28 percent', 422);
  }

  const existing = hsnRecords.find((row) => row.code === trimmed);

  if (existing) {
    if (existing.gstRate !== rate) {
      const lockedProduct = rows().find(
        (product) => product.hsn === trimmed && productIdsOnConfirmedOrders.includes(product.id),
      );
      if (lockedProduct) {
        return mockError(
          'rate_conflicts_with_orders',
          `${lockedProduct.sku} sits on a confirmed order taxed at ${existing.gstRate} percent`,
          409,
        );
      }
    }

    const updated = {
      ...existing,
      description: String(description).trim(),
      chapter: chapter ?? existing.chapter,
      kind: kind ?? existing.kind,
      gstRate: rate,
      effectiveFrom: effectiveFrom ?? existing.effectiveFrom,
      updatedAt: nowIso(),
    };
    hsnRecords = hsnRecords.map((row) => (row.code === trimmed ? updated : row));
    return mockRequest(updated);
  }

  const created = {
    code: trimmed,
    description: String(description).trim(),
    chapter: chapter ?? trimmed.slice(0, 2),
    kind: kind ?? 'goods',
    gstRate: rate,
    effectiveFrom: effectiveFrom ?? nowIso(),
    updatedAt: nowIso(),
  };
  hsnRecords = [...hsnRecords, created];
  return mockRequest(created);
}

// BACKEND CONTRACT
// POST /admin/catalogue/hsn-codes/assignments
// Body: { scope: 'category'|'product', targetId, code, reason }
// Returns: { scope, targetId, code, affected: number }
// Errors: 404 hsn_not_found, 404 target_not_found, 422 unknown_scope,
//         409 product_locked_by_order, 422 service_code_on_goods
// Notes: a category assignment sets the default every listing in it falls back
//        to; a product assignment is an override of that default. Assigning a
//        SAC to a piece of jewellery is refused - 9988 taxes the making as a
//        service and cannot be the code for the goods themselves.
export function assignHsnCode({ scope, targetId, code } = {}) {
  const hsn = hsnRecords.find((row) => row.code === code);
  if (!hsn) return mockError('hsn_not_found', 'That HSN code is not in the register', 404);
  if (hsn.kind === 'service') {
    return mockError(
      'service_code_on_goods',
      `${hsn.code} taxes making charges as a service. It cannot describe the piece`,
      422,
    );
  }

  if (scope === 'category') {
    const category = categoryRecords.find((row) => row.id === targetId);
    if (!category) return mockError('target_not_found', 'That category no longer exists', 404);

    const updated = { ...category, defaultHsn: code, updatedAt: nowIso() };
    categoryRecords = categoryRecords.map((row) => (row.id === targetId ? updated : row));

    return mockRequest({
      scope,
      targetId,
      code,
      affected: productRecords.filter((product) => product.category === category.name).length,
    });
  }

  if (scope === 'product') {
    const product = findProduct(targetId);
    if (!product) return mockError('target_not_found', 'That listing no longer exists', 404);
    if (productIdsOnConfirmedOrders.includes(targetId)) {
      return mockError(
        'product_locked_by_order',
        'This piece sits on a confirmed order and keeps the tax it was charged',
        409,
      );
    }

    productRecords = productRecords.map((row) =>
      row.id === targetId ? { ...row, hsn: code } : row,
    );
    writeAudit({
      productId: targetId,
      action: 'hsn_reassigned',
      summary: `HSN set to ${code}`,
      reason: `Reassigned to ${code}`,
    });

    return mockRequest({ scope, targetId, code, affected: 1 });
  }

  return mockError('unknown_scope', 'Assign an HSN to a category or a product', 422);
}

// ---------------------------------------------------------------------------
// Bulk catalogue actions - ADM-034
// ---------------------------------------------------------------------------

const BULK_ACTION_STATUS = {
  publish: 'live',
  archive: 'archived',
  unpublish: 'draft',
  request_changes: 'draft',
};

// A token bound to the exact filter set it was taken against. Changing a
// filter changes the fingerprint, which invalidates the token.
function fingerprint(filters = {}, action = '') {
  return JSON.stringify([action, ...Object.entries(filters).sort()]);
}

function bulkTargets(filters = {}) {
  return narrowRows({ search: filters.search, filters });
}

// Rows an action must not touch, with the reason. Never silently skipped.
function blockedFor(action, targets) {
  const blocked = [];

  targets.forEach((row) => {
    if (action === 'publish') {
      // Publishing a private piece is the single unrecoverable mistake the
      // whole visibility model exists to prevent, so it is blocked here even
      // when the operator explicitly selected it.
      if (row.visibility === 'private') {
        blocked.push({ productId: row.id, code: 'private_piece', reason: 'Private ranges are never published in bulk' });
        return;
      }
      if (row.manufacturerStatus !== 'approved') {
        blocked.push({ productId: row.id, code: 'manufacturer_not_approved', reason: `${row.manufacturerName} is ${row.manufacturerStatus.replace(/_/g, ' ')}` });
        return;
      }
      if (row.purity >= 22 && !row.hallmarked) {
        blocked.push({ productId: row.id, code: 'hallmark_missing', reason: `${row.purity}K cannot be sold without a hallmark` });
        return;
      }
    }

    if (['set_hsn', 'recategorise', 'set_visibility'].includes(action)
      && productIdsOnConfirmedOrders.includes(row.id)) {
      blocked.push({ productId: row.id, code: 'product_locked_by_order', reason: 'Sits on a confirmed order' });
    }
  });

  return blocked;
}

// BACKEND CONTRACT
// POST /admin/catalogue/bulk/preview
// Body: { filters, action, params }
// Returns: { previewToken, action, total, affected: CatalogueRow[],
//            blocked: [{ productId, code, reason }], previewedAt }
// Errors: 422 action_not_supported, 422 no_filters
// Notes: the preview is the safety mechanism, not a convenience. It returns
//        the token a run has to quote back, bound to this exact filter set.
//        `affected` is capped at 200 rows for transport; `total` is the real
//        number and is what the confirm dialog states.
//        Running with no filters at all is refused - "every listing on the
//        platform" is never what somebody meant to select.
export function previewBulkAction({ filters = {}, action, params = {} } = {}) {
  const supported = [...Object.keys(BULK_ACTION_STATUS), 'recategorise', 'set_hsn', 'set_visibility'];
  if (!supported.includes(action)) {
    return mockError('action_not_supported', 'That is not a bulk action this catalogue takes', 422);
  }

  const active = Object.values(filters).filter((value) => value !== '' && value != null);
  if (active.length === 0) {
    return mockError('no_filters', 'Narrow the selection before previewing a bulk action', 422);
  }

  const targets = bulkTargets(filters);
  const blocked = blockedFor(action, targets);
  const blockedIds = new Set(blocked.map((row) => row.productId));
  const affected = targets.filter((row) => !blockedIds.has(row.id));

  const previewToken = `BPV-${Date.now().toString(36)}-${affected.length}`;
  bulkPreviews.set(previewToken, {
    fingerprint: fingerprint(filters, action),
    productIds: affected.map((row) => row.id),
    params,
    previewedAt: nowIso(),
  });

  return mockRequest(() => ({
    previewToken,
    action,
    total: affected.length,
    affected: affected.slice(0, 200),
    blocked,
    previewedAt: nowIso(),
  }));
}

// BACKEND CONTRACT
// POST /admin/catalogue/bulk/run
// Body: { previewToken, filters, action, params, reason }
// Returns: BulkRun
// Errors: 409 preview_required, 409 preview_stale, 422 reason_required,
//         422 action_not_supported, 422 missing_params
// Notes: the run refuses to act on a set nobody has been shown. A bulk archive
//        that turns out to have matched 400 listings instead of 4 cannot be
//        undone by pressing something, so the token from the preview must be
//        quoted back and must still match the filters on screen.
//        `blocked` rows are counted in the result, never quietly dropped.
export function runBulkAction({ previewToken, filters = {}, action, params = {}, reason } = {}) {
  if (!previewToken) {
    return mockError('preview_required', 'Preview the selection before running it', 409);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Record why the catalogue is being changed in bulk', 422);
  }

  const preview = bulkPreviews.get(previewToken);
  if (!preview || preview.fingerprint !== fingerprint(filters, action)) {
    return mockError(
      'preview_stale',
      'The filters changed since the preview. Preview the new selection first',
      409,
    );
  }
  if (action === 'recategorise' && !params.category) {
    return mockError('missing_params', 'Choose the category to move these into', 422);
  }
  if (action === 'set_hsn' && !params.hsn) {
    return mockError('missing_params', 'Choose the HSN code to apply', 422);
  }

  let succeeded = 0;
  productRecords = productRecords.map((product) => {
    if (!preview.productIds.includes(product.id)) return product;
    succeeded += 1;

    if (BULK_ACTION_STATUS[action]) {
      return { ...product, status: BULK_ACTION_STATUS[action] };
    }
    if (action === 'recategorise') return { ...product, category: params.category };
    if (action === 'set_hsn') return { ...product, hsn: params.hsn };
    if (action === 'set_visibility') return { ...product, visibility: params.visibility };
    return product;
  });

  const blocked = blockedFor(action, bulkTargets(filters)).length;

  const run = {
    id: `BLK-${String(bulkRunRecords.length + 1).padStart(4, '0')}`,
    action,
    params,
    filters,
    reason: String(reason).trim(),
    requestedBy: actingAdmin.id,
    requestedByName: actingAdmin.name,
    requestedAt: nowIso(),
    total: succeeded + blocked,
    succeeded,
    failed: 0,
    blocked,
    status: blocked > 0 ? 'partial' : 'succeeded',
  };

  bulkRunRecords = [run, ...bulkRunRecords];
  bulkPreviews.delete(previewToken);

  return mockRequest(run);
}

// BACKEND CONTRACT
// GET /admin/catalogue/bulk/runs
// Query: { page, pageSize, sortBy, sortDir }
// Returns: { items: BulkRun[], total, page, pageSize }
// Notes: newest first. This is an audit trail, so nothing is ever removed.
export function listBulkRuns({ page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    paginate(applySort(bulkRunRecords, sortBy ?? 'requestedAt', sortDir ?? 'desc'), {
      page,
      pageSize: pageSize ?? 10,
    }),
  );
}

// ---------------------------------------------------------------------------
// AI listing jobs - ADM-028, ADM-029
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/ai/jobs
// Query: { search, status, manufacturerId, failureCode, page, pageSize,
//          sortBy, sortDir }
//        status: 'queued'|'running'|'needs_review'|'published'|'rejected'
//                |'failed'|'cancelled'
// Returns: { items: AiJob[], total, page, pageSize }
// Notes: default sort submittedAt desc. `extracted` is null on failed jobs -
//        there is nothing to review when nothing came back.
export function listAiJobs({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const searched = applySearch(jobRecords, search, ['id', 'manufacturerName', 'productSku', 'model']);
    const filtered = applyFilters(searched, {
      status: filters.status,
      manufacturerId: filters.manufacturerId,
      failureCode: filters.failureCode,
    });
    const sorted = applySort(filtered, sortBy ?? 'submittedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/catalogue/ai/jobs/counts
// Query: { search, manufacturerId }
// Returns: { total, queued, running, needsReview, published, rejected, failed,
//            cancelled, byFailureCode: { <code>: number },
//            creditsConsumed, averageConfidence }
// Notes: computed WITHOUT the status filter, so the strip stays a fixed
//        reference while the operator narrows the queue.
export function getAiJobCounts({ search, filters = {} } = {}) {
  return mockRequest(() => {
    const scoped = applyFilters(
      applySearch(jobRecords, search, ['id', 'manufacturerName', 'productSku', 'model']),
      { manufacturerId: filters.manufacturerId },
    );

    const byStatus = scoped.reduce((counts, job) => {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
      return counts;
    }, {});

    const scored = scoped.filter((job) => job.overallConfidence !== null);

    return {
      total: scoped.length,
      queued: byStatus.queued ?? 0,
      running: byStatus.running ?? 0,
      needsReview: byStatus.needs_review ?? 0,
      published: byStatus.published ?? 0,
      rejected: byStatus.rejected ?? 0,
      failed: byStatus.failed ?? 0,
      cancelled: byStatus.cancelled ?? 0,
      byFailureCode: scoped.reduce((counts, job) => {
        if (job.failureCode) counts[job.failureCode] = (counts[job.failureCode] ?? 0) + 1;
        return counts;
      }, {}),
      creditsConsumed: scoped.reduce((sum, job) => sum + job.creditsUsed, 0),
      averageConfidence: scored.length
        ? Number((scored.reduce((sum, job) => sum + job.overallConfidence, 0) / scored.length).toFixed(2))
        : null,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/catalogue/ai/jobs/:jobId
// Returns: AiJob
// Errors: 404 job_not_found
export function getAiJob(jobId) {
  const job = jobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('job_not_found', 'That extraction job no longer exists', 404);
  return mockRequest(job);
}

// BACKEND CONTRACT
// POST /admin/catalogue/ai/jobs/:jobId/retry
// Returns: AiJob
// Errors: 404 job_not_found, 409 job_not_retryable, 409 insufficient_credits
// Notes: only a failed or cancelled job is retryable, and the retry spends a
//        credit. A manufacturer at zero balance cannot retry - the operator
//        has to grant credits on ADM-030 first, which is deliberate: the
//        failure is a billing conversation, not a queue problem.
export function retryAiJob({ jobId } = {}) {
  const job = jobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('job_not_found', 'That extraction job no longer exists', 404);
  if (!['failed', 'cancelled'].includes(job.status)) {
    return mockError('job_not_retryable', `A ${job.status.replace(/_/g, ' ')} job cannot be retried`, 409);
  }

  const account = creditRecords.find((row) => row.manufacturerId === job.manufacturerId);
  if (account && account.balance <= 0) {
    return mockError(
      'insufficient_credits',
      `${job.manufacturerName} has no credits left. Grant some before retrying`,
      409,
    );
  }

  const updated = {
    ...job,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    durationMs: null,
    failureCode: null,
    failureReason: null,
    retryCount: job.retryCount + 1,
    submittedAt: nowIso(),
  };
  jobRecords = jobRecords.map((row) => (row.id === jobId ? updated : row));

  return mockRequest(updated);
}

// BACKEND CONTRACT
// POST /admin/catalogue/ai/jobs/:jobId/decision
// Body: { decision: 'publish'|'reject'|'return_to_manufacturer',
//         fields: { <field>: value }, reason }
// Returns: AiJob
// Errors: 404 job_not_found, 409 job_not_reviewable, 422 reason_required,
//         422 low_confidence_field_unreviewed, 422 unknown_decision
// Notes: every field the model scored below 0.7 must appear in `fields`,
//        either accepted as extracted or overridden. Publishing an unreviewed
//        low confidence purity is how a 14K piece reaches the marketplace
//        labelled 22K, and no jeweller forgives that twice.
//        Net weight is NEVER taken from the model. It is recomputed as gross
//        minus stone from the accepted values, same as everywhere else.
export function decideAiJob({ jobId, decision, fields = {}, reason } = {}) {
  const job = jobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('job_not_found', 'That extraction job no longer exists', 404);
  if (!['publish', 'reject', 'return_to_manufacturer'].includes(decision)) {
    return mockError('unknown_decision', 'That is not a decision this queue takes', 422);
  }
  if (job.status !== 'needs_review') {
    return mockError('job_not_reviewable', `A ${job.status.replace(/_/g, ' ')} job is not awaiting review`, 409);
  }
  if (decision !== 'publish' && !String(reason ?? '').trim()) {
    return mockError('reason_required', 'Say what the manufacturer has to change', 422);
  }

  if (decision === 'publish') {
    const unreviewed = job.lowConfidenceFields.filter(
      (field) => fields[field] === undefined || fields[field] === null || fields[field] === '',
    );
    if (unreviewed.length > 0) {
      return mockError(
        'low_confidence_field_unreviewed',
        `Check ${unreviewed.join(', ')} before publishing - the model was not confident`,
        422,
      );
    }
  }

  const accepted = { ...fields };
  if (accepted.grossWeight !== undefined && accepted.stoneWeight !== undefined) {
    accepted.netWeight = Number(
      (Number(accepted.grossWeight) - Number(accepted.stoneWeight)).toFixed(3),
    );
  }

  const updated = {
    ...job,
    status: decision === 'publish' ? 'published' : 'rejected',
    accepted,
    reviewedBy: actingAdmin.id,
    reviewedByName: actingAdmin.name,
    reviewedAt: nowIso(),
    reviewReason: reason?.trim() ?? null,
  };
  jobRecords = jobRecords.map((row) => (row.id === jobId ? updated : row));

  return mockRequest(updated);
}

// ---------------------------------------------------------------------------
// AI usage and credits - ADM-030
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/catalogue/ai/credits
// Query: { search, state, page, pageSize, sortBy, sortDir }
//        state: 'healthy'|'low'|'exhausted'
// Returns: { items: AiCreditRow[], total, page, pageSize }
// Notes: default sort consumedThisMonth desc. Only manufacturers that have
//        actually run a job appear - a workshop that has never used the tool
//        has no consumption to oversee.
export function listAiCredits({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const searched = applySearch(creditRecords, search, ['manufacturerName', 'city', 'plan']);
    const filtered = applyFilters(searched, { state: filters.state, plan: filters.plan });
    const sorted = applySort(filtered, sortBy ?? 'consumedThisMonth', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/catalogue/ai/credits/summary
// Returns: { manufacturersOnAi, creditsConsumedThisMonth, creditsOutstanding,
//            jobsThisMonth, failureRate, exhaustedAccounts,
//            usageSeries: [{ month, date, creditsConsumed, jobs }] }
// Notes: failureRate counts jobs that finished, so queued and running work is
//        excluded. Including it would make the rate improve every time the
//        queue backs up, which is the opposite of the truth.
export function getAiCreditsSummary() {
  return mockRequest(() => {
    const finished = jobRecords.filter((job) => !['queued', 'running'].includes(job.status));
    const failed = finished.filter((job) => job.status === 'failed');

    return {
      manufacturersOnAi: creditRecords.length,
      creditsConsumedThisMonth: creditRecords.reduce((sum, row) => sum + row.consumedThisMonth, 0),
      creditsOutstanding: creditRecords.reduce((sum, row) => sum + row.balance, 0),
      jobsThisMonth: jobRecords.length,
      failureRate: finished.length
        ? Number(((failed.length / finished.length) * 100).toFixed(1))
        : 0,
      exhaustedAccounts: creditRecords.filter((row) => row.state === 'exhausted').length,
      usageSeries: aiUsageSeries,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/catalogue/ai/credits/grants
// Body: { manufacturerId, credits, reason }
// Returns: AiCreditRow
// Errors: 404 manufacturer_not_found, 422 credits_must_be_positive,
//         422 reason_required, 403 manufacturer_not_approved
// Notes: credits are granted, never sold here - this endpoint is goodwill and
//        support recovery, so the reason is recorded against the account.
//        Deducting credits is not possible: taking back something already
//        spent on extractions that ran is not a correction, it is a dispute.
export function grantAiCredits({ manufacturerId, credits, reason } = {}) {
  const account = creditRecords.find((row) => row.manufacturerId === manufacturerId);
  if (!account) return mockError('manufacturer_not_found', 'That account is not on the AI tool', 404);

  const amount = Number(credits);
  if (!Number.isFinite(amount) || amount <= 0) {
    return mockError('credits_must_be_positive', 'Grant at least one credit', 422);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Record why these credits are being granted', 422);
  }

  const manufacturer = manufacturerById[manufacturerId];
  if (manufacturer.status !== 'approved') {
    return mockError(
      'manufacturer_not_approved',
      `${manufacturer.businessName} is ${manufacturer.status.replace(/_/g, ' ')} and cannot list`,
      403,
    );
  }

  const balance = account.balance + amount;
  const updated = {
    ...account,
    balance,
    grantedTotal: account.grantedTotal + amount,
    state: balance === 0 ? 'exhausted' : balance < 10 ? 'low' : 'healthy',
  };
  creditRecords = creditRecords.map((row) => (row.manufacturerId === manufacturerId ? updated : row));

  return mockRequest(updated);
}

// ---------------------------------------------------------------------------
// Visibility and design protection - ADM-031
// ---------------------------------------------------------------------------
//
// READ THIS BEFORE CHANGING ANYTHING IN THIS SECTION.
//
// A manufacturer's private range is its unreleased design book, and the whole
// reason a workshop trusts a marketplace with it is that the marketplace
// cannot browse it. So the protection model here is a boundary in the API, not
// a filter in the UI:
//
//   - listPrivateRanges and getPrivateRange return counts, grants and logs.
//     They do NOT return piece titles, images or prices, and no amount of
//     query parameters makes them.
//   - unsealPrivateRange is the only door, it needs its own permission, it
//     needs a written reason, it writes an audit row naming the admin, and
//     what it returns expires.
//   - Nothing unsealed is ever written back into a range, so a refresh
//     re-seals and the sealed shape stays the default rather than the
//     exception.
//
// If a future screen needs a piece from a private range, it goes through the
// unseal. It does not get a wider list endpoint.

function rangeFor(manufacturerId) {
  return privateRanges.find((row) => row.manufacturerId === manufacturerId);
}

function liveRange(range) {
  const grants = grantRecords.filter((grant) => grant.manufacturerId === range.manufacturerId);
  const logs = viewLogRecords.filter((log) => log.manufacturerId === range.manufacturerId);

  return {
    ...range,
    sealed: true,
    activeGrants: grants.filter((grant) => grant.status === 'active').length,
    expiredGrants: grants.filter((grant) => grant.status === 'expired').length,
    revokedGrants: grants.filter((grant) => grant.status === 'revoked').length,
    viewsLast30Days: logs.filter(
      (log) => Date.parse(log.at) > Date.now() - 30 * 24 * 3600000,
    ).length,
  };
}

// BACKEND CONTRACT
// GET /admin/catalogue/visibility/private-ranges
// Query: { search, grantState, page, pageSize, sortBy, sortDir }
//        grantState: 'has_active'|'none_active'
// Returns: { items: PrivateRange[], total, page, pageSize }
// Notes: metadata only. The response carries how many pieces a range holds and
//        who can see them, and nothing about what they are. That is the
//        contract the manufacturer was given, and the backend must honour it
//        rather than relying on the client to omit fields.
export function listPrivateRanges({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const enriched = privateRanges.map(liveRange);
    const searched = applySearch(enriched, search, ['manufacturerName', 'city', 'manufacturerId']);

    const scoped = filters.grantState
      ? searched.filter((row) =>
          filters.grantState === 'has_active' ? row.activeGrants > 0 : row.activeGrants === 0,
        )
      : searched;

    const sorted = applySort(scoped, sortBy ?? 'pieceCount', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/catalogue/visibility/private-ranges/:manufacturerId
// Returns: { range: PrivateRange, grants: AccessGrant[],
//            viewLogs: PrivateViewLog[], unsealHistory: [...] }
// Errors: 404 range_not_found
// Notes: still metadata only. `grants` names the jewellers who hold access and
//        when it lapses; `viewLogs` says who looked and when. Neither says
//        what was looked at.
export function getPrivateRange(manufacturerId) {
  const range = rangeFor(manufacturerId);
  if (!range) return mockError('range_not_found', 'That manufacturer has no private range', 404);

  return mockRequest(() => ({
    range: liveRange(range),
    grants: grantRecords
      .filter((grant) => grant.manufacturerId === manufacturerId)
      .sort((a, b) => Date.parse(b.grantedAt) - Date.parse(a.grantedAt)),
    viewLogs: viewLogRecords
      .filter((log) => log.manufacturerId === manufacturerId)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    unsealHistory: unsealRecords.filter((row) => row.manufacturerId === manufacturerId),
  }));
}

// BACKEND CONTRACT
// POST /admin/catalogue/visibility/grants/:grantId/revoke
// Body: { reason }
// Returns: AccessGrant
// Errors: 404 grant_not_found, 409 grant_not_active, 422 reason_required
// Notes: revoke is the only write an admin has over somebody else's access
//        list. Elanzia never ISSUES a grant - grantedBy is always the
//        manufacturer - because handing a third party the keys to a design
//        book we were only asked to store is not ours to do.
export function revokeAccessGrant({ grantId, reason } = {}) {
  const grant = grantRecords.find((row) => row.id === grantId);
  if (!grant) return mockError('grant_not_found', 'That access grant no longer exists', 404);
  if (grant.status !== 'active') {
    return mockError('grant_not_active', `That grant is already ${grant.status}`, 409);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Record why this access is being withdrawn', 422);
  }

  const updated = {
    ...grant,
    status: 'revoked',
    revokedAt: nowIso(),
    revokedReason: String(reason).trim(),
  };
  grantRecords = grantRecords.map((row) => (row.id === grantId ? updated : row));

  return mockRequest(updated);
}

// BACKEND CONTRACT
// POST /admin/catalogue/visibility/private-ranges/:manufacturerId/unseal
// Body: { reason }
// Returns: { manufacturerId, pieces: CatalogueRow[], unsealedAt, expiresAt,
//            logId }
// Errors: 404 range_not_found, 422 reason_required
// Permission: catalogue.private.unseal
// Notes: BREAK GLASS. This is the only endpoint in the visibility group that
//        returns a design, and every safeguard on it is deliberate:
//          - the reason must run to at least 20 characters, because "checking"
//            is not a reason somebody can be held to later
//          - it writes a PrivateViewLog row naming the admin and quoting the
//            reason, and that row is shown to the manufacturer
//          - the result carries expiresAt and the client must not persist it.
//            The range itself is never mutated, so a refresh re-seals
//        The manufacturer is notified. An admin who opens a design book and
//        expects nobody to know has misunderstood what they were given.
export function unsealPrivateRange({ manufacturerId, reason } = {}) {
  const range = rangeFor(manufacturerId);
  if (!range) return mockError('range_not_found', 'That manufacturer has no private range', 404);

  const written = String(reason ?? '').trim();
  if (written.length < UNSEAL_REASON_MIN_LENGTH) {
    return mockError(
      'reason_required',
      `Give at least ${UNSEAL_REASON_MIN_LENGTH} characters of justification. This is shown to ${range.manufacturerName}`,
      422,
    );
  }

  const log = {
    id: `PVL-UNS-${Date.now().toString(36)}`,
    manufacturerId,
    at: nowIso(),
    viewerType: 'admin',
    viewerId: actingAdmin.id,
    viewerName: actingAdmin.name,
    action: 'unsealed',
    grantId: null,
    reason: written,
  };
  viewLogRecords = [log, ...viewLogRecords];

  const request = {
    id: `UNS-${Date.now().toString(36)}`,
    manufacturerId,
    adminId: actingAdmin.id,
    adminName: actingAdmin.name,
    reason: written,
    requestedAt: nowIso(),
    expiresAt: new Date(Date.now() + UNSEAL_WINDOW_MINUTES * 60000).toISOString(),
    status: 'active',
  };
  unsealRecords = [request, ...unsealRecords];

  return mockRequest(() => ({
    manufacturerId,
    pieces: productRecords
      .filter((product) => product.manufacturerId === manufacturerId && product.visibility === 'private')
      .map(toCatalogueRow),
    unsealedAt: request.requestedAt,
    expiresAt: request.expiresAt,
    logId: log.id,
  }));
}
