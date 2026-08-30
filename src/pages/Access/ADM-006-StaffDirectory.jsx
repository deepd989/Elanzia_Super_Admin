// ADM-006
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  deactivateStaff,
  fetchRoles,
  fetchStaff,
  inviteStaff,
  reactivateStaff,
  resendInvite,
  selectStaffDirectory,
  setStaffFilters,
  setStaffPage,
  setStaffPageSize,
  setStaffSearch,
  setStaffSort,
  clearStaffFilters,
} from '@/store/slices/accessSlice';
import { formatDate, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  active: 'success',
  invited: 'info',
  deactivated: 'neutral',
  locked: 'danger',
};

const STATUS_OPTIONS = [
  { value: 'active', label: t('access.status.active') },
  { value: 'invited', label: t('access.status.invited') },
  { value: 'deactivated', label: t('access.status.deactivated') },
  { value: 'locked', label: t('access.status.locked') },
];

const COLUMN_COUNT = 7;

export default function StaffDirectory() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data.
  const { staffMembers, total, query, roleOptions, currentUserId, viewState, actionStatus, error } =
    useSelector(selectStaffDirectory);

  const [tab, setTab] = useState('users');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirming, setConfirming] = useState(null); // { member, action }
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch, query]);

  // Handlers.
  const handleSort = (sortBy) =>
    dispatch(
      setStaffSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'asc' ? 'desc' : 'asc',
      }),
    );

  const handleConfirm = async () => {
    const { member, action } = confirming;
    if (action === 'deactivate') await dispatch(deactivateStaff({ id: member.id, reason }));
    else await dispatch(reactivateStaff(member.id));

    setConfirming(null);
    setReason('');
    dispatch(fetchStaff());
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={t('access.staffTitle')}
        subtitle={t('access.staffSubtitle')}
        actions={
          <Button iconLeft={Plus} onClick={() => setInviteOpen(true)}>
            {t('access.inviteStaff')}
          </Button>
        }
      />

      <Tabs
        activeId={tab}
        onChange={setTab}
        tabs={[
          { id: 'users', label: t('access.staffTitle'), count: total },
          { id: 'roles', label: t('access.rolesTitle'), count: roleOptions.length },
        ]}
      />

      {tab === 'roles' ? (
        <RolesTab onOpen={(roleId) => navigate(`/access/roles/${roleId}`)} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              id="search"
              className="w-72"
              iconLeft={Search}
              placeholder={t('access.staffSearchPlaceholder')}
              value={query.search}
              onChange={(event) => dispatch(setStaffSearch(event.target.value))}
            />
            <Select
              id="role"
              className="w-48"
              placeholder={t('common.all')}
              value={query.filters.roleId}
              onChange={(event) =>
                dispatch(setStaffFilters({ ...query.filters, roleId: event.target.value }))
              }
              options={roleOptions}
            />
            <Select
              id="status"
              className="w-44"
              placeholder={t('common.all')}
              value={query.filters.status}
              onChange={(event) =>
                dispatch(setStaffFilters({ ...query.filters, status: event.target.value }))
              }
              options={STATUS_OPTIONS}
            />
            <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearStaffFilters())}>
              {t('common.clearFilters')}
            </Button>
          </div>

          <TableShell
            footer={
              <TableShell.Pagination
                page={query.page}
                pageSize={query.pageSize}
                total={total}
                onPageChange={(page) => dispatch(setStaffPage(page))}
                onPageSizeChange={(size) => dispatch(setStaffPageSize(size))}
              />
            }
          >
            <TableShell.Head>
              <TableShell.HeadCell>{t('access.columnUser')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('access.columnRole')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('access.columnCity')}</TableShell.HeadCell>
              <TableShell.SortableHeadCell
                direction={query.sortBy === 'lastSignInAt' ? query.sortDir : null}
                onSort={() => handleSort('lastSignInAt')}
              >
                {t('access.columnLastSignIn')}
              </TableShell.SortableHeadCell>
              <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
            </TableShell.Head>

            <TableShell.Body>
              {viewState === 'populated' ? (
                staffMembers.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    isSelf={member.id === currentUserId}
                    onResend={() => dispatch(resendInvite(member.id)).then(() => dispatch(fetchStaff()))}
                    onDeactivate={() => setConfirming({ member, action: 'deactivate' })}
                    onReactivate={() => setConfirming({ member, action: 'reactivate' })}
                  />
                ))
              ) : (
                <TableShell.StateRow colSpan={COLUMN_COUNT}>
                  {viewState === 'loading' ? <StaffSkeleton /> : null}
                  {viewState === 'error' ? (
                    <ErrorState detail={error?.message} onRetry={() => dispatch(fetchStaff())} />
                  ) : null}
                  {viewState === 'empty-filtered' ? (
                    <EmptyState
                      title={t('states.emptyFilteredTitle')}
                      body={t('states.emptyFilteredBody')}
                      actionLabel={t('common.clearFilters')}
                      onAction={() => dispatch(clearStaffFilters())}
                    />
                  ) : null}
                  {viewState === 'empty' ? (
                    <EmptyState
                      title={t('access.staffEmptyTitle')}
                      body={t('access.staffEmptyBody')}
                      actionLabel={t('access.inviteStaff')}
                      onAction={() => setInviteOpen(true)}
                    />
                  ) : null}
                </TableShell.StateRow>
              )}
            </TableShell.Body>
          </TableShell>
        </>
      )}

      <InviteModal
        open={inviteOpen}
        roleOptions={roleOptions}
        saving={actionStatus === 'loading'}
        onClose={() => setInviteOpen(false)}
        onSubmit={async (payload) => {
          const result = await dispatch(inviteStaff(payload));
          if (!result.error) {
            setInviteOpen(false);
            dispatch(fetchStaff());
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
        loading={actionStatus === 'loading'}
        tone={confirming?.action === 'deactivate' ? 'danger' : 'primary'}
        title={
          confirming?.action === 'deactivate'
            ? t('access.deactivateTitle')
            : t('access.reactivateTitle')
        }
        body={
          confirming?.action === 'deactivate'
            ? t('access.deactivateBody')
            : t('access.reactivateBody')
        }
        confirmLabel={
          confirming?.action === 'deactivate' ? t('access.deactivate') : t('access.reactivate')
        }
      >
        {confirming?.action === 'deactivate' ? (
          <Textarea
            id="deactivate-reason"
            className="mt-4"
            rows={3}
            required
            label={t('access.deactivateReason')}
            help={t('access.deactivateReasonHelp')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function StaffRow({ member, isSelf, onResend, onDeactivate, onReactivate }) {
  const inviteExpired =
    member.status === 'invited' && Date.parse(member.inviteExpiresAt) < Date.now();

  return (
    <TableShell.Row>
      <TableShell.Cell>
        <span className="flex items-center gap-2 font-medium text-charcoal">
          {member.name}
          {isSelf ? <Badge tone="outline">{t('access.youBadge')}</Badge> : null}
        </span>
        <span className="block text-xs text-charcoal-light">{member.email}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-charcoal-lighter" aria-hidden="true" />
          {member.roleName}
        </span>
        <span className="block text-xs text-charcoal-light">{member.designation}</span>
      </TableShell.Cell>

      <TableShell.Cell>{member.city}</TableShell.Cell>

      <TableShell.Cell>
        {member.lastSignInAt ? (
          <>
            {formatDate(member.lastSignInAt)}
            <span className="block text-xs text-charcoal-light">
              {formatRelativeTime(member.lastSignInAt)}
            </span>
          </>
        ) : member.status === 'invited' ? (
          <span className={`text-xs ${inviteExpired ? 'text-danger' : 'text-charcoal-light'}`}>
            {inviteExpired
              ? t('access.inviteExpired')
              : t('access.invitePending', { when: formatRelativeTime(member.invitedAt) })}
          </span>
        ) : (
          <span className="text-xs text-charcoal-light">{t('access.neverSignedIn')}</span>
        )}
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={STATUS_TONES[member.status]} label={t(`access.status.${member.status}`)} />
      </TableShell.Cell>

      <TableShell.ActionsCell>
        {member.status === 'invited' ? (
          <Button size="sm" variant="ghost" onClick={onResend}>
            {t('access.resendInvite')}
          </Button>
        ) : null}
        {/* A locked account unlocks itself, so it offers neither action. */}
        {member.status === 'deactivated' ? (
          <Button size="sm" variant="ghost" onClick={onReactivate}>
            {t('access.reactivate')}
          </Button>
        ) : null}
        {member.status !== 'deactivated' && !isSelf ? (
          <Button size="sm" variant="ghost" onClick={onDeactivate}>
            {t('access.deactivate')}
          </Button>
        ) : null}
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function RolesTab({ onOpen }) {
  const roleList = useSelector((state) => state.access.roles.items);
  const listStatus = useSelector((state) => state.access.roles.status);

  if (listStatus === 'loading') return <StaffSkeleton rows={5} />;

  return (
    <TableShell>
      <TableShell.Head>
        <TableShell.HeadCell>{t('access.roleName')}</TableShell.HeadCell>
        <TableShell.HeadCell>{t('access.roleDescription')}</TableShell.HeadCell>
        <TableShell.HeadCell align="right">{t('access.columnMembers')}</TableShell.HeadCell>
        <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
      </TableShell.Head>

      <TableShell.Body>
        {roleList.map((role) => (
          <TableShell.Row key={role.id} onClick={() => onOpen(role.id)}>
            <TableShell.Cell>
              <span className="flex items-center gap-2 font-medium text-charcoal">
                {role.name}
                {role.isSystem ? <Badge tone="outline">{t('access.systemRole')}</Badge> : null}
              </span>
            </TableShell.Cell>
            <TableShell.Cell className="text-charcoal-light">{role.description}</TableShell.Cell>
            <TableShell.Cell align="right" numeric>{role.memberCount}</TableShell.Cell>
            <TableShell.ActionsCell>
              <Button size="sm" variant="ghost" onClick={() => onOpen(role.id)}>
                {role.isSystem ? t('common.view') : t('common.edit')}
              </Button>
            </TableShell.ActionsCell>
          </TableShell.Row>
        ))}
      </TableShell.Body>
    </TableShell>
  );
}

function InviteModal({ open, roleOptions, saving, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', roleId: '', city: '' });
  const [errors, setErrors] = useState({});

  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t('validation.requiredField');
    if (!form.email.includes('@')) nextErrors.email = t('validation.invalidEmail');
    if (!form.roleId) nextErrors.roleId = t('validation.requiredField');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('access.inviteTitle')}
      description={t('access.inviteDescription')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={handleSubmit}>{t('access.sendInvite')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <Input id="invite-name" label={t('access.fullName')} required value={form.name} error={errors.name} onChange={setField('name')} />
        <Input id="invite-email" type="email" label={t('access.email')} required value={form.email} error={errors.email} onChange={setField('email')} />
        <Input id="invite-phone" label={t('access.phone')} value={form.phone} onChange={setField('phone')} />
        <Select id="invite-role" label={t('access.role')} required placeholder={t('access.chooseRole')} value={form.roleId} error={errors.roleId} onChange={setField('roleId')} options={roleOptions} />
        <Input id="invite-city" label={t('access.columnCity')} value={form.city} onChange={setField('city')} />
      </div>
    </Modal>
  );
}

function StaffSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
