// ADM-012
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  acknowledgeAlerts,
  clearAlertFilters,
  fetchAlertCounts,
  fetchAlerts,
  resolveAlerts,
  selectAlertsQueue,
  setAlertFilters,
  setAlertPage,
  setAlertPageSize,
  setAlertSearch,
  setAlertSelection,
  setAlertSort,
  toggleAlertSelection,
} from '@/store/slices/operationsSlice';
import { formatDate, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SEVERITY_TONES = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

const STATUS_TONES = {
  open: 'danger',
  acknowledged: 'info',
  snoozed: 'neutral',
  resolved: 'success',
};

const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low'].map((value) => ({
  value,
  label: t(`operations.severity.${value}`),
}));

const STATUS_OPTIONS = ['open', 'acknowledged', 'snoozed', 'resolved'].map((value) => ({
  value,
  label: t(`operations.status.${value}`),
}));

const CATEGORY_OPTIONS = [
  'verification_ageing',
  'listing_moderation',
  'order_intervention',
  'payment_failed',
  'payout_failed',
  'irn_failed',
  'dispute_open',
  'return_pending_verification',
  'feed_degraded',
  'catalogue_integrity',
  'ticket_sla_breach',
].map((value) => ({ value, label: t(`operations.category.${value}`) }));

const COLUMN_COUNT = 8;

