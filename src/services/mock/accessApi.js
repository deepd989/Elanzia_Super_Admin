// Mock API for Access and shell.
//
// ENTITY SHAPES referenced by the contracts below:
//
// AdminUser: { id, name, email, phone, roleId, roleName, designation, city,
//              status: 'active'|'invited'|'deactivated'|'locked',
//              twoFactorEnabled: boolean,
//              twoFactorMethod: 'authenticator'|'sms'|null,
//              locale: 'en'|'hi'|'gu', lastSignInAt: ISO|null, createdAt: ISO,
//              invitedAt: ISO|null, inviteExpiresAt: ISO|null,
//              lockedUntil: ISO|null, deactivatedAt: ISO|null,
//              deactivationReason: string|null }
//
// AdminProfile: AdminUser + { timezone, grantedPermissions: string[],
//                             notificationPreferences: NotificationPreference[] }
//
// NotificationPreference: { id, label, description, module,
//                           channels: { email, sms, inApp }, alwaysOn?: boolean }
//
// Role: { id, name, description, isSystem: boolean, permissions: string[],
//         memberCount: number, createdAt, updatedAt, createdBy: AdminUser.id|null }
//   `permissions` is what was ticked. Implied parents are added by the client
//   via expandPermissions(); the server must apply the same expansion.
//
// PermissionModule: { id, label, permissions: [{ id, label, description,
//                     implies: string[], sensitive: boolean }] }
//
// ImpersonationTarget: { id, targetType: 'manufacturer'|'jeweller',
//                        businessName, contactName, city, email,
//                        status, panelPath, lastActiveAt: ISO|null }
//
// ImpersonationSession: { id, adminId, adminName, targetType, targetId,
//                         targetName, reason, mode: 'read_only'|'assist',
//                         startedAt: ISO, endedAt: ISO|null, durationMinutes,
//                         actionsTaken: number }
//
// TranslationEntry: { key, module, sourceText, locale, value: string|null,
//                     state: 'translated'|'missing'|'draft'|'stale',
//                     updatedAt: ISO|null, updatedBy: AdminUser.id|null }

import { MockApiError, mockRequest, queryCollection } from './_client';
import { adminUsers, roles } from '@/data/core';
import {
  PERMISSION_MODULES,
  expandPermissions,
  permissionById,
} from '@/config/permissions';
import { navigation } from '@/config/navigation';
import {
  LOCKOUT_MINUTES,
  MAX_SIGN_IN_ATTEMPTS,
  OTP_TTL_SECONDS,
  demoCredentials,
  impersonationSessions,
  impersonationTargets,
  locales,
  notificationPreferences,
  translationEntries,
} from '@/data/accessFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let staffRecords = adminUsers.map((user) => ({ ...user }));
let roleRecords = roles.map((role) => ({ ...role, permissions: [...role.permissions] }));
let sessionRecords = impersonationSessions.map((session) => ({ ...session }));
let translationRecords = translationEntries.map((entry) => ({
  ...entry,
  values: { ...entry.values },
  states: { ...entry.states },
}));

// In-flight sign-in and password-reset challenges, keyed by challengeId.
const challenges = new Map();

// The signed-in admin. Set by verifyTwoFactor, read by the /me endpoints.
let currentUserId = null;

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

// Rejects after the same latency a success would take, so the loading state is
// exercised on the failure path too. mockRequest cannot carry a thrown error
// out of its data callback, so the throw goes in a .then instead.
function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

function nowIso() {
  return new Date().toISOString();
}

function inSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function newId(prefix, length = 12) {
  return `${prefix}_${Math.random().toString(36).slice(2, 2 + length)}`;
}

const isEmail = (value) => String(value).includes('@');

function findByIdentifier(identifier) {
  const needle = String(identifier ?? '').trim().toLowerCase();
  if (!needle) return null;
  return staffRecords.find((user) =>
    isEmail(needle)
      ? user.email.toLowerCase() === needle
      : user.phone.replace(/\D/g, '').slice(-10) === needle.replace(/\D/g, '').slice(-10),
  );
}

// '+91 98765 ***10' and 'r****h.soni@elanzia.com'. The full destination is
// never returned to an unauthenticated caller.
function maskDestination(user, method) {
  if (method === 'sms' || !isEmail(user.email)) {
    const digits = user.phone.replace(/\D/g, '').slice(-10);
    return `+91 ${digits.slice(0, 5)} ***${digits.slice(8)}`;
  }
  const [local, domain] = user.email.split('@');
  return `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local.slice(-1)}@${domain}`;
}

function withRoleName(user) {
  const role = roleRecords.find((candidate) => candidate.id === user.roleId);
  return { ...user, roleName: role?.name ?? null };
}

