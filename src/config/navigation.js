// The ONLY place routes are registered.
//
// Adding a screen means adding an entry here and nothing else - the left nav,
// the breadcrumb trail and the router all read this file. A screen that is
// not listed here is not reachable.
//
// A section:
//   {
//     id:      stable key
//     label:   i18n key path, resolved with t() at render time
//     icon:    a lucide-react component
//     items:   [{ id, label, path, element, permission, icon, hidden }]
//   }
//
// `element` is a lazy import, so a feature area only ships when first visited.
//
// `permission` names the permission from src/config/permissions.js that a role
// must hold to reach the screen. The nav is permission keyed rather than role
// keyed because a custom role created in ADM-007 has no name the nav could
// match on - it has a permission set, and that is what the shell filters by.
// An item with no permission is open to every signed-in admin.

import {
  Activity, AreaChart, BadgeCheck, Banknote, Bell, Blocks, Boxes, Clock, Coins, FileText, GalleryHorizontalEnd, Gauge, Gem, Globe, Images, Inbox, Landmark, Languages, Layers, LayoutDashboard, LayoutGrid, LifeBuoy, ListTree, Lock, Megaphone, MessageSquareWarning, MessagesSquare, Package, Percent, Receipt, RefreshCw, Ruler, Scale, ScrollText, ShieldAlert, Search, SendHorizonal, Settings2, ShieldCheck, ShieldQuestion, Signpost, SlidersHorizontal, Sparkles, Store, Tent, TrendingUp, Truck, Undo2, UserCog, UserPlus, Users, Wallet, Wand2,
} from 'lucide-react';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPS: 'ops',
  FINANCE: 'finance',
  SUPPORT: 'support',
  CATALOGUE: 'catalogue',
};

export const ALL_ROLES = Object.values(ROLES);

