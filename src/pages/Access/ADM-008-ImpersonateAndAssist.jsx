// ADM-008
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, UserCog } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
  Modal,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearTargetFilters,
  fetchImpersonationSessions,
  fetchImpersonationTargets,
  selectImpersonation,
  setTargetFilters,
  setTargetPage,
  setTargetPageSize,
  setTargetSearch,
  startImpersonation,
} from '@/store/slices/accessSlice';
import { formatDateTime, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const TYPE_OPTIONS = [
  { value: 'manufacturer', label: t('access.manufacturer') },
  { value: 'jeweller', label: t('access.jeweller') },
];

const MODE_OPTIONS = [
  { value: 'read_only', label: t('access.modeReadOnly') },
  { value: 'assist', label: t('access.modeAssist') },
];

const COLUMN_COUNT = 5;

export default function ImpersonateAndAssist() {
  const dispatch = useDispatch();

  // Data.
  const {
    targets,
    total,
    query,
    sessions,
    sessionsViewState,
    active,
    canImpersonate,
    viewState,
    actionStatus,
    actionError,
    error,
  } = useSelector(selectImpersonation);

  const [starting, setStarting] = useState(null); // the target being opened

  useEffect(() => {
    dispatch(fetchImpersonationTargets());
  }, [dispatch, query]);

  useEffect(() => {
    dispatch(fetchImpersonationSessions());
  }, [dispatch, active]);

  // Handlers.
  const handleStart = async ({ reason, mode }) => {
    const result = await dispatch(
      startImpersonation({
        targetType: starting.targetType,
        targetId: starting.id,
        reason,
        mode,
      }),
    );
    if (!result.error) setStarting(null);
  };

  // Markup.
  // The permission gate is rendered rather than routed, so an admin who lost
  // the grant mid-session sees why rather than a blank screen.
  if (!canImpersonate) {
    return (
      <Card>
        <EmptyState
          icon={UserCog}
          title={t('access.noPermissionTitle')}
          body={t('access.noPermissionBody')}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={t('access.impersonateTitle')}
        subtitle={t('access.impersonateSubtitle')}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-80"
          iconLeft={Search}
          placeholder={t('access.impersonateSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setTargetSearch(event.target.value))}
        />
        <Select
          id="target-type"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.targetType}
          onChange={(event) =>
            dispatch(setTargetFilters({ ...query.filters, targetType: event.target.value }))
          }
          options={TYPE_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearTargetFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setTargetPage(page))}
            onPageSizeChange={(size) => dispatch(setTargetPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('access.columnBusiness')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('access.targetType')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('access.columnCity')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('access.columnLastActive')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            targets.map((target) => (
              <TableShell.Row key={`${target.targetType}-${target.id}`}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{target.businessName}</span>
                  <span className="block text-xs text-charcoal-light">
                    {target.contactName} · {target.id}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={target.targetType === 'manufacturer' ? 'accent' : 'info'}>
                    {t(`access.${target.targetType}`)}
                  </StatusPill>
                </TableShell.Cell>
                <TableShell.Cell>{target.city}</TableShell.Cell>
                <TableShell.Cell>
                  {target.lastActiveAt ? formatRelativeTime(target.lastActiveAt) : t('common.notAvailable')}
                </TableShell.Cell>
                <TableShell.ActionsCell>
                  {target.status === 'suspended' ? (
                    <span className="text-xs text-charcoal-light">
                      {t('access.suspendedCannotAssist')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(active)}
                      onClick={() => setStarting(target)}
                    >
                      {t('access.assist')}
                    </Button>
                  )}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <TargetSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchImpersonationTargets())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearTargetFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <AuditTrail sessions={sessions} viewState={sessionsViewState} />

      <StartSessionModal
        target={starting}
        saving={actionStatus === 'loading'}
        error={actionError}
        onClose={() => setStarting(null)}
        onSubmit={handleStart}
      />
    </div>
  );
}

// Every impersonation is logged with who, whom and why. An impersonation
// nobody can justify afterwards is indistinguishable from an admin reading a
// member's private trade data for their own reasons.
function AuditTrail({ sessions, viewState }) {
  return (
    <Card title={t('access.auditTitle')} description={t('access.auditSubtitle')} padded={false}>
      {viewState === 'populated' ? (
        <ul className="divide-y divide-lightGray">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-base text-charcoal">
                  <span className="font-medium">{session.adminName}</span>
                  {' · '}
                  {session.targetName}
                </p>
                <p className="text-xs text-charcoal-light">{session.reason}</p>
              </div>

              <StatusPill tone={session.mode === 'assist' ? 'warning' : 'neutral'} size="sm">
                {session.mode === 'assist' ? t('access.modeAssist') : t('access.modeReadOnly')}
              </StatusPill>

              <div className="shrink-0 text-right">
                <p className="text-xs text-charcoal">{formatDateTime(session.startedAt)}</p>
                <p className="text-xs text-charcoal-light num">
                  {session.endedAt
                    ? t('access.durationMinutes', { count: session.durationMinutes })
                    : t('access.activeBannerTitle', { business: '' })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : viewState === 'loading' ? (
        <TargetSkeleton rows={4} />
      ) : (
        <EmptyState />
      )}
    </Card>
  );
}

function StartSessionModal({ target, saving, error, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('read_only');
  const [reasonError, setReasonError] = useState(null);

  useEffect(() => {
    if (target) {
      setReason('');
      setMode('read_only');
      setReasonError(null);
    }
  }, [target]);

  const handleSubmit = () => {
    if (!reason.trim()) {
      setReasonError(t('validation.requiredField'));
      return;
    }
    onSubmit({ reason, mode });
  };

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title={t('access.startTitle', { business: target?.businessName ?? '' })}
      description={t('access.startBody')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={handleSubmit}>{t('access.startSession')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <Textarea
          id="session-reason"
          rows={3}
          required
          label={t('access.sessionReason')}
          help={t('access.sessionReasonHelp')}
          value={reason}
          error={reasonError}
          onChange={(event) => setReason(event.target.value)}
        />
        <Select
          id="session-mode"
          label={t('access.sessionMode')}
          help={mode === 'assist' ? t('access.modeAssistHelp') : t('access.modeReadOnlyHelp')}
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          options={MODE_OPTIONS}
        />
        {error ? <p className="text-sm text-danger">{error.message}</p> : null}
      </div>
    </Modal>
  );
}

function TargetSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
