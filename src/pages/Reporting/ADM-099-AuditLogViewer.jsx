// ADM-099
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import {
  Button, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Spinner, StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearAuditFilters,
  fetchAuditEntries,
  fetchAuditEntry,
  openAuditEntry,
  selectAuditLog,
  setAuditFilters,
  setAuditPage,
  setAuditPageSize,
  setAuditSearch,
} from '@/store/slices/reportingSlice';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SEVERITY_TONES = {
  info: 'neutral',
  notable: 'info',
  sensitive: 'warning',
};

const COLUMN_COUNT = 5;

export default function AuditLogViewer() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    entries, total, query, facets, retentionMonths,
    openId, entry, entryState, entryError, viewState, error,
  } = useSelector(selectAuditLog);

  useEffect(() => {
    dispatch(fetchAuditEntries());
  }, [dispatch, query]);

  useEffect(() => {
    if (openId) dispatch(fetchAuditEntry(openId));
  }, [dispatch, openId]);

  // Handlers. There are no others, and there never will be - see the notice
  // below the header.
  const handleFilter = (field) => (event) =>
    dispatch(setAuditFilters({ ...query.filters, [field]: event.target.value }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('reports.auditTitle')}
        subtitle={t('reports.auditSubtitle')}
        meta={<StatusPill tone="info">{formatNumber(total)}</StatusPill>}
      />

      {/* This screen carries no action buttons anywhere, and that is deliberate
          rather than unfinished. A log an admin can edit proves nothing about
          what an admin did, so there is no endpoint behind an edit to call. */}
      <p className="text-sm text-charcoal-light">
        {t('reports.auditReadOnly')}{' '}
        {retentionMonths ? t('reports.auditRetention', { months: formatNumber(retentionMonths) }) : null}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-80"
          iconLeft={Search}
          placeholder={t('reports.auditSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setAuditSearch(event.target.value))}
        />
        <Select
          id="module"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.module}
          onChange={handleFilter('module')}
          options={facets?.module ?? []}
        />
        <Select
          id="action"
          className="w-56"
          placeholder={t('common.all')}
          value={query.filters.action}
          onChange={handleFilter('action')}
          options={facets?.action ?? []}
        />
        <Select
          id="actor"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.actorId}
          onChange={handleFilter('actorId')}
          options={facets?.actorId ?? []}
        />
        <Select
          id="severity"
          className="w-40"
          placeholder={t('common.all')}
          value={query.filters.severity}
          onChange={handleFilter('severity')}
          options={(facets?.severity ?? []).map(({ value }) => ({
            value,
            label: t(`reports.severity.${value}`),
          }))}
        />
        <Input
          id="from"
          type="date"
          className="w-40"
          label={t('reports.dateFrom')}
          value={query.filters.from}
          onChange={handleFilter('from')}
        />
        <Input
          id="to"
          type="date"
          className="w-40"
          label={t('reports.dateTo')}
          value={query.filters.to}
          onChange={handleFilter('to')}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearAuditFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setAuditPage(page))}
            onPageSizeChange={(size) => dispatch(setAuditPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('reports.column.at')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('reports.column.actor')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('reports.column.action')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('reports.column.entity')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('reports.severity.label')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            entries.map((row) => (
              <TableShell.Row key={row.id} onClick={() => dispatch(openAuditEntry(row.id))}>
                <TableShell.Cell>
                  {formatDateTime(row.at)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(row.at)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.actorName}</span>
                  <span className="block text-xs text-charcoal-light">{row.actorRoleName}</span>
                  {/* An action taken as somebody else is the one an actor is
                      least likely to own up to, so it is on the row rather than
                      one click away. */}
                  {row.onBehalfOfName ? (
                    <span className="block text-xs text-warning">
                      {t('reports.onBehalfOf', { name: row.onBehalfOfName })}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">{row.action}</TableShell.Cell>
                <TableShell.Cell>
                  {row.entityLabel}
                  <span className="block font-mono text-xs text-charcoal-light">{row.entityId}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={SEVERITY_TONES[row.severity]} size="sm">
                    {t(`reports.severity.${row.severity}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAuditEntries())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearAuditFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState title={t('reports.auditEmptyTitle')} body={t('reports.auditEmptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={Boolean(openId)}
        onClose={() => dispatch(openAuditEntry(null))}
        title={t('reports.entryTitle')}
        description={
          entry ? t('reports.entryDescription', { action: entry.action, entity: entry.entityLabel }) : undefined
        }
        size="lg"
      >
        <EntryDetail state={entryState} entry={entry} error={entryError} />
      </Modal>
    </div>
  );
}

function EntryDetail({ state, entry, error }) {
  if (state === 'loading') {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (state === 'error') return <ErrorState detail={error?.message} />;
  if (!entry) return null;

  return (
    <div className="flex flex-col gap-field">
      <dl className="grid grid-cols-2 gap-3 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
        <MetaRow label={t('reports.column.at')} value={formatDateTime(entry.at)} />
        <MetaRow label={t('reports.column.actor')} value={`${entry.actorName} · ${entry.actorRoleName}`} />
        <MetaRow label={t('reports.column.area')} value={entry.module} />
        <MetaRow label={t('reports.requestId')} value={entry.requestId} mono />
        <MetaRow label={t('reports.ipAddress')} value={entry.ipAddress} mono />
        <MetaRow label={t('reports.device')} value={entry.userAgent} />
      </dl>

      <p className="text-base text-charcoal">{entry.summary}</p>

      <div>
        <h4 className="mb-2 font-display text-base text-primary">{t('reports.changesTitle')}</h4>
        {entry.changes.length === 0 ? (
          <p className="text-sm text-charcoal-light">{t('reports.noChanges')}</p>
        ) : (
          <TableShell>
            <TableShell.Head>
              <TableShell.HeadCell>{t('reports.changeField')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('reports.changeBefore')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('reports.changeAfter')}</TableShell.HeadCell>
            </TableShell.Head>
            <TableShell.Body>
              {entry.changes.map((change) => (
                <TableShell.Row key={change.field}>
                  <TableShell.Cell className="font-mono text-xs">{change.field}</TableShell.Cell>
                  <TableShell.Cell className="text-charcoal-light">{change.before}</TableShell.Cell>
                  <TableShell.Cell className="font-medium text-charcoal">{change.after}</TableShell.Cell>
                </TableShell.Row>
              ))}
            </TableShell.Body>
          </TableShell>
        )}
      </div>

      {entry.relatedEntryIds.length > 0 ? (
        <p className="text-xs text-charcoal-light">
          {t('reports.relatedEntries', { count: entry.relatedEntryIds.length })}
        </p>
      ) : null}
    </div>
  );
}

function MetaRow({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-light">{label}</dt>
      <dd className={mono ? 'font-mono text-xs text-charcoal' : 'text-sm text-charcoal'}>{value}</dd>
    </div>
  );
}

function RowSkeleton({ rows = 12 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