export const navigation = [
  // First, so HomeRedirect lands every role in the control room. There is no
  // operations permission in src/config/permissions.js and there should not
  // be: the dashboard is a set of pointers, and each thing it points at is
  // already gated by that module's own permission.
  {
    id: 'operations',
    label: 'operations.navLabel',
    icon: LayoutDashboard,
    items: [
      {
        id: 'operations-overview',
        label: 'operations.overviewNavLabel',
        path: '/operations',
        icon: LayoutDashboard,
        permission: null,
        element: () => import('@/pages/Operations/ADM-010-OperationsOverview.jsx'),
      },
      {
        id: 'operations-search',
        label: 'operations.searchNavLabel',
        path: '/operations/search',
        icon: Search,
        permission: null,
        element: () => import('@/pages/Operations/ADM-011-GlobalSearch.jsx'),
      },
      {
        id: 'operations-alerts',
        label: 'operations.alertsNavLabel',
        path: '/operations/alerts',
        icon: Bell,
        permission: null,
        element: () => import('@/pages/Operations/ADM-012-AlertsQueue.jsx'),
      },
    ],
  },
  {
    id: 'onboarding',
    label: 'onboarding.navLabel',
    icon: BadgeCheck,
    items: [
      {
        id: 'onboarding-manufacturers',
        label: 'onboarding.manufacturersNavLabel',
        path: '/onboarding/applications',
        icon: Store,
        permission: 'onboarding.view',
        element: () => import('@/pages/Onboarding/ADM-013-ManufacturerApplications.jsx'),
      },
      {
        id: 'onboarding-verification',
        label: 'onboarding.verificationNavLabel',
        path: '/onboarding/applications/:manufacturerId',
        permission: 'onboarding.verify',
        // Reached from the application queue and from the alert feed, not
        // from the sidebar.
        hidden: true,
        element: () => import('@/pages/Onboarding/ADM-014-VerificationWorkspace.jsx'),
      },
      {
        id: 'onboarding-jewellers',
        label: 'onboarding.jewellersNavLabel',
        path: '/onboarding/jewellers',
        icon: Users,
        permission: 'onboarding.view',
        element: () => import('@/pages/Onboarding/ADM-015-JewellerApplications.jsx'),
      },
      {
        id: 'onboarding-jeweller-kyc',
        label: 'onboarding.kycNavLabel',
        path: '/onboarding/jewellers/:jewellerId',
        permission: 'onboarding.verify',
        // Reached from the KYC queue and from the alert feed.
        hidden: true,
        element: () => import('@/pages/Onboarding/ADM-016-JewellerKycWorkspace.jsx'),
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'catalogue.navLabel',
    icon: Gem,
    items: [
      {
        id: 'catalogue-moderation',
        label: 'catalogue.moderationNavLabel',
        path: '/catalogue/moderation',
        icon: Layers,
        permission: 'catalogue.moderate',
        element: () => import('@/pages/Catalogue/ADM-023-CatalogueModeration.jsx'),
      },
      {
        id: 'catalogue-product',
        label: 'catalogue.productNavLabel',
        path: '/catalogue/products/:productId',
        permission: 'catalogue.view',
        // Reached from the queue, from the Operations alerts feed and from
        // global search. Every one of the 60 product ids resolves here.
        hidden: true,
        element: () => import('@/pages/Catalogue/ADM-024-ProductReview.jsx'),
      },
      {
        id: 'catalogue-product-edit',
        label: 'catalogue.productEditNavLabel',
        path: '/catalogue/products/:productId/edit',
        permission: 'catalogue.edit',
        hidden: true,
        element: () => import('@/pages/Catalogue/ADM-025-ProductEdit.jsx'),
      },
      {
        id: 'catalogue-categories',
        label: 'catalogue.categoriesNavLabel',
        path: '/catalogue/categories',
        icon: ListTree,
        permission: 'catalogue.taxonomy.manage',
        element: () => import('@/pages/Catalogue/ADM-026-CategoryManagement.jsx'),
      },
      {
        id: 'catalogue-attributes',
        label: 'catalogue.attributesNavLabel',
        path: '/catalogue/attributes',
        icon: Boxes,
        permission: 'catalogue.attributes.manage',
        element: () => import('@/pages/Catalogue/ADM-027-AttributeSets.jsx'),
      },
      {
        id: 'catalogue-ai-jobs',
        label: 'catalogue.aiJobsNavLabel',
        path: '/catalogue/ai/jobs',
        icon: Wand2,
        permission: 'catalogue.ai.view',
        element: () => import('@/pages/Catalogue/ADM-028-AiListingJobs.jsx'),
      },
      {
        id: 'catalogue-ai-review',
        label: 'catalogue.aiReviewNavLabel',
        path: '/catalogue/ai/jobs/:jobId',
        permission: 'catalogue.ai.review',
        hidden: true,
        element: () => import('@/pages/Catalogue/ADM-029-AiListingReview.jsx'),
      },
      {
        id: 'catalogue-ai-credits',
        label: 'catalogue.aiCreditsNavLabel',
        path: '/catalogue/ai/credits',
        icon: Sparkles,
        permission: 'catalogue.ai.view',
        element: () => import('@/pages/Catalogue/ADM-030-AiCredits.jsx'),
      },
      {
        id: 'catalogue-visibility',
        label: 'catalogue.visibilityNavLabel',
        path: '/catalogue/visibility',
        icon: ShieldCheck,
        permission: 'catalogue.private.view',
        element: () => import('@/pages/Catalogue/ADM-031-VisibilityOversight.jsx'),
      },
      {
        id: 'catalogue-media',
        label: 'catalogue.mediaNavLabel',
        path: '/catalogue/media-standards',
        icon: Ruler,
        permission: 'catalogue.media.manage',
        element: () => import('@/pages/Catalogue/ADM-032-MediaStandards.jsx'),
      },
      {
        id: 'catalogue-hsn',
        label: 'catalogue.hsnNavLabel',
        path: '/catalogue/hsn',
        icon: Layers,
        permission: 'catalogue.hsn.manage',
        element: () => import('@/pages/Catalogue/ADM-033-HsnCodes.jsx'),
      },
      {
        id: 'catalogue-bulk',
        label: 'catalogue.bulkNavLabel',
        path: '/catalogue/bulk',
        icon: Boxes,
        permission: 'catalogue.bulk',
        element: () => import('@/pages/Catalogue/ADM-034-BulkActions.jsx'),
      },
    ],
  },
  {
    id: 'marketplace',
    label: 'marketplace.navLabel',
    icon: Store,
    items: [
      {
        id: 'marketplace-enquiries',
        label: 'marketplace.enquiriesNavLabel',
        path: '/marketplace/enquiries',
        icon: MessagesSquare,
        permission: 'marketplace.enquiries.view',
        element: () => import('@/pages/Marketplace/ADM-042-EnquiryOversight.jsx'),
      },
      {
        id: 'marketplace-stalled',
        label: 'marketplace.stalledNavLabel',
        path: '/marketplace/enquiries/stalled',
        icon: Clock,
        permission: 'marketplace.enquiries.view',
        element: () => import('@/pages/Marketplace/ADM-043-StalledConversations.jsx'),
      },
      {
        id: 'marketplace-microsites',
        label: 'marketplace.micrositesNavLabel',
        path: '/marketplace/microsites',
        icon: Globe,
        permission: 'marketplace.microsites.moderate',
        element: () => import('@/pages/Marketplace/ADM-044-MicrositeModeration.jsx'),
      },
      {
        id: 'marketplace-demand',
        label: 'marketplace.demandNavLabel',
        path: '/marketplace/demand',
        icon: TrendingUp,
        permission: 'marketplace.demand.view',
        element: () => import('@/pages/Marketplace/ADM-045-DemandInsights.jsx'),
      },
      {
        id: 'marketplace-sourcing',
        label: 'marketplace.sourcingNavLabel',
        path: '/marketplace/sourcing',
        icon: Search,
        permission: 'marketplace.sourcing.view',
        element: () => import('@/pages/Marketplace/ADM-046-SourcingQueue.jsx'),
      },
      {
        id: 'marketplace-sourcing-brief',
        label: 'marketplace.sourcingWorkspaceNavLabel',
        path: '/marketplace/sourcing/:requestId',
        permission: 'marketplace.sourcing.view',
        // Reached from the desk queue, not from the sidebar.
        hidden: true,
        element: () => import('@/pages/Marketplace/ADM-047-SourcingWorkspace.jsx'),
      },
    ],
  },
  {
    id: 'growth',
    label: 'growth.navLabel',
    icon: Megaphone,
    items: [
      {
        id: 'growth-invitations',
        label: 'growth.invitationsNavLabel',
        path: '/growth/invitations',
        icon: UserPlus,
        permission: 'growth.invitations.view',
        element: () => import('@/pages/Growth/ADM-072-InvitationOversight.jsx'),
      },
      {
        id: 'growth-exhibitions',
        label: 'growth.exhibitionsNavLabel',
        path: '/growth/exhibitions',
        icon: Tent,
        permission: 'growth.exhibitions.manage',
        element: () => import('@/pages/Growth/ADM-073-ExhibitionSetup.jsx'),
      },
      {
        id: 'growth-show-report',
        label: 'growth.showReportNavLabel',
        path: '/growth/exhibitions/:showId/report',
        permission: 'growth.exhibitions.manage',
        // Reached from the show, not from the sidebar.
        hidden: true,
        element: () => import('@/pages/Growth/ADM-074-ShowReporting.jsx'),
      },
      {
        id: 'growth-pages',
        label: 'growth.pagesNavLabel',
        path: '/growth/pages',
        icon: FileText,
        permission: 'growth.content.view',
        element: () => import('@/pages/Growth/ADM-075-CmsPages.jsx'),
      },
      {
        id: 'growth-page-editor',
        label: 'growth.pagesNavLabel',
        path: '/growth/pages/:pageId',
        permission: 'growth.content.view',
        // The same screen. The route exists so a page is linkable and the
        // breadcrumb resolves.
        hidden: true,
        element: () => import('@/pages/Growth/ADM-075-CmsPages.jsx'),
      },
      {
        id: 'growth-media',
        label: 'growth.mediaNavLabel',
        path: '/growth/media',
        icon: Images,
        permission: 'growth.content.view',
        element: () => import('@/pages/Growth/ADM-076-MediaLibrary.jsx'),
      },
      {
        id: 'growth-collections',
        label: 'growth.collectionsNavLabel',
        path: '/growth/collections',
        icon: LayoutGrid,
        permission: 'growth.collections.manage',
        element: () => import('@/pages/Growth/ADM-077-Collections.jsx'),
      },
      {
        id: 'growth-banners',
        label: 'growth.bannersNavLabel',
        path: '/growth/banners',
        icon: GalleryHorizontalEnd,
        permission: 'growth.collections.manage',
        element: () => import('@/pages/Growth/ADM-078-Banners.jsx'),
      },
      {
        id: 'growth-templates',
        label: 'growth.templatesNavLabel',
        path: '/growth/seo/templates',
        icon: Blocks,
        permission: 'growth.seo.manage',
        element: () => import('@/pages/Growth/ADM-079-PageTemplates.jsx'),
      },
      {
        id: 'growth-seo',
        label: 'growth.seoNavLabel',
        path: '/growth/seo',
        icon: Globe,
        permission: 'growth.seo.manage',
        element: () => import('@/pages/Growth/ADM-080-SeoSettings.jsx'),
      },
      {
        id: 'growth-redirects',
        label: 'growth.redirectsNavLabel',
        path: '/growth/redirects',
        icon: Signpost,
        permission: 'growth.redirects.manage',
        element: () => import('@/pages/Growth/ADM-081-Redirects.jsx'),
      },
    ],
  },
  {
    id: 'pricing',
    label: 'pricing.eyebrow',
    icon: Coins,
    items: [
      {
        id: 'metal-rates',
        label: 'pricing.ratesTitle',
        path: '/pricing/rates',
        icon: Coins,
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-035-MetalRateBoard.jsx'),
      },
      {
        id: 'rate-feeds',
        label: 'pricing.feedsTitle',
        path: '/pricing/feeds',
        icon: Activity,
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-036-RateFeedHealth.jsx'),
      },
      {
        id: 'rate-overrides',
        label: 'pricing.overridesTitle',
        path: '/pricing/overrides',
        icon: SlidersHorizontal,
        // Reading the audit trail is open to anyone who can see pricing.
        // Setting a rate by hand is gated inside the screen on
        // pricing.rates.edit, which is the sensitive grant.
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-037-ManualRateOverride.jsx'),
      },
      {
        id: 'purity-factors',
        label: 'pricing.factorsTitle',
        path: '/pricing/purity-factors',
        icon: Scale,
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-038-PurityFactors.jsx'),
      },
      {
        id: 'charge-rules',
        label: 'pricing.rulesTitle',
        path: '/pricing/charge-rules',
        icon: Percent,
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-039-ChargeAndCommissionRules.jsx'),
      },
      {
        id: 'rate-lock',
        label: 'pricing.policyTitle',
        path: '/pricing/rate-lock',
        icon: Lock,
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-040-RateLockAndTolerance.jsx'),
      },
      {
        id: 'bulk-refresh',
        label: 'pricing.refreshTitle',
        path: '/pricing/bulk-refresh',
        icon: RefreshCw,
        permission: 'pricing.view',
        element: () => import('@/pages/Pricing/ADM-041-BulkPriceRefresh.jsx'),
      },
    ],
  },
  {
    id: 'fulfilment-logistics',
    label: 'logistics.eyebrow',
    icon: Truck,
    items: [
      {
        id: 'logistics-console',
        label: 'logistics.shipmentsTitle',
        path: '/logistics/shipments',
        icon: Truck,
        permission: 'logistics.view',
        element: () => import('@/pages/Fulfilment/ADM-063-LogisticsConsole.jsx'),
      },
      {
        id: 'shipment-exceptions',
        label: 'logistics.exceptionsTitle',
        path: '/logistics/exceptions',
        icon: ShieldQuestion,
        permission: 'logistics.view',
        element: () => import('@/pages/Fulfilment/ADM-064-ShipmentExceptionQueue.jsx'),
      },
      {
        id: 'insurance-claims',
        label: 'logistics.claimsTitle',
        path: '/logistics/claims',
        icon: BadgeCheck,
        permission: 'logistics.view',
        element: () => import('@/pages/Fulfilment/ADM-068-InsuranceClaimsConsole.jsx'),
      },
      {
        id: 'returns-verification',
        label: 'logistics.returnsTitle',
        path: '/returns',
        icon: Undo2,
        // Reading the queue needs returns.view. Verifying a weigh-in and
        // releasing a refund are separate grants, checked inside the screen.
        permission: 'returns.view',
        element: () => import('@/pages/Fulfilment/ADM-069-ReturnsVerificationQueue.jsx'),
      },
    ],
  },
  {
    id: 'fulfilment-trust',
    label: 'trust.eyebrow',
    icon: Scale,
    items: [
      {
        id: 'dispute-console',
        label: 'trust.disputesTitle',
        path: '/trust/disputes',
        icon: Scale,
        permission: 'returns.view',
        element: () => import('@/pages/Fulfilment/ADM-065-DisputeConsole.jsx'),
      },
      {
        id: 'dispute-detail',
        label: 'trust.disputesTitle',
        path: '/trust/disputes/:disputeId',
        permission: 'returns.view',
        hidden: true,
        element: () => import('@/pages/Fulfilment/ADM-066-DisputeDetail.jsx'),
      },
      {
        id: 'dispute-resolution',
        label: 'trust.resolutionTitle',
        path: '/trust/disputes/:disputeId/resolution',
        // Deciding who pays is the sensitive grant, so the route is gated as
        // well as the button. Typing the URL is not a way around it.
        permission: 'returns.dispute.resolve',
        hidden: true,
        element: () => import('@/pages/Fulfilment/ADM-067-ResolutionRecording.jsx'),
      },
      {
        id: 'certificate-oversight',
        label: 'trust.certificatesTitle',
        path: '/trust/certificates',
        icon: BadgeCheck,
        permission: 'catalogue.certificates.audit',
        element: () => import('@/pages/Fulfilment/ADM-070-CertificateOversight.jsx'),
      },
      {
        id: 'review-moderation',
        label: 'trust.reviewsTitle',
        path: '/trust/reviews',
        icon: MessageSquareWarning,
        permission: 'catalogue.reviews.moderate',
        element: () => import('@/pages/Fulfilment/ADM-071-ReviewModeration.jsx'),
      },
    ],
  },
  {
    id: 'communications',
    label: 'communications.navLabel',
    icon: Megaphone,
    items: [
      {
        id: 'broadcast-console',
        label: 'communications.broadcastsNavLabel',
        path: '/communications/broadcasts',
        icon: Megaphone,
        permission: 'communications.view',
        element: () => import('@/pages/Communications/ADM-085-BroadcastConsole.jsx'),
      },
      {
        id: 'broadcast-compose',
        label: 'communications.composeNavLabel',
        path: '/communications/broadcasts/new',
        // Reached from the console, not from the sidebar.
        permission: 'communications.broadcast.send',
        hidden: true,
        element: () => import('@/pages/Communications/ADM-086-BroadcastComposer.jsx'),
      },
      {
        id: 'broadcast-edit',
        label: 'communications.composeNavLabel',
        path: '/communications/broadcasts/:broadcastId/edit',
        permission: 'communications.broadcast.send',
        hidden: true,
        element: () => import('@/pages/Communications/ADM-086-BroadcastComposer.jsx'),
      },
      {
        id: 'template-library',
        label: 'communications.templatesNavLabel',
        path: '/communications/templates',
        icon: FileText,
        permission: 'communications.templates.manage',
        element: () => import('@/pages/Communications/ADM-089-TemplateLibrary.jsx'),
      },
      {
        id: 'delivery-log',
        label: 'communications.deliveriesNavLabel',
        path: '/communications/deliveries',
        icon: SendHorizonal,
        permission: 'communications.view',
        element: () => import('@/pages/Communications/ADM-090-DeliveryLog.jsx'),
      },
    ],
  },
  {
    id: 'support',
    label: 'support.navLabel',
    icon: LifeBuoy,
    items: [
      {
        id: 'ticket-queue',
        label: 'support.ticketsNavLabel',
        path: '/support/tickets',
        icon: Inbox,
        permission: 'support.view',
        element: () => import('@/pages/Support/ADM-087-TicketQueue.jsx'),
      },
      {
        id: 'ticket-workspace',
        label: 'support.workspaceNavLabel',
        path: '/support/tickets/:ticketId',
        // Reached from the queue, not from the sidebar.
        permission: 'support.view',
        hidden: true,
        element: () => import('@/pages/Support/ADM-088-TicketWorkspace.jsx'),
      },
      {
        id: 'support-performance',
        label: 'support.performanceNavLabel',
        path: '/support/performance',
        icon: Gauge,
        permission: 'support.view',
        element: () => import('@/pages/Support/ADM-091-SupportPerformance.jsx'),
      },
    ],
  },
  {
    id: 'orders',
    label: 'orders.navLabel',
    icon: Package,
    items: [
      {
        id: 'order-console',
        label: 'orders.consoleNavLabel',
        path: '/orders',
        icon: Package,
        permission: 'orders.view',
        element: () => import('@/pages/Orders/ADM-048-OrderConsole.jsx'),
      },
      {
        id: 'einvoice-console',
        label: 'tax.einvoicesNavLabel',
        path: '/orders/invoices',
        icon: Receipt,
        permission: 'tax.view',
        // Lives under /orders because that is where the ADM-012 work queue has
        // linked since it shipped. Registering it anywhere else would leave a
        // dashboard tile pointing at a dead route.
        element: () => import('@/pages/Tax/ADM-053-EinvoiceConsole.jsx'),
      },
      {
        id: 'order-detail',
        label: 'orders.detailNavLabel',
        path: '/orders/:orderId',
        permission: 'orders.view',
        // Reached from the console and from the ADM-012 alert feed.
        hidden: true,
        element: () => import('@/pages/Orders/ADM-049-OrderDetail.jsx'),
      },
    ],
  },
  {
    id: 'payments',
    label: 'payments.navLabel',
    icon: Wallet,
    items: [
      {
        id: 'payments-reconciliation',
        label: 'payments.reconciliationNavLabel',
        path: '/payments/reconciliation',
        icon: Landmark,
        permission: 'payments.reconcile',
        element: () => import('@/pages/Payments/ADM-050-ReconciliationConsole.jsx'),
      },
      {
        id: 'payments-exceptions',
        label: 'payments.exceptionsNavLabel',
        path: '/payments/exceptions',
        icon: ScrollText,
        permission: 'payments.reconcile',
        element: () => import('@/pages/Payments/ADM-051-PaymentExceptions.jsx'),
      },
      {
        id: 'payments-manual',
        label: 'payments.manualNavLabel',
        path: '/payments/manual',
        icon: Wallet,
        permission: 'payments.reconcile',
        element: () => import('@/pages/Payments/ADM-052-ManualPaymentRecording.jsx'),
      },
      {
        id: 'settlement-runs',
        label: 'payments.settlementsNavLabel',
        path: '/payments/settlements',
        icon: Banknote,
        permission: 'payments.view',
        element: () => import('@/pages/Payments/ADM-054-SettlementRuns.jsx'),
      },
      {
        id: 'payout-failures',
        label: 'payments.payoutsNavLabel',
        path: '/payments/payouts',
        icon: Banknote,
        permission: 'payments.settle',
        element: () => import('@/pages/Payments/ADM-056-PayoutFailures.jsx'),
      },
      {
        id: 'refunds-console',
        label: 'payments.refundsNavLabel',
        path: '/payments/refunds',
        icon: Receipt,
        permission: 'returns.refund',
        element: () => import('@/pages/Payments/ADM-057-RefundsAndCreditNotes.jsx'),
      },
      {
        id: 'commission-config',
        label: 'payments.commissionNavLabel',
        path: '/payments/commission',
        icon: Percent,
        permission: 'manufacturers.commission.edit',
        element: () => import('@/pages/Payments/ADM-058-CommissionConfiguration.jsx'),
      },
      {
        id: 'membership-plans',
        label: 'payments.plansNavLabel',
        path: '/payments/plans',
        icon: FileText,
        permission: 'payments.settle',
        element: () => import('@/pages/Payments/ADM-062-MembershipPlans.jsx'),
      },
      {
        id: 'settlement-detail',
        label: 'payments.settlementDetailNavLabel',
        // Takes a settlement run id OR an order id, because the ADM-012 payout
        // alert links here with the order it failed against.
        path: '/payments/settlements/:settlementId',
        permission: 'payments.view',
        hidden: true,
        element: () => import('@/pages/Payments/ADM-055-SettlementDetail.jsx'),
      },
    ],
  },
  {
    id: 'tax',
    label: 'tax.navLabel',
    icon: Receipt,
    items: [
      {
        id: 'irn-failures',
        label: 'tax.irnFailuresNavLabel',
        path: '/tax/irn-failures',
        icon: ScrollText,
        permission: 'tax.irn.retry',
        element: () => import('@/pages/Tax/ADM-059-IrnFailureQueue.jsx'),
      },
      {
        id: 'eway-bills',
        label: 'tax.ewayNavLabel',
        path: '/tax/eway-bills',
        icon: Truck,
        permission: 'tax.ewaybill.manage',
        element: () => import('@/pages/Tax/ADM-060-EwayBills.jsx'),
      },
      {
        id: 'tax-reports',
        label: 'tax.reportsNavLabel',
        path: '/tax/reports',
        icon: Percent,
        permission: 'tax.reports.view',
        element: () => import('@/pages/Tax/ADM-061-TaxReports.jsx'),
      },
    ],
  },
  {
    id: 'access',
    label: 'access.eyebrow',
    icon: ShieldCheck,
    items: [
      {
        id: 'admin-profile',
        label: 'access.profileTitle',
        path: '/settings/profile',
        icon: UserCog,
        // Every admin can reach their own profile, whatever their role.
        permission: null,
        element: () => import('@/pages/Access/ADM-004-AdminProfile.jsx'),
      },
      {
        id: 'staff-directory',
        label: 'access.staffTitle',
        path: '/access/users',
        icon: Users,
        permission: 'access.staff.view',
        element: () => import('@/pages/Access/ADM-006-StaffDirectory.jsx'),
      },
      {
        id: 'role-editor',
        label: 'access.roleEditorTitle',
        path: '/access/roles/:roleId',
        permission: 'access.roles.view',
        // Reached from the Roles tab of ADM-006, not from the sidebar.
        hidden: true,
        element: () => import('@/pages/Access/ADM-007-RoleEditor.jsx'),
      },
      {
        id: 'nav-preview',
        label: 'access.navPreviewTitle',
        path: '/access/navigation',
        icon: ShieldCheck,
        permission: 'access.roles.view',
        element: () => import('@/pages/Access/ADM-005-RoleNavigationShell.jsx'),
      },
      {
        id: 'impersonation',
        label: 'access.impersonateTitle',
        path: '/access/assist',
        icon: UserCog,
        permission: 'access.impersonate',
        element: () => import('@/pages/Access/ADM-008-ImpersonateAndAssist.jsx'),
      },
      {
        id: 'translations',
        label: 'access.translationsTitle',
        path: '/access/translations',
        icon: Languages,
        permission: 'access.translations.view',
        element: () => import('@/pages/Access/ADM-009-TranslationWorkbench.jsx'),
      },
    ],
  },

  {
    id: 'reports',
    label: 'reports.navLabel',
    icon: AreaChart,
    items: [
      {
        id: 'reports-overview',
        label: 'reports.overviewNavLabel',
        path: '/reports',
        icon: LayoutDashboard,
        permission: 'reports.view',
        element: () => import('@/pages/Reporting/ADM-092-ReportsOverview.jsx'),
      },
      {
        id: 'reports-marketplace',
        label: 'reports.marketplaceNavLabel',
        path: '/reports/marketplace',
        icon: TrendingUp,
        permission: 'reports.view',
        element: () => import('@/pages/Reporting/ADM-093-MarketplaceMetrics.jsx'),
      },
      {
        id: 'reports-financial',
        label: 'reports.financialNavLabel',
        path: '/reports/financial',
        icon: Landmark,
        // Commission, payouts and the nodal balance. Narrower than reports.view
        // on purpose - reading the money is not the same as reading the trade.
        permission: 'reports.financial.view',
        element: () => import('@/pages/Reporting/ADM-094-FinancialReporting.jsx'),
      },
      {
        id: 'reports-manufacturers',
        label: 'reports.manufacturersNavLabel',
        path: '/reports/manufacturers',
        icon: BadgeCheck,
        permission: 'reports.view',
        element: () => import('@/pages/Reporting/ADM-098-ManufacturerPerformanceReport.jsx'),
      },
      {
        id: 'reports-audit',
        label: 'reports.auditNavLabel',
        path: '/reports/audit',
        icon: ScrollText,
        permission: 'platform.audit.view',
        element: () => import('@/pages/Reporting/ADM-099-AuditLogViewer.jsx'),
      },
    ],
  },

  {
    id: 'platform',
    label: 'platform.navLabel',
    icon: SlidersHorizontal,
    items: [
      {
        id: 'platform-exports',
        label: 'platform.exportsNavLabel',
        path: '/platform/exports',
        icon: FileText,
        permission: 'reports.export',
        element: () => import('@/pages/Reporting/ADM-095-ExportCentre.jsx'),
      },
      {
        id: 'platform-privacy',
        label: 'platform.privacyNavLabel',
        path: '/platform/privacy',
        icon: ShieldAlert,
        permission: 'platform.privacy.view',
        element: () => import('@/pages/Reporting/ADM-096-ConsentAndDataRequests.jsx'),
      },
      {
        id: 'platform-settings',
        label: 'platform.settingsNavLabel',
        path: '/platform/settings',
        icon: Settings2,
        permission: 'platform.settings.view',
        element: () => import('@/pages/Reporting/ADM-097-SystemSettings.jsx'),
      },
    ],
  },
];

// Unauthenticated screens. They render OUTSIDE AdminShell - a sign-in page
// that paints a nav and a breadcrumb is showing the shape of a portal to
// somebody who has not proved who they are.
export const authRoutes = [
  {
    id: 'sign-in',
    path: '/sign-in',
    label: 'access.signInTitle',
    element: () => import('@/pages/Access/ADM-001-AdminLogin.jsx'),
  },
  {
    id: 'sign-in-verify',
    path: '/sign-in/verify',
    label: 'access.twoFactorTitle',
    element: () => import('@/pages/Access/ADM-002-TwoFactorChallenge.jsx'),
  },
  {
    id: 'password-reset',
    path: '/reset-password',
    label: 'access.resetTitle',
    element: () => import('@/pages/Access/ADM-003-PasswordReset.jsx'),
  },
];

// Routes inside the shell but outside the nav: the gallery, error pages.
export const standaloneRoutes = [
  {
    id: 'gallery',
    path: '/gallery',
    label: 'gallery.title',
    permission: null,
    element: () => import('@/pages/Gallery/Gallery.jsx'),
  },
];

// ---------------------------------------------------------------------------
// Derived helpers. Screens and the shell read these, never the raw arrays.
// ---------------------------------------------------------------------------

function isGranted(item, grantedPermissions) {
  return !item.permission || grantedPermissions.includes(item.permission);
}

// What the left nav renders for a set of granted permissions. The same
// computation ADM-005 shows through the API, so if the two ever disagree one
// of them has a bug.
export function sectionsForPermissions(grantedPermissions = []) {
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.hidden && isGranted(item, grantedPermissions),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function allRoutes() {
  const navRoutes = navigation.flatMap((section) =>
    section.items.map((item) => ({ ...item, sectionId: section.id })),
  );
  return [...navRoutes, ...standaloneRoutes];
}

// Every permission that unlocks at least one screen. ADM-005 uses this to say
// which grants actually change what a role can reach.
export const NAVIGABLE_PERMISSIONS = [
  ...new Set(
    navigation.flatMap((section) =>
      section.items.map((item) => item.permission).filter(Boolean),
    ),
  ),
];

// Longest matching path wins, so /roles/:id resolves to the detail entry
// rather than a list entry above it.
export function findRoute(pathname) {
  const segments = pathname.split('/').filter(Boolean);

  return allRoutes()
    .filter((route) => {
      const routeSegments = route.path.split('/').filter(Boolean);
      if (routeSegments.length > segments.length) return false;
      return routeSegments.every(
        (segment, index) => segment.startsWith(':') || segment === segments[index],
      );
    })
    .sort((a, b) => b.path.length - a.path.length)[0];
}

// [{ label, path }] from the section down to the current screen.
export function breadcrumbFor(pathname) {
  const route = findRoute(pathname);
  if (!route) return [];

  const section = navigation.find((candidate) =>
    candidate.items?.some((item) => item.id === route.id),
  );

  const trail = [];
  if (section) trail.push({ label: section.label, path: section.items[0]?.path });
  trail.push({ label: route.label, path: route.path });
  return trail;
}