function grantedFor(roleId) {
  const role = roleRecords.find((candidate) => candidate.id === roleId);
  return role ? expandPermissions(role.permissions) : [];
}

function roleWithMembers(role) {
  return {
    ...role,
    memberCount: staffRecords.filter(
      (user) => user.roleId === role.id && user.status !== 'deactivated',
    ).length,
  };
}

// ---------------------------------------------------------------------------
// Authentication - ADM-001, ADM-002, ADM-003
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// POST /admin/auth/sign-in
// Body: { identifier, password, method: 'password'|'otp' }
// Returns: { challengeId: string, nextStep: 'otp_sent'|'two_factor',
//            method, maskedDestination, codeExpiresAt: ISO,
//            attemptsRemaining: number }
// Errors: 401 invalid_credentials, 403 account_deactivated,
//         423 account_locked, 403 invite_pending
// Notes: `identifier` is an email address or a 10 digit mobile number, and the
//        server must accept either. 2FA is mandatory for every admin role, so
//        a successful password check never returns a token here - it always
//        advances to a challenge. With method 'otp' no password is required
//        and the flow goes through otp_sent first.
export function signIn({ identifier, password, method = 'password' }) {
  const user = findByIdentifier(identifier);

  if (!user) return mockError('invalid_credentials', 'Those details do not match an account', 401);

  if (user.status === 'deactivated') {
    return mockError('account_deactivated', 'This account has been deactivated', 403);
  }
  if (user.status === 'invited') {
    return mockError('invite_pending', 'Accept the emailed invite before signing in', 403);
  }
  if (user.status === 'locked' && Date.parse(user.lockedUntil) > Date.now()) {
    return mockError('account_locked', 'Too many failed attempts. Try again later', 423);
  }
  if (method === 'password' && password !== demoCredentials.password) {
    return mockError('invalid_credentials', 'Those details do not match an account', 401);
  }

  const challengeId = newId('chl');
  const nextStep = method === 'otp' ? 'otp_sent' : 'two_factor';

  challenges.set(challengeId, {
    userId: user.id,
    kind: 'sign_in',
    stage: nextStep,
    expiresAt: inSeconds(OTP_TTL_SECONDS),
    attemptsRemaining: MAX_SIGN_IN_ATTEMPTS,
  });

  return mockRequest({
    challengeId,
    nextStep,
    method,
    maskedDestination: maskDestination(user, method === 'otp' ? 'sms' : 'email'),
    twoFactorMethod: user.twoFactorMethod,
    codeExpiresAt: inSeconds(OTP_TTL_SECONDS),
    attemptsRemaining: MAX_SIGN_IN_ATTEMPTS,
  });
}

// BACKEND CONTRACT
// POST /admin/auth/otp/verify
// Body: { challengeId, code }
// Returns: { challengeId, nextStep: 'two_factor', twoFactorMethod, codeExpiresAt }
// Errors: 400 otp_incorrect, 410 otp_expired, 404 challenge_not_found
// Notes: passing the OTP still does not sign anyone in. It advances the same
//        challengeId to the mandatory 2FA stage.
export function verifyOtp({ challengeId, code }) {
  const challenge = challenges.get(challengeId);
  if (!challenge) return mockError('challenge_not_found', 'Start again from sign in', 404);
  if (Date.parse(challenge.expiresAt) < Date.now()) {
    return mockError('otp_expired', 'That code has expired', 410);
  }
  if (code !== demoCredentials.otpCode) {
    challenge.attemptsRemaining -= 1;
    if (challenge.attemptsRemaining <= 0) {
      challenges.delete(challengeId);
      return mockError('account_locked', 'Too many failed attempts', 423);
    }
    return mockError('otp_incorrect', 'That code is not correct', 400);
  }

  const user = staffRecords.find((candidate) => candidate.id === challenge.userId);
  challenge.stage = 'two_factor';
  challenge.expiresAt = inSeconds(OTP_TTL_SECONDS);

  return mockRequest({
    challengeId,
    nextStep: 'two_factor',
    twoFactorMethod: user.twoFactorMethod,
    codeExpiresAt: challenge.expiresAt,
  });
}

// BACKEND CONTRACT
// POST /admin/auth/otp/resend
// Body: { challengeId }
// Returns: { challengeId, codeExpiresAt: ISO, maskedDestination }
// Errors: 404 challenge_not_found, 429 resend_too_soon
// Notes: resetting the expiry also resets attemptsRemaining.
export function resendOtp({ challengeId }) {
  const challenge = challenges.get(challengeId);
  if (!challenge) return mockError('challenge_not_found', 'Start again from sign in', 404);

  const user = staffRecords.find((candidate) => candidate.id === challenge.userId);
  challenge.expiresAt = inSeconds(OTP_TTL_SECONDS);
  challenge.attemptsRemaining = MAX_SIGN_IN_ATTEMPTS;

  return mockRequest({
    challengeId,
    codeExpiresAt: challenge.expiresAt,
    maskedDestination: maskDestination(user, 'sms'),
  });
}

