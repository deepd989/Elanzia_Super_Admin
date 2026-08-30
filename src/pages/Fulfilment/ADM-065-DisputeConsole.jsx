// ADM-065
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bot, IndianRupee, Search, Scale, TriangleAlert } from 'lucide-react';
import {
  Badge, Button, Checkbox, EmptyState, ErrorState, Input,
  PageHeader, Select, StatusPill, Tabs,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import { adminUsers } from '@/data/core';
import {
  assignDispute, clearDisputeFilters, fetchDisputeCounts, fetchDisputes,
  selectDisputeConsole, setDisputeFilters, setDisputePage, setDisputePageSize,
  setDisputeSearch, setDisputeSelection, toggleDisputeSelection,
} from '@/store/slices/trustSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SEVERITY_TONES = { medium: 'info', high: 'warning', critical: 'danger' };
const STATUS_TONES = {
  open: 'danger', awaiting_evidence: 'warning', under_review: 'info',
  resolved: 'success', closed: 'neutral',
};

const ASSIGNEE_OPTIONS = adminUsers
  .filter((user) => user.status === 'active')
  .map((user) => ({ value: user.id, label: user.name }));

const COLUMN_COUNT = 7;

export default function DisputeConsole() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data.
  const {
    disputes, total, query, counts, selectedIds, viewState, actionStatus, actionError, error,
  } = useSelector(selectDisputeConsole);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canResolve = grantedPermissions.includes('returns.dispute.resolve');

  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    dispatch(fetchDisputes());
    dispatch(fetchDisputeCounts());
  }, [dispatch, query]);

  // Handlers.
  const handleAssign = async () => {
    const result = await dispatch(assignDispute({ disputeIds: selectedIds, adminId: assignee }));
    if (!result.error) { setAssignee(''); dispatch(fetchDisputes()); }
  };

  const statusTabs = [
    { id: '', label: t('common.all'), count: total },
    ...['open', 'awaiting_evidence', 'under_review', 'resolved'].map((status) => ({
      id: status,
      label: t(`trust.disputeStatus.${status}`),
      count: counts?.byStatus?.[status] ?? 0,
    })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('trust.eyebrow')}
        title={t('trust.disputesTitle')}
        subtitle={t('trust.disputesSubtitle')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('trust.tileOpen')} value={formatNumber((counts?.byStatus?.open ?? 0) + (counts?.byStatus?.under_review ?? 0))} icon={Scale} loading={!counts} />
        <MetricTile label={t('trust.tileUnassigned')} value={formatNumber(counts?.unassigned ?? 0)} icon={TriangleAlert} invertTrend loading={!counts} />
        <MetricTile label={t('trust.tileBreached')} value={formatNumber(counts?.slaBreached ?? 0)} icon={TriangleAlert} invertTrend loading={!counts} />
        <MetricTile label={t('trust.tileValue')} value={formatINR(counts?.valueAtStake ?? 0)} icon={IndianRupee} loading={!counts} />
      </div>

      <Tabs
        activeId={query.filters.status}
        onChange={(status) => dispatch(setDisputeFilters({ ...query.filters, status }))}
        tabs={statusTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('trust.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setDisputeSearch(event.target.value))}
        />
        <Select
          id="type" className="w-52" placeholder={t('common.all')}
          value={query.filters.type}
          onChange={(event) => dispatch(setDisputeFilters({ ...query.filters, type: event.target.value }))}
          options={Object.keys(counts?.byType ?? {}).map((type) => ({ value: type, label: t(`trust.disputeType.${type}`) }))}
        />
        <Select
          id="severity" className="w-40" placeholder={t('common.all')}
          value={query.filters.severity}
          onChange={(event) => dispatch(setDisputeFilters({ ...query.filters, severity: event.target.value }))}
          options={['medium', 'high', 'critical'].map((value) => ({ value, label: t(`logistics.severity.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearDisputeFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 && canResolve ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-accent bg-accent-light/20 px-4 py-3">
          <span className="pb-2.5 text-base font-medium text-primary">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          <Select
            id="assignee" className="w-56" placeholder={t('logistics.assignTo')}
            value={assignee} onChange={(event) => setAssignee(event.target.value)} options={ASSIGNEE_OPTIONS}
          />
          <Button disabled={!assignee} loading={actionStatus === 'loading'} onClick={handleAssign}>
            {t('trust.assignSelected', { count: selectedIds.length })}
          </Button>
          <Button variant="ghost" onClick={() => dispatch(setDisputeSelection([]))}>{t('common.cancel')}</Button>
          {actionError ? <p className="w-full text-sm text-danger">{actionError.message}</p> : null}
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setDisputePage(page))}
            onPageSizeChange={(size) => dispatch(setDisputePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={selectedIds.length === disputes.length && disputes.length > 0}
              indeterminate={selectedIds.length > 0 && selectedIds.length < disputes.length}
              onChange={() => dispatch(setDisputeSelection(
                selectedIds.length === disputes.length ? [] : disputes.map((row) => row.id),
              ))}
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('trust.columnDispute')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnParties')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnRaised')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('trust.columnValue')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnOwner')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            disputes.map((dispute) => (
              <TableShell.Row
                key={dispute.id}
                selected={selectedIds.includes(dispute.id)}
                onClick={() => navigate(`/trust/disputes/${dispute.id}`)}
              >
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${dispute.id}`}
                    checked={selectedIds.includes(dispute.id)}
                    onChange={() => dispatch(toggleDisputeSelection(dispute.id))}
                  />
                </TableShell.SelectCell>
                <TableShell.Cell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-charcoal">{dispute.subject}</span>
                    <StatusPill tone={SEVERITY_TONES[dispute.severity]} size="sm">
                      {t(`trust.disputeType.${dispute.type}`)}
                    </StatusPill>
                    {/* Opened by the weigh-in check rather than a person. */}
                    {dispute.autoRaised ? (
                      <Badge tone="outline" title={t('trust.autoRaisedHelp')}>
                        <Bot size={11} aria-hidden="true" />
                      </Badge>
                    ) : null}
                  </span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {dispute.id} · {dispute.orderId}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {dispute.jewellerName}
                  <span className="block text-xs text-charcoal-light">{dispute.manufacturerName}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDateTime(dispute.raisedAt)}
                  <span className={`block text-xs ${dispute.slaBreached ? 'text-danger' : 'text-charcoal-light'}`}>
                    {dispute.slaBreached ? t('trust.slaBreached') : formatRelativeTime(dispute.raisedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatINR(dispute.claimValue)}</TableShell.Cell>
                <TableShell.Cell>
                  {dispute.assigneeName ?? <span className="text-xs text-warning">{t('logistics.unassigned')}</span>}
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[dispute.status]}>
                    {t(`trust.disputeStatus.${dispute.status}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT + 1}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchDisputes())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearDisputeFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
