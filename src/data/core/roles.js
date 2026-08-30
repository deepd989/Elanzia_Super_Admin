// CANONICAL FIXTURE - the roles an Elanzia staff account can hold.
// Every feature fixture references these by id. Never invent a new role id in
// a feature fixture file.
//
// `permissions` holds only what an admin ticked. The implied parents are added
// at read time by expandPermissions() from src/config/permissions.js, so the
// stored role and the checkbox grid always agree.
//
// System roles cannot be renamed, re-scoped or deleted. Custom roles are what
// ADM-007 creates, and they exist here so the role list has real rows on day
// one rather than only the five built-ins.

import { ALL_PERMISSIONS } from '@/config/permissions';

export const roles = [
  {
    id: 'super_admin',
    name: 'Super admin',
    description: 'Unrestricted access to every module, including role management.',
    isSystem: true,
    // The only role that is defined as "everything", so a new permission added
    // to the matrix reaches super admins without anyone editing this file.
    permissions: ALL_PERMISSIONS,
    createdAt: '2024-04-01T05:30:00.000Z',
    updatedAt: '2024-04-01T05:30:00.000Z',
    createdBy: null, // seeded with the platform
  },
  {
    id: 'ops',
    name: 'Operations',
    description: 'Runs onboarding, catalogue moderation and the order desk.',
    isSystem: true,
    permissions: [
      'onboarding.approve',
      'onboarding.reject',
      'manufacturers.suspend',
      'jewellers.suspend',
      'catalogue.publish',
      'catalogue.archive',
      'orders.cancel',
      'orders.export',
      'logistics.dispatch',
      'returns.verify',
      'support.view',
      'reports.view',
      // The marketplace desk sits with operations: chasing a silent
      // conversation and routing a sourcing brief are both order-desk work.
      'marketplace.enquiries.nudge',
      'marketplace.sourcing.route',
      // Operations dispatches the goods, so it owns the document that has to
      // travel with them and stay valid the whole way.
      'tax.ewaybill.manage',
    ],
    createdAt: '2024-04-01T05:30:00.000Z',
    updatedAt: '2025-11-18T09:12:00.000Z',
    createdBy: null,
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Reconciles payments, releases settlements and processes refunds.',
    isSystem: true,
    permissions: [
      'payments.settle',
      'payments.export',
      'returns.refund',
      'returns.dispute.resolve',
      'orders.view',
      'orders.export',
      'manufacturers.commission.edit',
      'jewellers.credit.edit',
      'reports.financial.view',
      'reports.export',
      // ADM-040 is the treasury policy: how long a rate is locked and how far
      // it may move before the platform stops absorbing it. That is finance's
      // document, so finance has to be able to read it.
      'pricing.view',
      // The returns are finance work too. GSTR-8 is filed off the same numbers
      // this team reconciles, so splitting the two across roles would mean
      // filing from a screen nobody on the filing team can open.
      'tax.reports.view',
      'tax.irn.retry',
    ],
    createdAt: '2024-04-01T05:30:00.000Z',
    updatedAt: '2026-02-02T11:40:00.000Z',
    createdBy: null,
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Answers jeweller and manufacturer queries, and assists them in their panel.',
    isSystem: true,
    permissions: [
      'support.escalate',
      'access.impersonate',
      'orders.view',
      'jewellers.view',
      'manufacturers.view',
      'returns.view',
      'logistics.view',
      // Support reads conversations to answer "where is my quote", but cannot
      // post into one under the Elanzia name.
      'marketplace.enquiries.view',
    ],
    createdAt: '2024-04-01T05:30:00.000Z',
    updatedAt: '2025-08-22T07:05:00.000Z',
    createdBy: null,
  },
  {
    id: 'catalogue',
    name: 'Catalogue',
    description: 'Moderates listings, media and making charge bands.',
    isSystem: true,
    permissions: [
      'catalogue.publish',
      'catalogue.archive',
      'catalogue.private.view',
      'catalogue.edit',
      'catalogue.taxonomy.manage',
      'catalogue.attributes.manage',
      'catalogue.media.manage',
      'catalogue.ai.review',
      // Curating an edit and merchandising it is the same desk as moderating
      // the catalogue it draws from.
      'growth.collections.manage',
      'growth.content.publish',
      'growth.exhibitions.manage',
      // Not granted: seo.manage and redirects.manage. Both reach past the
      // catalogue to the whole site, and a redirect can take a live page off
      // the internet.
      // Certificate audit and review moderation are trust work on the
      // catalogue's own estate, so they sit with the team that already owns
      // listing quality.
      'catalogue.certificates.audit',
      'catalogue.reviews.moderate',
      // Not granted: hsn.manage, bulk, ai.credits.manage and private.unseal.
      // Each of those either moves tax, touches the whole catalogue at once or
      // opens a manufacturer's sealed design book, and none of them is
      // day-to-day catalogue work.
      'pricing.making.edit',
      'manufacturers.view',
      'reports.view',
      // A public manufacturer page is catalogue work, and the demand gaps are
      // what tells this team which categories to go and fill.
      'marketplace.microsites.moderate',
      'marketplace.demand.view',
      // Member facing copy is a catalogue responsibility, not a super admin
      // one. Without this nobody but a super admin could fix a mistranslated
      // product label.
      'access.translations.manage',
    ],
    createdAt: '2024-04-01T05:30:00.000Z',
    updatedAt: '2026-05-14T06:20:00.000Z',
    createdBy: null,
  },

  // ---- Custom roles, created through ADM-007 -----------------------------
  {
    // Junior reviewers gather and check documents; a senior approves. Splitting
    // verify from approve is the whole reason the matrix is per-permission and
    // not per-role.
    id: 'onboarding_reviewer',
    name: 'Onboarding reviewer',
    description: 'Verifies application documents but cannot approve or reject.',
    isSystem: false,
    permissions: ['onboarding.verify', 'manufacturers.view', 'jewellers.view'],
    createdAt: '2025-09-03T10:15:00.000Z',
    updatedAt: '2026-06-11T08:45:00.000Z',
    createdBy: 'STF-001',
  },
  {
    id: 'settlement_approver',
    name: 'Settlement approver',
    description: 'Releases settlement runs and reads financial reports. No order access.',
    isSystem: false,
    permissions: ['payments.settle', 'reports.financial.view', 'payments.export', 'tax.reports.view'],
    createdAt: '2026-01-19T12:00:00.000Z',
    updatedAt: '2026-01-19T12:00:00.000Z',
    createdBy: 'STF-002',
  },
  {
    id: 'regional_support_lead',
    name: 'Regional support lead',
    description: 'Support with jeweller credit visibility, for the western region desk.',
    isSystem: false,
    permissions: ['support.escalate', 'access.impersonate', 'jewellers.edit', 'orders.view'],
    createdAt: '2026-04-27T09:30:00.000Z',
    updatedAt: '2026-07-30T13:22:00.000Z',
    createdBy: 'STF-001',
  },
];

export const roleById = Object.fromEntries(roles.map((role) => [role.id, role]));

export default roles;
