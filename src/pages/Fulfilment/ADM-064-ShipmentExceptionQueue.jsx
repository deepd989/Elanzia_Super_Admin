// ADM-064
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import {
  Badge, Button, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input,
  PageHeader, Select, StatusPill, Tabs, Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import { adminUsers } from '@/data/core';
import {
  assignException, clearExceptionFilters, fetchExceptionCounts, fetchExceptions,
  resolveException, selectExceptionQueue, setExceptionFilters, setExceptionPage,
  setExceptionPageSize, setExceptionSearch, setExceptionSelection, toggleExceptionSelection,
} from '@/store/slices/logisticsSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SEVERITY_TONES = { medium: 'info', high: 'warning', critical: 'danger' };
const STATE_TONES = { open: 'danger', investigating: 'warning', resolved: 'success' };

const SEVERITY_OPTIONS = ['medium', 'high', 'critical'].map((value) => ({
  value, label: t(`logistics.severity.${value}`),
}));

const ASSIGNEE_OPTIONS = adminUsers
  .filter((user) => user.status === 'active')
  .map((user) => ({ value: user.id, label: user.name }));

const COLUMN_COUNT = 7;

export default function ShipmentExceptionQueue() {
  const dispatch = useDispatch();

  // Data.
  const {
    exceptions, total, query, counts, selectedIds, viewState, actionStatus, actionError, error,
  } = useSelector(selectExceptionQueue);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canEdit = grantedPermissions.includes('logistics.edit');

  const [assignee, setAssignee] = useState('');
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    dispatch(fetchExceptions());
    dispatch(fetchExceptionCounts());
  }, [dispatch, query]);

  // Handlers.
  const handleAssign = async () => {
    const result = await dispatch(assignException({ exceptionIds: selectedIds, adminId: assignee }));
    if (!result.error) { setAssignee(''); dispatch(fetchExceptions()); }
  };

  const handleResolve = async () => {
    const result = await dispatch(resolveException({ id: resolving.id, note }));
    setResolving(null); setNote('');
    if (!result.error) { dispatch(fetchExceptions()); dispatch(fetchExceptionCounts()); }
  };

  const typeTabs = [
    { id: '', label: t('common.all'), count: total },
    ...Object.entries(counts?.byType ?? {}).map(([type, count]) => ({
      id: type, label: t(`logistics.exceptionType.${type}`), count,
    })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('logistics.eyebrow')}
        title={t('logistics.exceptionsTitle')}
        subtitle={t('logistics.exceptionsSubtitle')}
        meta={
          counts ? (
            <>
              <StatusPill tone="danger">{t('logistics.tileBreached')} {counts.slaBreached}</StatusPill>
              <StatusPill tone="warning">{t('logistics.unassigned')} {counts.unassigned}</StatusPill>
            </>
          ) : null
        }
      />

      <Tabs
        activeId={query.filters.type}
        onChange={(type) => dispatch(setExceptionFilters({ ...query.filters, type }))}
        tabs={typeTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('logistics.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setExceptionSearch(event.target.value))}
        />
        <Select
          id="severity" className="w-40" placeholder={t('common.all')}
          value={query.filters.severity}
          onChange={(event) => dispatch(setExceptionFilters({ ...query.filters, severity: event.target.value }))}
          options={SEVERITY_OPTIONS}
        />
        <Select
          id="state" className="w-44" placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) => dispatch(setExceptionFilters({ ...query.filters, state: event.target.value }))}
          options={['open', 'investigating', 'resolved'].map((value) => ({ value, label: t(`logistics.exceptionState.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearExceptionFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 && canEdit ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-accent bg-warning-surface px-4 py-3">
          <span className="pb-2.5 text-base font-medium text-charcoal">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          <Select
            id="assignee" className="w-56" placeholder={t('logistics.assignTo')}
            value={assignee} onChange={(event) => setAssignee(event.target.value)}
            options={ASSIGNEE_OPTIONS}
          />
          <Button size="md" disabled={!assignee} loading={actionStatus === 'loading'} onClick={handleAssign}>
            {t('logistics.assignSelected', { count: selectedIds.length })}
          </Button>
          <Button variant="ghost" onClick={() => dispatch(setExceptionSelection([]))}>{t('common.cancel')}</Button>
          {actionError ? <p className="w-full text-sm text-danger">{actionError.message}</p> : null}
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setExceptionPage(page))}
            onPageSizeChange={(size) => dispatch(setExceptionPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={selectedIds.length === exceptions.length && exceptions.length > 0}
              indeterminate={selectedIds.length > 0 && selectedIds.length < exceptions.length}
              onChange={() => dispatch(setExceptionSelection(
                selectedIds.length === exceptions.length ? [] : exceptions.map((row) => row.id),
              ))}
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('logistics.columnException')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnAwb')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnRaised')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnValue')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnAssignee')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            exceptions.map((exception) => (
              <TableShell.Row key={exception.id} selected={selectedIds.includes(exception.id)}>
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${exception.id}`}
                    checked={selectedIds.includes(exception.id)}
                    onChange={() => dispatch(toggleExceptionSelection(exception.id))}
                  />
                </TableShell.SelectCell>
                <TableShell.Cell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-charcoal">{exception.summary}</span>
                    <StatusPill tone={SEVERITY_TONES[exception.severity]} size="sm">
                      {t(`logistics.severity.${exception.severity}`)}
                    </StatusPill>
                    {exception.claimEligible ? <Badge tone="outline">{t('logistics.claimEligible')}</Badge> : null}
                  </span>
                  <span className="block max-w-xl text-xs text-charcoal-light">{exception.impact}</span>
                </TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">
                  {exception.awb}
                  <span className="block text-charcoal-light">{exception.orderId}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDateTime(exception.raisedAt)}
                  <span className={`block text-xs ${exception.slaBreached ? 'text-danger' : 'text-charcoal-light'}`}>
                    {formatRelativeTime(exception.raisedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatINR(exception.declaredValue)}</TableShell.Cell>
                <TableShell.Cell>
                  {exception.assigneeName ?? (
                    <span className="text-xs text-warning">{t('logistics.unassigned')}</span>
                  )}
                  <StatusPill tone={STATE_TONES[exception.state]} size="sm" className="mt-1">
                    {t(`logistics.exceptionState.${exception.state}`)}
                  </StatusPill>
                </TableShell.Cell>
                <TableShell.ActionsCell>
                  {exception.state !== 'resolved' && canEdit ? (
                    <Button size="sm" variant="ghost" onClick={() => setResolving(exception)}>
                      {t('logistics.resolveException')}
                    </Button>
                  ) : null}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT + 1}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchExceptions())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearExceptionFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={Boolean(resolving)}
        onClose={() => setResolving(null)}
        onConfirm={handleResolve}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('logistics.resolveTitle')}
        body={t('logistics.resolveBody')}
        confirmLabel={t('logistics.resolveException')}
      >
        <Textarea
          id="resolve-note" className="mt-4" rows={3} required
          label={t('logistics.resolveNote')}
          value={note} onChange={(event) => setNote(event.target.value)}
        />
        {actionError ? <p className="mt-2 text-sm text-danger">{actionError.message}</p> : null}
      </ConfirmDialog>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
