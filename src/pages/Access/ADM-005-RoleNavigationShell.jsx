// ADM-005
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Lock } from 'lucide-react';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusPill } from '@/components/primitives';
import { NAVIGABLE_PERMISSIONS } from '@/config/navigation';
import { PERMISSION_MODULES } from '@/config/permissions';
import {
  fetchNavPreview,
  fetchRoles,
  selectNavPreview,
  setNavPreviewRole,
} from '@/store/slices/accessSlice';
import { t } from '@/i18n/en';

// What each role can actually reach. The endpoint behind this performs the
// same computation AdminShell does when it decides what to render, so if this
// screen and the sidebar ever disagree, one of them has a bug.
export default function RoleNavigationShell() {
  const dispatch = useDispatch();

  // Data.
  const {
    roleId,
    sections,
    grantedPermissions,
    roleOptions,
    selectedRole,
    reachableCount,
    totalCount,
    viewState,
    error,
  } = useSelector(selectNavPreview);

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  // Default to the first role rather than an empty screen.
  useEffect(() => {
    if (!roleId && roleOptions.length > 0) dispatch(setNavPreviewRole(roleOptions[0].value));
  }, [dispatch, roleId, roleOptions]);

  useEffect(() => {
    if (roleId) dispatch(fetchNavPreview(roleId));
  }, [dispatch, roleId]);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={t('access.navPreviewTitle')}
        subtitle={t('access.navPreviewSubtitle')}
        meta={
          viewState === 'populated' ? (
            <StatusPill tone="info">
              {t('access.reachableScreens', { granted: reachableCount, total: totalCount })}
            </StatusPill>
          ) : null
        }
        actions={
          <Select
            id="preview-role"
            className="w-56"
            label={t('access.chooseRole')}
            value={roleId ?? ''}
            onChange={(event) => dispatch(setNavPreviewRole(event.target.value))}
            options={roleOptions}
          />
        }
      />

      {viewState === 'loading' ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : viewState === 'error' ? (
        <ErrorState detail={error?.message} onRetry={() => dispatch(fetchNavPreview(roleId))} />
      ) : viewState === 'empty' ? (
        <Card>
          <EmptyState
            title={t('access.navPreviewEmptyTitle')}
            body={t('access.navPreviewEmptyBody')}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {sections.map((section) => (
              <Card
                key={section.id}
                title={t(section.label)}
                description={section.granted ? undefined : t('access.sectionHidden')}
                padded={false}
                className={section.granted ? undefined : 'opacity-60'}
              >
                <ul className="divide-y divide-lightGray">
                  {section.items.map((item) => (
                    <NavRow key={item.id} item={item} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <PermissionPanel role={selectedRole} grantedPermissions={grantedPermissions} />
          </aside>
        </div>
      )}
    </div>
  );
}

function NavRow({ item }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          item.granted ? 'bg-success-surface text-success' : 'bg-lightGray text-charcoal-lighter'
        }`}
        aria-hidden="true"
      >
        {item.granted ? <Check size={13} /> : <Lock size={12} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-base text-charcoal">
          {t(item.label)}
          {item.hidden ? <Badge tone="outline">{t('common.details')}</Badge> : null}
        </p>
        <p className="font-mono text-xs text-charcoal-light">{item.path}</p>
      </div>

      <p className="shrink-0 text-xs text-charcoal-light">
        {item.permission
          ? t('access.requiresPermission', { permission: item.permission })
          : t('access.noPermissionRequired')}
      </p>

      <StatusPill tone={item.granted ? 'success' : 'neutral'} size="sm">
        {item.granted ? t('access.granted') : t('access.denied')}
      </StatusPill>
    </li>
  );
}

// The permissions this role holds, grouped the way ADM-007 groups them. Only
// the permissions that actually unlock a screen are marked, so it is obvious
// which grants are doing navigational work and which are behavioural.
function PermissionPanel({ role, grantedPermissions }) {
  const modules = PERMISSION_MODULES.map((module) => ({
    ...module,
    held: module.permissions.filter((permission) => grantedPermissions.includes(permission.id)),
  })).filter((module) => module.held.length > 0);

  return (
    <Card
      title={role?.name ?? t('access.role')}
      description={role?.description}
    >
      <p className="mb-4 text-sm text-charcoal-light">
        {t('access.grantedPermissionCount', { count: grantedPermissions.length })}
      </p>

      <div className="flex flex-col gap-4">
        {modules.map((module) => (
          <div key={module.id}>
            <p className="mb-1.5 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-lighter">
              {t(module.label)}
            </p>
            <ul className="flex flex-col gap-1">
              {module.held.map((permission) => (
                <li
                  key={permission.id}
                  className="flex items-baseline gap-2 font-mono text-xs text-charcoal"
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      NAVIGABLE_PERMISSIONS.includes(permission.id)
                        ? 'bg-accent'
                        : 'bg-lightGray-darker'
                    }`}
                    aria-hidden="true"
                  />
                  {permission.id}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
