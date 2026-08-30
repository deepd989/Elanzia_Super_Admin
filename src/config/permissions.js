// THE ROLE MATRIX.
//
// The definition of every permission in the portal, grouped by feature area.
// (The count in this comment has gone stale twice, so it no longer carries one.) This is platform truth, not data, so it sits beside navigation.js
// rather than in src/data/.
//
// Everything downstream reads from here:
//   - src/config/navigation.js  every nav item names the permission it needs
//   - src/layouts/AdminShell    renders only what the signed-in role can reach
//   - ADM-005                   shows what a given role's nav resolves to
//   - ADM-007                   renders its checkbox groups straight off this
//   - src/data/core/roles.js    each role is a list of ids from here
//
// A permission entry:
//   id          'module.thing.action'. The stable key. Never renamed.
//   label       i18n key for the checkbox label
//   description i18n key for the help line under it
//   implies     permissions that must be granted alongside this one
//   sensitive   true if granting it needs an explicit confirm

export const PERMISSION_MODULES = [
  {
    id: 'access',
    label: 'permissions.modules.access',
    permissions: [
      {
        id: 'access.view',
        label: 'permissions.access.view',
        description: 'permissions.access.viewHelp',
      },
      {
        id: 'access.staff.view',
        label: 'permissions.access.staffView',
        description: 'permissions.access.staffViewHelp',
        implies: ['access.view'],
      },
      {
        id: 'access.staff.manage',
        label: 'permissions.access.staffManage',
        description: 'permissions.access.staffManageHelp',
        implies: ['access.staff.view'],
        sensitive: true,
      },
      {
        id: 'access.roles.view',
        label: 'permissions.access.rolesView',
        description: 'permissions.access.rolesViewHelp',
        implies: ['access.view'],
      },
      {
        // A role that can edit roles can grant itself anything, so this is the
        // most sensitive permission in the portal.
        id: 'access.roles.manage',
        label: 'permissions.access.rolesManage',
        description: 'permissions.access.rolesManageHelp',
        implies: ['access.roles.view'],
        sensitive: true,
      },
      {
        id: 'access.impersonate',
        label: 'permissions.access.impersonate',
        description: 'permissions.access.impersonateHelp',
        implies: ['access.view'],
        sensitive: true,
      },
      {
        id: 'access.translations.view',
        label: 'permissions.access.translationsView',
        description: 'permissions.access.translationsViewHelp',
        implies: ['access.view'],
      },
      {
        id: 'access.translations.manage',
        label: 'permissions.access.translationsManage',
        description: 'permissions.access.translationsManageHelp',
        implies: ['access.translations.view'],
      },
    ],
  },

  {
    id: 'onboarding',
    label: 'permissions.modules.onboarding',
    permissions: [
      {
        id: 'onboarding.view',
        label: 'permissions.onboarding.view',
        description: 'permissions.onboarding.viewHelp',
      },
      {
        id: 'onboarding.verify',
        label: 'permissions.onboarding.verify',
        description: 'permissions.onboarding.verifyHelp',
        implies: ['onboarding.view'],
      },
      {
        // Approving an application a role cannot open is a broken role, not a
        // strict one, so approve pulls verify and view along with it.
        id: 'onboarding.approve',
        label: 'permissions.onboarding.approve',
        description: 'permissions.onboarding.approveHelp',
        implies: ['onboarding.verify'],
        sensitive: true,
      },
      {
        id: 'onboarding.reject',
        label: 'permissions.onboarding.reject',
        description: 'permissions.onboarding.rejectHelp',
        implies: ['onboarding.verify'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'manufacturers',
    label: 'permissions.modules.manufacturers',
    permissions: [
      {
        id: 'manufacturers.view',
        label: 'permissions.manufacturers.view',
        description: 'permissions.manufacturers.viewHelp',
      },
      {
        id: 'manufacturers.edit',
        label: 'permissions.manufacturers.edit',
        description: 'permissions.manufacturers.editHelp',
        implies: ['manufacturers.view'],
      },
      {
        // Commission is negotiated per manufacturer and decides what Elanzia
        // earns on every order they fulfil.
        id: 'manufacturers.commission.edit',
        label: 'permissions.manufacturers.commissionEdit',
        description: 'permissions.manufacturers.commissionEditHelp',
        implies: ['manufacturers.edit'],
        sensitive: true,
      },
      {
        id: 'manufacturers.suspend',
        label: 'permissions.manufacturers.suspend',
        description: 'permissions.manufacturers.suspendHelp',
        implies: ['manufacturers.edit'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'jewellers',
    label: 'permissions.modules.jewellers',
    permissions: [
      {
        id: 'jewellers.view',
        label: 'permissions.jewellers.view',
        description: 'permissions.jewellers.viewHelp',
      },
      {
        id: 'jewellers.edit',
        label: 'permissions.jewellers.edit',
        description: 'permissions.jewellers.editHelp',
        implies: ['jewellers.view'],
      },
      {
        // Extending credit is Elanzia's money at risk until the invoice clears.
        id: 'jewellers.credit.edit',
        label: 'permissions.jewellers.creditEdit',
        description: 'permissions.jewellers.creditEditHelp',
        implies: ['jewellers.edit'],
        sensitive: true,
      },
      {
        id: 'jewellers.suspend',
        label: 'permissions.jewellers.suspend',
        description: 'permissions.jewellers.suspendHelp',
        implies: ['jewellers.edit'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'catalogue',
    label: 'permissions.modules.catalogue',
    permissions: [
      {
        id: 'catalogue.view',
        label: 'permissions.catalogue.view',
        description: 'permissions.catalogue.viewHelp',
      },
      {
        id: 'catalogue.moderate',
        label: 'permissions.catalogue.moderate',
        description: 'permissions.catalogue.moderateHelp',
        implies: ['catalogue.view'],
      },
      {
        // Private pieces are shown to named jewellers only. Seeing them is a
        // separate grant because publishing one by mistake is unrecoverable.
        id: 'catalogue.private.view',
        label: 'permissions.catalogue.privateView',
        description: 'permissions.catalogue.privateViewHelp',
        implies: ['catalogue.view'],
        sensitive: true,
      },
      {
        id: 'catalogue.publish',
        label: 'permissions.catalogue.publish',
        description: 'permissions.catalogue.publishHelp',
        implies: ['catalogue.moderate'],
        sensitive: true,
      },
      {
        id: 'catalogue.archive',
        label: 'permissions.catalogue.archive',
        description: 'permissions.catalogue.archiveHelp',
        implies: ['catalogue.moderate'],
      },
      {
        // Correcting a manufacturer's listing rather than bouncing it back.
        // Every edit records a reason and lands in the product's audit trail.
        id: 'catalogue.edit',
        label: 'permissions.catalogue.edit',
        description: 'permissions.catalogue.editHelp',
        implies: ['catalogue.view'],
      },
      {
        // Auditing the certificates themselves, which is a different question
        // from whether a listing may publish. Catalogue moderation is a publish
        // gate; this is an estate-wide audit for duplicate HUIDs, hallmark
        // purity that disagrees with the declared purity, and expired stone
        // certificates.
        id: 'catalogue.certificates.audit',
        label: 'permissions.catalogue.certificatesAudit',
        description: 'permissions.catalogue.certificatesAuditHelp',
        implies: ['catalogue.view'],
      },
      {
        // Removing a jeweller's review is a different power from publishing a
        // listing, so it is a separate grant rather than folded into moderate.
        id: 'catalogue.reviews.moderate',
        label: 'permissions.catalogue.reviewsModerate',
        description: 'permissions.catalogue.reviewsModerateHelp',
        implies: ['catalogue.view'],
        sensitive: true,
      },
      {
        id: 'catalogue.taxonomy.manage',
        label: 'permissions.catalogue.taxonomyManage',
        description: 'permissions.catalogue.taxonomyManageHelp',
        implies: ['catalogue.view'],
      },
      {
        id: 'catalogue.attributes.manage',
        label: 'permissions.catalogue.attributesManage',
        description: 'permissions.catalogue.attributesManageHelp',
        implies: ['catalogue.view'],
      },
      {
        id: 'catalogue.media.manage',
        label: 'permissions.catalogue.mediaManage',
        description: 'permissions.catalogue.mediaManageHelp',
        implies: ['catalogue.view'],
      },
      {
        // The rate on an HSN code is the GST charged on every listing under
        // it, so this permission reaches further than the screen suggests.
        id: 'catalogue.hsn.manage',
        label: 'permissions.catalogue.hsnManage',
        description: 'permissions.catalogue.hsnManageHelp',
        implies: ['catalogue.view'],
        sensitive: true,
      },
      {
        // Blast radius is the whole catalogue in one press.
        id: 'catalogue.bulk',
        label: 'permissions.catalogue.bulk',
        description: 'permissions.catalogue.bulkHelp',
        implies: ['catalogue.publish', 'catalogue.archive'],
        sensitive: true,
      },
      {
        id: 'catalogue.ai.view',
        label: 'permissions.catalogue.aiView',
        description: 'permissions.catalogue.aiViewHelp',
        implies: ['catalogue.view'],
      },
      {
        id: 'catalogue.ai.review',
        label: 'permissions.catalogue.aiReview',
        description: 'permissions.catalogue.aiReviewHelp',
        implies: ['catalogue.ai.view', 'catalogue.moderate'],
      },
      {
        id: 'catalogue.ai.credits.manage',
        label: 'permissions.catalogue.aiCreditsManage',
        description: 'permissions.catalogue.aiCreditsManageHelp',
        implies: ['catalogue.ai.view'],
        sensitive: true,
      },
      {
        // Break glass on a manufacturer's sealed design book. Needs a written
        // reason, writes an audit row, and the manufacturer is told.
        id: 'catalogue.private.unseal',
        label: 'permissions.catalogue.privateUnseal',
        description: 'permissions.catalogue.privateUnsealHelp',
        implies: ['catalogue.private.view'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'marketplace',
    label: 'permissions.modules.marketplace',
    permissions: [
      {
        id: 'marketplace.view',
        label: 'permissions.marketplace.view',
        description: 'permissions.marketplace.viewHelp',
      },
      {
        id: 'marketplace.enquiries.view',
        label: 'permissions.marketplace.enquiriesView',
        description: 'permissions.marketplace.enquiriesViewHelp',
        implies: ['marketplace.view'],
      },
      {
        // Nudging posts a message into a conversation between two members
        // under Elanzia's name, so it is a grant of its own rather than
        // something reading the queue carries with it.
        id: 'marketplace.enquiries.nudge',
        label: 'permissions.marketplace.enquiriesNudge',
        description: 'permissions.marketplace.enquiriesNudgeHelp',
        implies: ['marketplace.enquiries.view'],
      },
      {
        id: 'marketplace.demand.view',
        label: 'permissions.marketplace.demandView',
        description: 'permissions.marketplace.demandViewHelp',
        implies: ['marketplace.view'],
      },
      {
        // Approving a microsite publishes a page to the open internet.
        id: 'marketplace.microsites.moderate',
        label: 'permissions.marketplace.micrositesModerate',
        description: 'permissions.marketplace.micrositesModerateHelp',
        implies: ['marketplace.view', 'catalogue.private.view'],
        sensitive: true,
      },
      {
        id: 'marketplace.sourcing.view',
        label: 'permissions.marketplace.sourcingView',
        description: 'permissions.marketplace.sourcingViewHelp',
        implies: ['marketplace.view'],
      },
      {
        // Routing puts a workshop in front of a jeweller with Elanzia's name
        // on the introduction.
        id: 'marketplace.sourcing.route',
        label: 'permissions.marketplace.sourcingRoute',
        description: 'permissions.marketplace.sourcingRouteHelp',
        implies: ['marketplace.sourcing.view', 'manufacturers.view'],
      },
    ],
  },

  {
    id: 'growth',
    label: 'permissions.modules.growth',
    permissions: [
      {
        id: 'growth.view',
        label: 'permissions.growth.view',
        description: 'permissions.growth.viewHelp',
      },
      {
        id: 'growth.invitations.view',
        label: 'permissions.growth.invitationsView',
        description: 'permissions.growth.invitationsViewHelp',
        implies: ['growth.view'],
      },
      {
        // Graduating a buyer opens the whole marketplace to somebody who has
        // only ever seen one workshop's catalogue.
        id: 'growth.invitations.manage',
        label: 'permissions.growth.invitationsManage',
        description: 'permissions.growth.invitationsManageHelp',
        implies: ['growth.invitations.view', 'jewellers.view'],
      },
      {
        id: 'growth.exhibitions.manage',
        label: 'permissions.growth.exhibitionsManage',
        description: 'permissions.growth.exhibitionsManageHelp',
        implies: ['growth.view'],
      },
      {
        id: 'growth.content.view',
        label: 'permissions.growth.contentView',
        description: 'permissions.growth.contentViewHelp',
        implies: ['growth.view'],
      },
      {
        id: 'growth.content.edit',
        label: 'permissions.growth.contentEdit',
        description: 'permissions.growth.contentEditHelp',
        implies: ['growth.content.view'],
      },
      {
        // Publishing writes to the open internet, and a crawler keeps what it
        // was shown. The same reason marketplace.microsites.moderate is
        // sensitive.
        id: 'growth.content.publish',
        label: 'permissions.growth.contentPublish',
        description: 'permissions.growth.contentPublishHelp',
        implies: ['growth.content.edit'],
        sensitive: true,
      },
      {
        // Curating pulls catalogue pieces onto a public surface, so it needs
        // to be able to see the catalogue it is pulling from.
        id: 'growth.collections.manage',
        label: 'permissions.growth.collectionsManage',
        description: 'permissions.growth.collectionsManageHelp',
        implies: ['growth.content.edit', 'catalogue.view'],
      },
      {
        // Switching the site to noindex takes it out of every search index.
        id: 'growth.seo.manage',
        label: 'permissions.growth.seoManage',
        description: 'permissions.growth.seoManageHelp',
        implies: ['growth.content.view'],
        sensitive: true,
      },
      {
        // A redirect can shadow a live page and take it off the internet
        // while it still reads as published in this portal.
        id: 'growth.redirects.manage',
        label: 'permissions.growth.redirectsManage',
        description: 'permissions.growth.redirectsManageHelp',
        implies: ['growth.seo.manage'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'orders',
    label: 'permissions.modules.orders',
    permissions: [
      {
        id: 'orders.view',
        label: 'permissions.orders.view',
        description: 'permissions.orders.viewHelp',
      },
      {
        id: 'orders.edit',
        label: 'permissions.orders.edit',
        description: 'permissions.orders.editHelp',
        implies: ['orders.view'],
      },
      {
        id: 'orders.cancel',
        label: 'permissions.orders.cancel',
        description: 'permissions.orders.cancelHelp',
        implies: ['orders.edit'],
        sensitive: true,
      },
      {
        id: 'orders.export',
        label: 'permissions.orders.export',
        description: 'permissions.orders.exportHelp',
        implies: ['orders.view'],
      },
    ],
  },

  {
    id: 'payments',
    label: 'permissions.modules.payments',
    permissions: [
      {
        id: 'payments.view',
        label: 'permissions.payments.view',
        description: 'permissions.payments.viewHelp',
      },
      {
        id: 'payments.reconcile',
        label: 'permissions.payments.reconcile',
        description: 'permissions.payments.reconcileHelp',
        implies: ['payments.view'],
      },
      {
        // Releasing a settlement moves real money out of the aggregator's
        // nodal account to a manufacturer. It cannot be undone from here.
        id: 'payments.settle',
        label: 'permissions.payments.settle',
        description: 'permissions.payments.settleHelp',
        implies: ['payments.reconcile'],
        sensitive: true,
      },
      {
        id: 'payments.export',
        label: 'permissions.payments.export',
        description: 'permissions.payments.exportHelp',
        implies: ['payments.view'],
      },
    ],
  },

  {
    id: 'tax',
    label: 'permissions.modules.tax',
    permissions: [
      {
        id: 'tax.view',
        label: 'permissions.tax.view',
        description: 'permissions.tax.viewHelp',
      },
      {
        // Retrying pushes a document to the government portal under Elanzia's
        // credentials. It is a filing action, not a screen refresh.
        id: 'tax.irn.retry',
        label: 'permissions.tax.irnRetry',
        description: 'permissions.tax.irnRetryHelp',
        implies: ['tax.view'],
      },
      {
        id: 'tax.ewaybill.manage',
        label: 'permissions.tax.ewaybillManage',
        description: 'permissions.tax.ewaybillManageHelp',
        implies: ['tax.view'],
      },
      {
        // The TCS report exposes every supplier's turnover through the
        // platform, which is commercially sensitive to all of them.
        id: 'tax.reports.view',
        label: 'permissions.tax.reportsView',
        description: 'permissions.tax.reportsViewHelp',
        implies: ['tax.view', 'reports.financial.view'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'returns',
    label: 'permissions.modules.returns',
    permissions: [
      {
        id: 'returns.view',
        label: 'permissions.returns.view',
        description: 'permissions.returns.viewHelp',
      },
      {
        id: 'returns.verify',
        label: 'permissions.returns.verify',
        description: 'permissions.returns.verifyHelp',
        implies: ['returns.view'],
      },
      {
        // No refund is processed before the return is verified, so the refund
        // grant cannot exist without the verify grant.
        id: 'returns.refund',
        label: 'permissions.returns.refund',
        description: 'permissions.returns.refundHelp',
        implies: ['returns.verify'],
        sensitive: true,
      },
      {
        id: 'returns.dispute.resolve',
        label: 'permissions.returns.disputeResolve',
        description: 'permissions.returns.disputeResolveHelp',
        implies: ['returns.view'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'logistics',
    label: 'permissions.modules.logistics',
    permissions: [
      {
        id: 'logistics.view',
        label: 'permissions.logistics.view',
        description: 'permissions.logistics.viewHelp',
      },
      {
        id: 'logistics.edit',
        label: 'permissions.logistics.edit',
        description: 'permissions.logistics.editHelp',
        implies: ['logistics.view'],
      },
      {
        id: 'logistics.dispatch',
        label: 'permissions.logistics.dispatch',
        description: 'permissions.logistics.dispatchHelp',
        implies: ['logistics.edit'],
      },
    ],
  },

  {
    id: 'pricing',
    label: 'permissions.modules.pricing',
    permissions: [
      {
        id: 'pricing.view',
        label: 'permissions.pricing.view',
        description: 'permissions.pricing.viewHelp',
      },
      {
        // The metal rate feeds every unconfirmed price on the marketplace.
        id: 'pricing.rates.edit',
        label: 'permissions.pricing.ratesEdit',
        description: 'permissions.pricing.ratesEditHelp',
        implies: ['pricing.view'],
        sensitive: true,
      },
      {
        id: 'pricing.making.edit',
        label: 'permissions.pricing.makingEdit',
        description: 'permissions.pricing.makingEditHelp',
        implies: ['pricing.view'],
      },
    ],
  },

  {
    id: 'reports',
    label: 'permissions.modules.reports',
    permissions: [
      {
        id: 'reports.view',
        label: 'permissions.reports.view',
        description: 'permissions.reports.viewHelp',
      },
      {
        id: 'reports.financial.view',
        label: 'permissions.reports.financialView',
        description: 'permissions.reports.financialViewHelp',
        implies: ['reports.view'],
        sensitive: true,
      },
      {
        id: 'reports.export',
        label: 'permissions.reports.export',
        description: 'permissions.reports.exportHelp',
        implies: ['reports.view'],
      },
    ],
  },

  {
    id: 'support',
    label: 'permissions.modules.support',
    permissions: [
      {
        id: 'support.view',
        label: 'permissions.support.view',
        description: 'permissions.support.viewHelp',
      },
      {
        id: 'support.respond',
        label: 'permissions.support.respond',
        description: 'permissions.support.respondHelp',
        implies: ['support.view'],
      },
      {
        id: 'support.escalate',
        label: 'permissions.support.escalate',
        description: 'permissions.support.escalateHelp',
        implies: ['support.respond'],
      },
    ],
  },

  {
    id: 'communications',
    label: 'permissions.modules.communications',
    permissions: [
      {
        id: 'communications.view',
        label: 'permissions.communications.view',
        description: 'permissions.communications.viewHelp',
      },
      {
        id: 'communications.templates.manage',
        label: 'permissions.communications.templatesManage',
        description: 'permissions.communications.templatesManageHelp',
        implies: ['communications.view'],
      },
      {
        // One press reaches every manufacturer and jeweller on the platform,
        // and nothing sent can be taken back.
        id: 'communications.broadcast.send',
        label: 'permissions.communications.broadcastSend',
        description: 'permissions.communications.broadcastSendHelp',
        implies: ['communications.view'],
        sensitive: true,
      },
    ],
  },

  {
    id: 'platform',
    label: 'permissions.modules.platform',
    permissions: [
      {
        id: 'platform.audit.view',
        label: 'permissions.platform.auditView',
        description: 'permissions.platform.auditViewHelp',
      },
      {
        id: 'platform.privacy.view',
        label: 'permissions.platform.privacyView',
        description: 'permissions.platform.privacyViewHelp',
      },
      {
        // Answering a data request hands a member their own trading history,
        // or refuses to. Neither can be taken back.
        id: 'platform.privacy.respond',
        label: 'permissions.platform.privacyRespond',
        description: 'permissions.platform.privacyRespondHelp',
        implies: ['platform.privacy.view'],
        sensitive: true,
      },
      {
        id: 'platform.settings.view',
        label: 'permissions.platform.settingsView',
        description: 'permissions.platform.settingsViewHelp',
      },
      {
        // These settings decide the commission rate, the return window and how
        // long the platform can answer for itself. One of them is wrong for
        // everybody at once.
        id: 'platform.settings.manage',
        label: 'permissions.platform.settingsManage',
        description: 'permissions.platform.settingsManageHelp',
        implies: ['platform.settings.view'],
        sensitive: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Derived lookups. Read these, never re-walk PERMISSION_MODULES.
// ---------------------------------------------------------------------------

export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((module) =>
  module.permissions.map((permission) => permission.id),
);

export const permissionById = Object.fromEntries(
  PERMISSION_MODULES.flatMap((module) =>
    module.permissions.map((permission) => [permission.id, { ...permission, moduleId: module.id }]),
  ),
);

export const moduleById = Object.fromEntries(
  PERMISSION_MODULES.map((module) => [module.id, module]),
);

// The reverse of `implies`: for a permission, which permissions pull it in.
// ADM-007 uses this to lock a checkbox that a granted child depends on.
export const dependentsByPermission = ALL_PERMISSIONS.reduce((map, id) => {
  map[id] = ALL_PERMISSIONS.filter((candidate) =>
    (permissionById[candidate].implies ?? []).includes(id),
  );
  return map;
}, {});

// Adds every implied permission, transitively. A stored role holds only what
// the admin ticked; this is what the app actually checks against.
export function expandPermissions(ids = []) {
  const expanded = new Set();

  const visit = (id) => {
    if (expanded.has(id)) return;
    const permission = permissionById[id];
    if (!permission) return; // an id removed from the matrix, ignore it
    expanded.add(id);
    (permission.implies ?? []).forEach(visit);
  };

  ids.forEach(visit);
  return [...expanded];
}

export function hasPermission(grantedPermissions = [], id) {
  return grantedPermissions.includes(id);
}

export function hasAnyPermission(grantedPermissions = [], ids = []) {
  return ids.some((id) => grantedPermissions.includes(id));
}

// Which currently granted permissions are forcing `id` to stay ticked. Empty
// means the checkbox is free to untick.
export function lockedBy(grantedPermissions = [], id) {
  return (dependentsByPermission[id] ?? []).filter((dependent) =>
    grantedPermissions.includes(dependent),
  );
}

export const SENSITIVE_PERMISSIONS = ALL_PERMISSIONS.filter(
  (id) => permissionById[id].sensitive,
);
