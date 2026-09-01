// ADM-059
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, RotateCw, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearIrnFilters,
  dismissStillFailing,
  fetchIrnFailures,
  retryIrn,
  selectIrnFailures,
  setIrnFilters,
  setIrnPage,
  setIrnPageSize,
  setIrnSearch,
  setIrnSelection,
  toggleIrnSelection,
} from '@/store/slices/taxSlice';
import { formatDate, formatINR, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const COLUMN_COUNT = 8;

export default function IrnFailureQueue() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    failures,
    total,
    query,
    viewState,
    failedValue,
    facets,
    selectedIds,
    allSelected,
    someSelected,
    selectedNeedingJeweller,
    actionStatus,
    actionError,
    stillFailing,
  } = useSelector(selectIrnFailures);

  useEffect(() => {
    dispatch(fetchIrnFailures());
  }, [dispatch, query]);

  // Handlers.
  const handleSelectAll = () =>
    dispatch(setIrnSelection(allSelected ? [] : failures.map((row) => row.id)));

  const handleRetry = async () => {
    const result = await dispatch(retryIrn({ einvoiceIds: selectedIds }));
    if (!result.error) dispatch(fetchIrnFailures());
  };

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('tax.eyebrow')}
        title={t('tax.irnFailuresTitle')}
        subtitle={t('tax.irnFailuresSubtitle')}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="danger" label={formatNumber(total)} />
            <StatusPill tone="neutral" label={`${t('tax.failedValue')}: ${formatINR(failedValue)}`} />
          </div>
        }
      />

      {/* The portal rejects a recipient GSTIN problem however many times it is
          asked. Saying which retries changed nothing stops the desk repeating
          them all afternoon. */}
      {stillFailing.length > 0 ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-warning/40 bg-warning-surface px-4 py-3">
          <div>
            <p className="text-base font-medium text-charcoal">
              {t('tax.stillFailingTitle', { count: stillFailing.length })}
            </p>
            <p className="text-sm text-charcoal-light">{t('tax.stillFailingBody')}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => dispatch(dismissStillFailing())}>
            {t('common.close')}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('tax.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setIrnSearch(event.target.value))}
        />
        <Select
          id="failure"
          className="w-60"
          placeholder={t('tax.filter.failure')}
          value={query.filters.failureCode}
          onChange={(event) => dispatch(setIrnFilters({ ...query.filters, failureCode: event.target.value }))}
          options={facets.failureCodes.map((row) => ({
            value: row.value,
            label: t(`tax.failureCode.${row.value}`),
          }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearIrnFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-warning-surface px-4 py-2.5">
          <span className="text-base font-medium text-charcoal">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          {selectedNeedingJeweller > 0 ? (
            <Badge tone="warning">{t('tax.needsJeweller', { count: selectedNeedingJeweller })}</Badge>
          ) : null}
          {actionError ? <span className="text-sm text-danger">{actionError.message}</span> : null}
          <Button
            size="sm"
            variant="secondary"
            iconLeft={RotateCw}
            loading={actionStatus === 'loading'}
            onClick={handleRetry}
          >
            {t('tax.retrySelected')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setIrnSelection([]))}>
            {t('common.cancel')}
          </Button>
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setIrnPage(page))}
            onPageSizeChange={(size) => dispatch(setIrnPageSize(size))}
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
          <TableShell.HeadCell>{t('tax.column.document')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.supplier')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.recipient')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('tax.column.total')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.failure')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.attempts')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.date')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            failures.map((row) => (
              <TableShell.Row
                key={row.id}
                selected={selectedIds.includes(row.id)}
                onClick={() => dispatch(toggleIrnSelection(row.id))}
              >
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${row.id}`}
                    checked={selectedIds.includes(row.id)}
                    onChange={() => dispatch(toggleIrnSelection(row.id))}
                  />
                </TableShell.SelectCell>

                <TableShell.Cell>
                  <span className="font-mono text-sm text-charcoal">{row.documentNumber}</span>
                  <span className="block text-xs text-charcoal-light">{row.orderId}</span>
                </TableShell.Cell>
                <TableShell.Cell>{row.manufacturerName}</TableShell.Cell>
                <TableShell.Cell>
                  {row.jewellerName}
                  <span className="block font-mono text-xs text-charcoal-light">{row.recipientGstin}</span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.invoiceValue)}
                </TableShell.Cell>
                <TableShell.Cell>
                  <span className="text-charcoal">{t(`tax.failureCode.${row.failureCode}`)}</span>
                  <span className="block text-xs text-charcoal-light">{row.failureReason}</span>
                </TableShell.Cell>
                <TableShell.Cell>{t('tax.attempts', { count: row.retryCount })}</TableShell.Cell>
                <TableShell.Cell>
                  {row.attemptedAt ? formatDate(row.attemptedAt) : '-'}
                  {row.attemptedAt ? (
                    <span className="block text-xs text-charcoal-light">
                      {formatRelativeTime(row.attemptedAt)}
                    </span>
                  ) : null}
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchIrnFailures())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearIrnFilters())}
                />
              ) : null}
              {/* Every invoice registering is the all clear, not an empty list. */}
              {viewState === 'empty' ? (
                <EmptyState icon={CheckCircle2} title={t('tax.irnEmptyTitle')} body={t('tax.irnEmptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function QueueSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
