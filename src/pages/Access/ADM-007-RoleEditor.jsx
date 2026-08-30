// ADM-007
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Lock, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { permissionById } from '@/config/permissions';
import {
  clearRoleDraft,
  createRole,
  deleteRole,
  fetchPermissionCatalogue,
  fetchRole,
  selectRoleEditor,
  setModulePermissions,
  setRoleDraftField,
  startRoleDraft,
  toggleRolePermission,
  updateRole,
} from '@/store/slices/accessSlice';
import { t } from '@/i18n/en';

export default function RoleEditor() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { roleId } = useParams();
  const isNew = roleId === 'new';

  // Data.
  const {
    modules,
    draft,
    grantedPermissions,
    lockedPermissions,
    isSystem,
    dirty,
    viewState,
    saveStatus,
    saveError,
    error,
  } = useSelector(selectRoleEditor);

  const [confirmingSensitive, setConfirmingSensitive] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [nameError, setNameError] = useState(null);

  useEffect(() => {
    dispatch(fetchPermissionCatalogue());
  }, [dispatch]);

  useEffect(() => {
    if (isNew) dispatch(startRoleDraft());
    else dispatch(fetchRole(roleId));

    return () => dispatch(clearRoleDraft());
  }, [dispatch, roleId, isNew]);

  // Handlers.
  // Granting a sensitive permission is confirmed once, at the moment of
  // granting. Everyone holding the role gets it, which is not obvious from a
  // checkbox in a list of forty nine.
  const handleToggle = (permission) => {
    const isGranting = !draft.permissions.includes(permission.id);
    if (isGranting && permission.sensitive) {
      setConfirmingSensitive(permission);
      return;
    }
    dispatch(toggleRolePermission(permission.id));
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      setNameError(t('validation.requiredField'));
      return;
    }
    setNameError(null);

    const payload = {
      id: draft.id,
      name: draft.name,
      description: draft.description,
      permissions: draft.permissions,
    };

    const action = isNew ? createRole(payload) : updateRole(payload);
    dispatch(action).then((result) => {
      if (!result.error) navigate('/access/users');
    });
  };

  // Markup.
  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !draft) {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchRole(roleId))} />;
  }

  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={isNew ? t('access.roleCreateTitle') : draft.name}
        subtitle={t('access.roleEditorSubtitle')}
        meta={
          <>
            {isSystem ? <StatusPill tone="info">{t('access.systemRole')}</StatusPill> : null}
            <StatusPill tone="neutral">
              {t('access.permissionsGranted', {
                count: draft.permissions.length,
                total: Object.keys(permissionById).length,
              })}
            </StatusPill>
          </>
        }
        actions={
          !isSystem && !isNew ? (
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              {t('common.delete')}
            </Button>
          ) : null
        }
      />

      {isSystem ? (
        <p className="flex items-start gap-2 rounded-md border border-info/30 bg-info-surface px-4 py-3 text-base text-info">
          <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('access.systemRoleReadonly')}
        </p>
      ) : null}

      <Card title={t('access.groupIdentity')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="role-name"
            label={t('access.roleName')}
            required
            disabled={isSystem}
            value={draft.name}
            error={nameError}
            onChange={(event) =>
              dispatch(setRoleDraftField({ field: 'name', value: event.target.value }))
            }
          />
          <Textarea
            id="role-description"
            className="md:col-span-2"
            rows={2}
            label={t('access.roleDescription')}
            help={t('access.roleDescriptionHelp')}
            disabled={isSystem}
            value={draft.description}
            onChange={(event) =>
              dispatch(setRoleDraftField({ field: 'description', value: event.target.value }))
            }
          />
        </div>
      </Card>

      {modules.map((module) => (
        <PermissionGroup
          key={module.id}
          module={module}
          draft={draft}
          grantedPermissions={grantedPermissions}
          lockedPermissions={lockedPermissions}
          readOnly={isSystem}
          onToggle={handleToggle}
          onSetModule={(granted) =>
            dispatch(
              setModulePermissions({
                permissionIds: module.permissions.map((permission) => permission.id),
                granted,
              }),
            )
          }
        />
      ))}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          <Button variant="secondary" onClick={() => navigate('/access/users')}>
            {t('common.cancel')}
          </Button>
          <Button disabled={isSystem || !dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>

      <ConfirmDialog
        open={Boolean(confirmingSensitive)}
        onClose={() => setConfirmingSensitive(null)}
        onConfirm={() => {
          dispatch(toggleRolePermission(confirmingSensitive.id));
          setConfirmingSensitive(null);
        }}
        title={t('access.sensitiveConfirmTitle')}
        body={t('access.sensitiveConfirmBody', {
          permission: confirmingSensitive ? t(confirmingSensitive.label) : '',
        })}
        confirmLabel={t('common.confirm')}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() =>
          dispatch(deleteRole(draft.id)).then((result) => {
            setConfirmingDelete(false);
            if (!result.error) navigate('/access/users');
          })
        }
        loading={saveStatus === 'loading'}
        title={t('access.deleteRoleTitle')}
        body={t('access.deleteRoleBody')}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}

function PermissionGroup({
  module,
  draft,
  grantedPermissions,
  lockedPermissions,
  readOnly,
  onToggle,
  onSetModule,
}) {
  const heldCount = module.permissions.filter((permission) =>
    draft.permissions.includes(permission.id),
  ).length;
  const allHeld = heldCount === module.permissions.length;

  return (
    <Card
      title={t(module.label)}
      description={t('access.permissionsGranted', {
        count: heldCount,
        total: module.permissions.length,
      })}
      padded={false}
      action={
        readOnly ? null : (
          <Button size="sm" variant="ghost" onClick={() => onSetModule(!allHeld)}>
            {allHeld ? t('access.clearModule') : t('access.selectAllInModule')}
          </Button>
        )
      }
    >
      <ul className="divide-y divide-lightGray">
        {module.permissions.map((permission) => {
          const ticked = draft.permissions.includes(permission.id);
          // Implied by something else the role holds: shown as on, and locked,
          // because a role that can approve what it cannot open is broken.
          const implied = !ticked && grantedPermissions.includes(permission.id);
          const holders = lockedPermissions[permission.id] ?? [];
          const locked = readOnly || implied || holders.length > 0;

          return (
            <li key={permission.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
              <Checkbox
                id={permission.id}
                checked={ticked || implied}
                disabled={locked}
                onChange={() => onToggle(permission)}
              />

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-base text-charcoal">
                  {t(permission.label)}
                  {permission.sensitive ? (
                    <StatusPill tone="warning" size="sm">
                      <ShieldAlert size={11} aria-hidden="true" />
                      {t('access.sensitiveBadge')}
                    </StatusPill>
                  ) : null}
                  <Badge tone="outline">{permission.id}</Badge>
                </p>
                <p className="text-xs text-charcoal-light">{t(permission.description)}</p>

                {implied ? (
                  <p className="mt-1 text-xs text-info">{t('access.impliedNote')}</p>
                ) : holders.length > 0 ? (
                  <p className="mt-1 text-xs text-info">
                    {t('access.impliedBy', {
                      permissions: holders.map((id) => t(permissionById[id].label)).join(', '),
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