// BACKEND CONTRACT
// POST /admin/auth/2fa/verify
// Body: { challengeId, code }
// Returns: { token: string, user: AdminUser, role: Role,
//            grantedPermissions: string[] }
// Errors: 400 two_factor_incorrect, 410 challenge_expired,
//         404 challenge_not_found, 423 account_locked
// Notes: this is the only endpoint in the portal that issues a token.
//        grantedPermissions is already expanded through `implies` - the client
//        must not have to work out that approve entails view.
export function verifyTwoFactor({ challengeId, code }) {
  const challenge = challenges.get(challengeId);
  if (!challenge) return mockError('challenge_not_found', 'Start again from sign in', 404);
  if (Date.parse(challenge.expiresAt) < Date.now()) {
    return mockError('challenge_expired', 'That challenge has expired', 410);
  }
  if (code !== demoCredentials.twoFactorCode) {
    challenge.attemptsRemaining -= 1;
    if (challenge.attemptsRemaining <= 0) {
      const user = staffRecords.find((candidate) => candidate.id === challenge.userId);
      user.status = 'locked';
      user.lockedUntil = inSeconds(LOCKOUT_MINUTES * 60);
      challenges.delete(challengeId);
      return mockError('account_locked', 'Too many failed attempts. The account is locked', 423);
    }
    return mockError('two_factor_incorrect', 'That code is not correct', 400);
  }

  const user = staffRecords.find((candidate) => candidate.id === challenge.userId);
  const role = roleRecords.find((candidate) => candidate.id === user.roleId);
  challenges.delete(challengeId);
  currentUserId = user.id;
  user.lastSignInAt = nowIso();

  return mockRequest({
    token: newId('tok', 24),
    user: withRoleName(user),
    role: roleWithMembers(role),
    grantedPermissions: expandPermissions(role.permissions),
  });
}

// BACKEND CONTRACT
// POST /admin/auth/password/reset-request
// Body: { identifier }
// Returns: { resetToken, maskedDestination, codeExpiresAt: ISO }
// Errors: none for an unknown identifier
// Notes: an unknown identifier returns 200 with a masked destination anyway.
//        Telling an anonymous caller which addresses have admin accounts is an
//        account enumeration hole, so the response never varies.
export function requestPasswordReset({ identifier }) {
  const user = findByIdentifier(identifier);
  const resetToken = newId('rst');

  if (user) {
    challenges.set(resetToken, {
      userId: user.id,
      kind: 'password_reset',
      stage: 'reset_sent',
      expiresAt: inSeconds(OTP_TTL_SECONDS * 5),
      attemptsRemaining: MAX_SIGN_IN_ATTEMPTS,
    });
  }

  return mockRequest({
    resetToken,
    maskedDestination: user
      ? maskDestination(user, 'email')
      : `${String(identifier).slice(0, 1)}****@elanzia.com`,
    codeExpiresAt: inSeconds(OTP_TTL_SECONDS * 5),
  });
}

// BACKEND CONTRACT
// POST /admin/auth/password/reset
// Body: { resetToken, code, password }
// Returns: { ok: true, signInRequired: true }
// Errors: 400 otp_incorrect, 410 reset_expired, 404 challenge_not_found,
//         422 password_too_weak
// Notes: resetting never signs the admin in. They go back to ADM-001 and pass
//        2FA again, because a reset link is a weaker proof than a 2FA device.
export function resetPassword({ resetToken, code, password }) {
  const challenge = challenges.get(resetToken);
  if (!challenge) return mockError('challenge_not_found', 'That reset link is not valid', 404);
  if (Date.parse(challenge.expiresAt) < Date.now()) {
    return mockError('reset_expired', 'That reset link has expired', 410);
  }
  if (code !== demoCredentials.otpCode) {
    return mockError('otp_incorrect', 'That code is not correct', 400);
  }
  if (!password || password.length < 10) {
    return mockError('password_too_weak', 'Use at least 10 characters', 422);
  }

  challenges.delete(resetToken);
  return mockRequest({ ok: true, signInRequired: true });
}

// BACKEND CONTRACT
// POST /admin/auth/sign-out
// Returns: { ok: true }
// Notes: also ends any open impersonation session for this admin.
export function signOut() {
  sessionRecords
    .filter((session) => session.adminId === currentUserId && !session.endedAt)
    .forEach((session) => {
      session.endedAt = nowIso();
    });
  currentUserId = null;
  return mockRequest({ ok: true });
}