export default function AlertsQueue() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Data. ONE selector - this is the seam.
  const {
    alerts,
    total,
    query,
    counts,
    selectedIds,
    allSelected,
    someSelected,
    viewState,
    error,
    actionStatus,
    actionError,
  } = useSelector(selectAlertsQueue);

  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');

  // A work queue tile on ADM-010 links here with its category attached, so the
  // tile and the queue it opens are showing the same rows.
  const categoryParam = searchParams.get('category');
  useEffect(() => {
    if (categoryParam) dispatch(setAlertFilters({ ...query.filters, category: categoryParam }));
    // Only ever on the incoming link, never on later filter edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, categoryParam]);

  useEffect(() => {
    dispatch(fetchAlerts());
    dispatch(fetchAlertCounts());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setAlertFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setAlertSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  const handleSelectAll = () =>
    dispatch(setAlertSelection(allSelected ? [] : alerts.map((alert) => alert.id)));

  const handleAcknowledge = async () => {
    const result = await dispatch(acknowledgeAlerts({ alertIds: selectedIds }));
    if (!result.error) dispatch(fetchAlertCounts());
  };

  const handleResolve = async () => {
    const result = await dispatch(resolveAlerts({ alertIds: selectedIds, note }));
    if (result.error) return;
    setResolving(false);
    setNote('');
    dispatch(fetchAlerts());
    dispatch(fetchAlertCounts());
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('operations.eyebrow')}
        title={t('operations.alertsTitle')}
        subtitle={t('operations.alertsSubtitle')}
        meta={
          counts ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone="danger">{t('operations.alertsOpenCount', { count: counts.open })}</StatusPill>
              {counts.bySeverity.critical > 0 ? (
                <StatusPill tone="danger" dot>
                  {t('operations.alertsCriticalCount', { count: counts.bySeverity.critical })}
                </StatusPill>
              ) : null}
              {counts.slaBreached > 0 ? (
                <StatusPill tone="warning">
                  {t('operations.alertsBreachedCount', { count: counts.slaBreached })}
                </StatusPill>
              ) : null}
            </span>
          ) : null
        }
      />

      {/* Filter row. Search first and widest, then the narrow selects, then the
          clear action pushed right. Same order on every queue. */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('operations.alertsSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setAlertSearch(event.target.value))}
        />
        <Select
          id="severity"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.severity}
          onChange={setFilter('severity')}
          options={SEVERITY_OPTIONS}
        />
        <Select
          id="category"
          className="w-52"
          placeholder={t('common.all')}
          value={query.filters.category}
          onChange={setFilter('category')}
          options={CATEGORY_OPTIONS}
        />
        <Select
          id="status"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearAlertFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-accent-light/20 px-4 py-2.5">
          <span className="text-base font-medium text-primary">
            {t('operations.selectedCount', { count: selectedIds.length })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            loading={actionStatus === 'loading'}
            onClick={handleAcknowledge}
          >
            {t('operations.acknowledge')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setResolving(true)}>
            {t('operations.resolve')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setAlertSelection([]))}>
            {t('common.cancel')}
          </Button>
          {actionError ? (
            <span className="text-sm text-danger">{actionError.message}</span>
          ) : null}
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setAlertPage(page))}
            onPageSizeChange={(size) => dispatch(setAlertPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('operations.columnAlert')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('operations.columnCategory')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('operations.columnEntity')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'raisedAt' ? query.sortDir : null}
            onSort={() => handleSort('raisedAt')}
          >
            {t('operations.columnRaised')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell align="right">{t('operations.columnValue')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'severity' ? query.sortDir : null}
            onSort={() => handleSort('severity')}
          >
            {t('operations.columnSeverity')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                selected={selectedIds.includes(alert.id)}
                onToggle={() => dispatch(toggleAlertSelection(alert.id))}
                onOpen={() => navigate(alert.targetPath)}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <AlertsSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAlerts())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearAlertFilters())}
                />
              ) : null}
              {/* Not "nothing here yet". An empty open queue means the platform
                  is healthy, and that deserves saying out loud. */}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={AlertTriangle}
                  title={t('operations.alertsAllClearTitle')}
                  body={t('operations.alertsAllClearBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={resolving}
        onClose={() => setResolving(false)}
        onConfirm={handleResolve}
        loading={actionStatus === 'loading'}
        title={t('operations.resolveTitle', { count: selectedIds.length })}
        body={t('operations.resolveBody')}
        confirmLabel={t('operations.resolve')}
      >
        <Textarea
          id="resolution-note"
          className="mt-4"
          rows={3}
          required
          label={t('operations.resolveNote')}
          help={t('operations.resolveNoteHelp')}
          error={actionError?.code === 'resolution_note_required' ? actionError.message : undefined}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

function AlertRow({ alert, selected, onToggle, onOpen }) {
  return (
    <TableShell.Row selected={selected} onClick={onOpen}>
      <TableShell.SelectCell>
        <Checkbox id={`select-${alert.id}`} checked={selected} onChange={onToggle} />
      </TableShell.SelectCell>

      <TableShell.Cell>
        <span className="font-medium text-charcoal">{alert.title}</span>
        <span className="block text-xs text-charcoal-light">{alert.detail}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        <Badge tone="outline">{t(`operations.category.${alert.category}`)}</Badge>
      </TableShell.Cell>

      <TableShell.Cell>
        <span className="text-charcoal">{alert.entityLabel}</span>
        <span className="block font-mono text-xs text-charcoal-light">{alert.entityId}</span>
      </TableShell.Cell>

      {/* Absolute date on top, relative underneath - an ageing exception has to
          be obvious without doing arithmetic. */}
      <TableShell.Cell>
        {formatDate(alert.raisedAt)}
        <span
          className={`block text-xs ${alert.slaBreached ? 'text-danger' : 'text-charcoal-light'}`}
        >
          {formatRelativeTime(alert.raisedAt)}
          {alert.slaBreached ? ` · ${t('operations.pastSla')}` : ''}
        </span>
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatINR(alert.amount)}
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={SEVERITY_TONES[alert.severity]}>
          {t(`operations.severity.${alert.severity}`)}
        </StatusPill>
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={STATUS_TONES[alert.status]}>
          {t(`operations.status.${alert.status}`)}
        </StatusPill>
        <span className="block text-xs text-charcoal-light">
          {alert.assigneeName ?? t('operations.unassigned')}
        </span>
      </TableShell.Cell>
    </TableShell.Row>
  );
}

function AlertsSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