// ---------------------------------------------------------------------------
// Own profile - ADM-004
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/me
// Returns: AdminProfile
// Errors: 401 not_authenticated
// Notes: grantedPermissions is expanded, matching the 2FA response.
export function getProfile() {
  const user = staffRecords.find((candidate) => candidate.id === currentUserId);
  if (!user) return mockError('not_authenticated', 'Sign in to continue', 401);

  return mockRequest({
    ...withRoleName(user),
    timezone: user.timezone ?? 'Asia/Kolkata',
    grantedPermissions: grantedFor(user.roleId),
    notificationPreferences: user.notificationPreferences ?? notificationPreferences,
  });
}

// BACKEND CONTRACT
// PATCH /admin/me
// Body: { name?, phone?, locale?, timezone? }
// Returns: AdminProfile
// Errors: 401 not_authenticated, 422 validation_failed
// Notes: an admin cannot change their own email, role or status here. Email is
//        the sign-in identifier and role is a privilege - both go through
//        ADM-006 and are performed by somebody else.
export function updateProfile(patch) {
  const user = staffRecords.find((candidate) => candidate.id === currentUserId);
  if (!user) return mockError('not_authenticated', 'Sign in to continue', 401);

  const { name, phone, locale, timezone } = patch ?? {};
  if (name !== undefined && !String(name).trim()) {
    return mockError('validation_failed', 'Name is required', 422);
  }
  if (phone !== undefined && String(phone).replace(/\D/g, '').length !== 10) {
    return mockError('validation_failed', 'Enter a valid 10 digit mobile number', 422);
  }

  Object.assign(user, {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(locale !== undefined && { locale }),
    ...(timezone !== undefined && { timezone }),
  });

  return mockRequest({
    ...withRoleName(user),
    timezone: user.timezone ?? 'Asia/Kolkata',
    grantedPermissions: grantedFor(user.roleId),
    notificationPreferences: user.notificationPreferences ?? notificationPreferences,
  });
}

// BACKEND CONTRACT
// PUT /admin/me/notification-preferences
// Body: { preferences: [{ id, channels: { email, sms, inApp } }] }
// Returns: { preferences: NotificationPreference[] }
// Errors: 401 not_authenticated, 422 always_on_disabled
// Notes: rows flagged alwaysOn cannot have every channel switched off. A
//        failed settlement means a manufacturer has not been paid, and nobody
//        gets to silence that.
export function updateNotificationPreferences({ preferences }) {
  const user = staffRecords.find((candidate) => candidate.id === currentUserId);
  if (!user) return mockError('not_authenticated', 'Sign in to continue', 401);

  const merged = notificationPreferences.map((definition) => {
    const incoming = preferences.find((row) => row.id === definition.id);
    return incoming ? { ...definition, channels: { ...incoming.channels } } : definition;
  });

  const silenced = merged.find(
    (row) => row.alwaysOn && !row.channels.email && !row.channels.sms && !row.channels.inApp,
  );
  if (silenced) {
    return mockError('always_on_disabled', 'This alert cannot be switched off entirely', 422);
  }

  user.notificationPreferences = merged;
  return mockRequest({ preferences: merged });
}

// ---------------------------------------------------------------------------
// Staff - ADM-006
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/staff
// Query: { search, roleId, status, page, pageSize, sortBy, sortDir }
// Returns: { items: AdminUser[], total: number, page: number, pageSize: number }
// Notes: search matches name, email and phone. status is one of
//        'active'|'invited'|'deactivated'|'locked'. Sorted by name ascending
//        by default. Deactivated accounts are included, not hidden - an
//        auditor needs to see who used to have access.
export function listStaff({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const rows = staffRecords.map(withRoleName);

  return mockRequest(() =>
    queryCollection(rows, {
      search,
      searchFields: ['name', 'email', 'phone'],
      filters: { roleId: filters.roleId, status: filters.status },
      sortBy: sortBy ?? 'name',
      sortDir: sortDir ?? 'asc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/staff/:id
// Returns: AdminUser
// Errors: 404 staff_not_found
export function getStaffMember(id) {
  const user = staffRecords.find((candidate) => candidate.id === id);
  if (!user) return mockError('staff_not_found', 'That account no longer exists', 404);
  return mockRequest(withRoleName(user));
}

// BACKEND CONTRACT
// POST /admin/staff/invites
// Body: { name, email, phone, roleId, designation, city }
// Returns: AdminUser with status 'invited'
// Errors: 409 email_taken, 422 validation_failed, 404 role_not_found
// Notes: the invited account has twoFactorEnabled false and cannot sign in
//        until it enrols a second factor. inviteExpiresAt is 7 days out.
export function inviteStaff({ name, email, phone, roleId, designation, city }) {
  if (!String(name ?? '').trim() || !String(email ?? '').trim() || !roleId) {
    return mockError('validation_failed', 'Name, email and role are required', 422);
  }
  if (staffRecords.some((user) => user.email.toLowerCase() === String(email).toLowerCase())) {
    return mockError('email_taken', 'An account with that email already exists', 409);
  }
  if (!roleRecords.some((role) => role.id === roleId)) {
    return mockError('role_not_found', 'That role no longer exists', 404);
  }

  const nextNumber = staffRecords.length + 1;
  const invited = {
    id: `STF-${String(nextNumber).padStart(3, '0')}`,
    name,
    email,
    phone: phone ?? '',
    roleId,
    designation: designation ?? '',
    city: city ?? '',
    status: 'invited',
    twoFactorEnabled: false,
    twoFactorMethod: null,
    locale: 'en',
    lastSignInAt: null,
    createdAt: nowIso(),
    invitedAt: nowIso(),
    inviteExpiresAt: inSeconds(7 * 24 * 3600),
    lockedUntil: null,
    deactivatedAt: null,
    deactivationReason: null,
  };

  staffRecords = [...staffRecords, invited];
  return mockRequest(withRoleName(invited));
}

// BACKEND CONTRACT
// POST /admin/staff/:id/invite/resend
// Returns: { id, invitedAt: ISO, inviteExpiresAt: ISO }
// Errors: 404 staff_not_found, 409 not_invited
export function resendInvite(id) {
  const user = staffRecords.find((candidate) => candidate.id === id);
  if (!user) return mockError('staff_not_found', 'That account no longer exists', 404);
  if (user.status !== 'invited') {
    return mockError('not_invited', 'That account has already been activated', 409);
  }

  user.invitedAt = nowIso();
  user.inviteExpiresAt = inSeconds(7 * 24 * 3600);
  return mockRequest({ id, invitedAt: user.invitedAt, inviteExpiresAt: user.inviteExpiresAt });
}

// BACKEND CONTRACT
// POST /admin/staff/:id/deactivate
// Body: { reason }
// Returns: AdminUser with status 'deactivated'
// Errors: 404 staff_not_found, 422 reason_required, 409 last_super_admin,
//         409 cannot_deactivate_self
// Notes: the platform refuses to deactivate the last active super admin, and
//        an admin cannot deactivate their own account. Both leave the portal
//        with nobody able to restore access.
export function deactivateStaff({ id, reason }) {
  const user = staffRecords.find((candidate) => candidate.id === id);
  if (!user) return mockError('staff_not_found', 'That account no longer exists', 404);
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'A reason is required', 422);
  }
  if (id === currentUserId) {
    return mockError('cannot_deactivate_self', 'You cannot deactivate your own account', 409);
  }

  const activeSuperAdmins = staffRecords.filter(
    (candidate) => candidate.roleId === 'super_admin' && candidate.status === 'active',
  );
  if (user.roleId === 'super_admin' && activeSuperAdmins.length <= 1) {
    return mockError('last_super_admin', 'This is the last active super admin', 409);
  }

  Object.assign(user, {
    status: 'deactivated',
    deactivatedAt: nowIso(),
    deactivationReason: reason,
  });
  return mockRequest(withRoleName(user));
}

// BACKEND CONTRACT
// POST /admin/staff/:id/reactivate
// Returns: AdminUser with status 'invited'
// Errors: 404 staff_not_found, 409 not_deactivated
// Notes: reactivating returns the account to 'invited', not 'active'. The
//        person must re-enrol a second factor before they get in again.
export function reactivateStaff(id) {
  const user = staffRecords.find((candidate) => candidate.id === id);
  if (!user) return mockError('staff_not_found', 'That account no longer exists', 404);
  if (user.status !== 'deactivated') {
    return mockError('not_deactivated', 'That account is not deactivated', 409);
  }

  Object.assign(user, {
    status: 'invited',
    twoFactorEnabled: false,
    twoFactorMethod: null,
    invitedAt: nowIso(),
    inviteExpiresAt: inSeconds(7 * 24 * 3600),
    deactivatedAt: null,
    deactivationReason: null,
  });
  return mockRequest(withRoleName(user));
}

// ---------------------------------------------------------------------------
// Roles and permissions - ADM-005, ADM-007
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/permissions
// Returns: { modules: PermissionModule[] }
// Notes: the permission catalogue is platform configuration, not tenant data.
//        It changes only when the product grows a new capability, so it is
//        safe to cache aggressively. Order is the display order.
export function getPermissionCatalogue() {
  return mockRequest({ modules: PERMISSION_MODULES });
}

// BACKEND CONTRACT
// GET /admin/roles
// Query: { search, page, pageSize, sortBy, sortDir }
// Returns: { items: Role[], total, page, pageSize }
// Notes: memberCount excludes deactivated accounts. System roles sort first.
export function listRoles({ search, page, pageSize, sortBy, sortDir } = {}) {
  const rows = roleRecords.map(roleWithMembers);

  return mockRequest(() =>
    queryCollection(rows, {
      search,
      searchFields: ['name', 'description'],
      sortBy: sortBy ?? 'name',
      sortDir: sortDir ?? 'asc',
      page,
      pageSize: pageSize ?? 50,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/roles/:id
// Returns: Role
// Errors: 404 role_not_found
export function getRole(id) {
  const role = roleRecords.find((candidate) => candidate.id === id);
  if (!role) return mockError('role_not_found', 'That role no longer exists', 404);
  return mockRequest(roleWithMembers(role));
}

// BACKEND CONTRACT
// POST /admin/roles
// Body: { name, description, permissions: string[] }
// Returns: Role
// Errors: 409 name_taken, 422 validation_failed, 422 unknown_permission
// Notes: the server stores the ticked permissions and expands `implies` when
//        it evaluates them. Storing the expanded set instead would make a
//        later change to the matrix invisible to existing roles.
export function createRole({ name, description, permissions = [] }) {
  const validation = validateRolePayload({ name, permissions });
  if (validation) return validation;
  if (roleRecords.some((role) => role.name.toLowerCase() === String(name).trim().toLowerCase())) {
    return mockError('name_taken', 'A role with that name already exists', 409);
  }

  const created = {
    id: String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name: String(name).trim(),
    description: description ?? '',
    isSystem: false,
    permissions,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    createdBy: currentUserId,
  };

  roleRecords = [...roleRecords, created];
  return mockRequest(roleWithMembers(created));
}

// BACKEND CONTRACT
// PUT /admin/roles/:id
// Body: { name, description, permissions: string[] }
// Returns: Role
// Errors: 404 role_not_found, 409 system_role_readonly, 409 name_taken,
//         422 validation_failed, 422 unknown_permission
// Notes: system roles cannot be re-scoped. Their permission sets are what the
//        product guarantees a role called Finance can do, and a tenant editing
//        that would break every assumption downstream.
export function updateRole({ id, name, description, permissions = [] }) {
  const role = roleRecords.find((candidate) => candidate.id === id);
  if (!role) return mockError('role_not_found', 'That role no longer exists', 404);
  if (role.isSystem) {
    return mockError('system_role_readonly', 'System roles cannot be edited', 409);
  }

  const validation = validateRolePayload({ name, permissions });
  if (validation) return validation;
  if (
    roleRecords.some(
      (candidate) =>
        candidate.id !== id && candidate.name.toLowerCase() === String(name).trim().toLowerCase(),
    )
  ) {
    return mockError('name_taken', 'A role with that name already exists', 409);
  }

  Object.assign(role, {
    name: String(name).trim(),
    description: description ?? '',
    permissions,
    updatedAt: nowIso(),
  });
  return mockRequest(roleWithMembers(role));
}

function validateRolePayload({ name, permissions }) {
  if (!String(name ?? '').trim()) {
    return mockError('validation_failed', 'A role name is required', 422);
  }
  if (permissions.length === 0) {
    return mockError('validation_failed', 'Grant at least one permission', 422);
  }
  const unknown = permissions.filter((id) => !permissionById[id]);
  if (unknown.length > 0) {
    return mockError('unknown_permission', `Unknown permission: ${unknown[0]}`, 422);
  }
  return null;
}

// BACKEND CONTRACT
// DELETE /admin/roles/:id
// Returns: { ok: true }
// Errors: 404 role_not_found, 409 system_role_readonly, 409 role_in_use
// Notes: a role holding members cannot be deleted. Reassign them first, or the
//        deletion silently strips access from people who are mid-shift.
export function deleteRole(id) {
  const role = roleRecords.find((candidate) => candidate.id === id);
  if (!role) return mockError('role_not_found', 'That role no longer exists', 404);
  if (role.isSystem) return mockError('system_role_readonly', 'System roles cannot be deleted', 409);

  const memberCount = staffRecords.filter(
    (user) => user.roleId === id && user.status !== 'deactivated',
  ).length;
  if (memberCount > 0) {
    return mockError('role_in_use', `${memberCount} accounts still hold this role`, 409);
  }

  roleRecords = roleRecords.filter((candidate) => candidate.id !== id);
  return mockRequest({ ok: true });
}

// BACKEND CONTRACT
// GET /admin/roles/:roleId/navigation
// Returns: { roleId, grantedPermissions: string[],
//            sections: [{ id, label, granted: boolean,
//                         items: [{ id, label, path, permission,
//                                   granted: boolean }] }] }
// Errors: 404 role_not_found
// Notes: this is the same computation the shell performs when it decides what
//        to render, exposed so ADM-005 can show it. If this endpoint and the
//        rendered nav ever disagree, one of them has a bug.
export function getNavigationForRole(roleId) {
  const role = roleRecords.find((candidate) => candidate.id === roleId);
  if (!role) return mockError('role_not_found', 'That role no longer exists', 404);

  const granted = expandPermissions(role.permissions);

  const sections = navigation.map((section) => {
    const items = section.items.map((item) => ({
      id: item.id,
      label: item.label,
      path: item.path,
      permission: item.permission ?? null,
      hidden: Boolean(item.hidden),
      granted: !item.permission || granted.includes(item.permission),
    }));

    return {
      id: section.id,
      label: section.label,
      items,
      granted: items.some((item) => item.granted && !item.hidden),
    };
  });

  return mockRequest({ roleId, grantedPermissions: granted, sections });
}

// ---------------------------------------------------------------------------
// Impersonation - ADM-008
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/impersonation/targets
// Query: { search, targetType, status, page, pageSize, sortBy, sortDir }
// Returns: { items: ImpersonationTarget[], total, page, pageSize }
// Notes: manufacturers and jewellers are returned in one list because a
//        support agent searching for a business name does not know which side
//        of the marketplace it sits on. targetType filters between them.
export function listImpersonationTargets({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryCollection(impersonationTargets, {
      search,
      searchFields: ['businessName', 'contactName', 'city', 'email', 'id'],
      filters: { targetType: filters.targetType, status: filters.status },
      sortBy: sortBy ?? 'businessName',
      sortDir: sortDir ?? 'asc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// POST /admin/impersonation/sessions
// Body: { targetType, targetId, reason, mode: 'read_only'|'assist' }
// Returns: ImpersonationSession
// Errors: 401 not_authenticated, 403 permission_denied, 404 target_not_found,
//         422 reason_required, 409 session_already_open,
//         409 target_suspended
// Notes: the reason is mandatory and is written to the audit trail. An
//        impersonation nobody can justify afterwards is indistinguishable from
//        an admin reading a member's private trade data for their own reasons.
export function startImpersonation({ targetType, targetId, reason, mode = 'read_only' }) {
  if (!currentUserId) return mockError('not_authenticated', 'Sign in to continue', 401);
  if (!grantedFor(currentUserIdRole()).includes('access.impersonate')) {
    return mockError('permission_denied', 'Your role cannot assist members', 403);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'A reason is required and is logged', 422);
  }

  const target = impersonationTargets.find(
    (candidate) => candidate.id === targetId && candidate.targetType === targetType,
  );
  if (!target) return mockError('target_not_found', 'That account no longer exists', 404);
  if (target.status === 'suspended') {
    return mockError('target_suspended', 'Suspended accounts cannot be assisted', 409);
  }
  if (sessionRecords.some((session) => session.adminId === currentUserId && !session.endedAt)) {
    return mockError('session_already_open', 'End your open session first', 409);
  }

  const admin = staffRecords.find((candidate) => candidate.id === currentUserId);
  const session = {
    id: `IMP-${String(sessionRecords.length + 1).padStart(4, '0')}`,
    adminId: admin.id,
    adminName: admin.name,
    targetType,
    targetId,
    targetName: target.businessName,
    panelPath: target.panelPath,
    reason,
    mode,
    startedAt: nowIso(),
    endedAt: null,
    durationMinutes: 0,
    actionsTaken: 0,
  };

  sessionRecords = [session, ...sessionRecords];
  return mockRequest(session);
}

function currentUserIdRole() {
  return staffRecords.find((candidate) => candidate.id === currentUserId)?.roleId;
}

// BACKEND CONTRACT
// POST /admin/impersonation/sessions/:id/end
// Returns: ImpersonationSession with endedAt set
// Errors: 404 session_not_found, 409 already_ended
export function endImpersonation(sessionId) {
  const session = sessionRecords.find((candidate) => candidate.id === sessionId);
  if (!session) return mockError('session_not_found', 'That session no longer exists', 404);
  if (session.endedAt) return mockError('already_ended', 'That session has already ended', 409);

  session.endedAt = nowIso();
  session.durationMinutes = Math.max(
    1,
    Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000),
  );
  return mockRequest(session);
}

// BACKEND CONTRACT
// GET /admin/impersonation/sessions
// Query: { adminId, targetType, page, pageSize, sortBy, sortDir }
// Returns: { items: ImpersonationSession[], total, page, pageSize }
// Notes: the audit trail. Sorted by startedAt descending by default. Rows are
//        never deleted, only appended - this list is the answer to "who looked
//        at my account", and a gap in it is worse than no list at all.
export function listImpersonationSessions({ filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryCollection(sessionRecords, {
      filters: { adminId: filters.adminId, targetType: filters.targetType },
      sortBy: sortBy ?? 'startedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// ---------------------------------------------------------------------------
// Translations - ADM-009
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/locales
// Returns: { items: [{ code, label, nativeLabel, isDefault, publishedAt,
//                      entryCount, translatedCount, missingCount,
//                      completeness: number }] }
// Notes: completeness is a percentage to one decimal place, computed over the
//        full English key set. The default locale is always 100 percent.
export function listLocales() {
  const total = translationRecords.length;

  return mockRequest(() =>
    ({
      items: locales.map((locale) => {
        const translated = translationRecords.filter(
          (entry) => entry.states[locale.code] === 'translated',
        ).length;
        const missing = translationRecords.filter(
          (entry) => entry.states[locale.code] === 'missing',
        ).length;

        return {
          ...locale,
          entryCount: total,
          translatedCount: translated,
          missingCount: missing,
          completeness: total === 0 ? 0 : Number(((translated / total) * 100).toFixed(1)),
        };
      }),
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/translations
// Query: { locale, search, module, state, page, pageSize, sortBy, sortDir }
// Returns: { items: TranslationEntry[], total, page, pageSize }
// Errors: 404 locale_not_found
// Notes: entries are returned flattened for the requested locale - one row per
//        key carrying that locale's value and state, not a map of all locales.
//        state is 'translated'|'missing'|'draft'|'stale'; 'stale' means the
//        English source changed after the translation was written, which is
//        the case a translator most needs to find.
export function listTranslations({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const locale = filters.locale ?? 'hi';
  if (!locales.some((candidate) => candidate.code === locale)) {
    return mockError('locale_not_found', 'That language is not configured', 404);
  }

  const rows = translationRecords.map((entry) => ({
    key: entry.key,
    module: entry.module,
    sourceText: entry.sourceText,
    locale,
    value: entry.values[locale],
    state: entry.states[locale],
    updatedAt: entry.updatedAt,
    updatedBy: entry.updatedBy,
  }));

  return mockRequest(() =>
    queryCollection(rows, {
      search,
      searchFields: ['key', 'sourceText', 'value'],
      filters: { module: filters.module, state: filters.state },
      sortBy: sortBy ?? 'key',
      sortDir: sortDir ?? 'asc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// PUT /admin/translations/:key/:locale
// Body: { value, state?: 'draft'|'translated' }
// Returns: TranslationEntry
// Errors: 404 key_not_found, 404 locale_not_found, 409 default_locale_readonly
// Notes: the default locale cannot be edited here. English is the source text
//        and lives in the codebase, so editing it in a translation tool would
//        put the two out of step with nothing to reconcile them.
export function updateTranslation({ key, locale, value, state = 'translated' }) {
  if (locale === 'en') {
    return mockError('default_locale_readonly', 'English is the source and is edited in code', 409);
  }
  if (!locales.some((candidate) => candidate.code === locale)) {
    return mockError('locale_not_found', 'That language is not configured', 404);
  }

  const entry = translationRecords.find((candidate) => candidate.key === key);
  if (!entry) return mockError('key_not_found', 'That string no longer exists', 404);

  entry.values[locale] = value?.trim() ? value : null;
  entry.states[locale] = entry.values[locale] ? state : 'missing';
  entry.updatedAt = nowIso();
  entry.updatedBy = currentUserId;

  return mockRequest({
    key: entry.key,
    module: entry.module,
    sourceText: entry.sourceText,
    locale,
    value: entry.values[locale],
    state: entry.states[locale],
    updatedAt: entry.updatedAt,
    updatedBy: entry.updatedBy,
  });
}

// BACKEND CONTRACT
// POST /admin/locales/:code/publish
// Returns: { code, publishedAt: ISO, entryCount: number }
// Errors: 404 locale_not_found, 409 incomplete_locale, 409 already_default
// Notes: publishing below 100 percent is refused. A jeweller who meets an
//        English string in the middle of a Gujarati checkout trusts the
//        portal less than one who was never offered Gujarati at all.
export function publishLocale(code) {
  const locale = locales.find((candidate) => candidate.code === code);
  if (!locale) return mockError('locale_not_found', 'That language is not configured', 404);
  if (locale.isDefault) return mockError('already_default', 'English is always published', 409);

  const missing = translationRecords.filter((entry) => entry.states[code] !== 'translated').length;
  if (missing > 0) {
    return mockError('incomplete_locale', `${missing} strings are not translated yet`, 409);
  }

  locale.publishedAt = nowIso();
  return mockRequest({
    code,
    publishedAt: locale.publishedAt,
    entryCount: translationRecords.length,
  });
}
