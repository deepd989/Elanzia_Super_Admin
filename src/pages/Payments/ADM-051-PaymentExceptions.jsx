// ADM-051
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearExceptionFilters,
  fetchExceptions,
  resolveExceptions,
  selectPaymentExceptions,
  setExceptionFilters,
  setExceptionPage,
  setExceptionPageSize,
  setExceptionSearch,
  setExceptionSelection,
  setExceptionSort,
  toggleExceptionSelection,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SEVERITY_TONES = { high: 'danger', medium: 'warning', low: 'neutral' };

const KIND_OPTIONS = [
  'unmatched_receipt',
  'amount_mismatch',
  'duplicate_credit',
  'short_payment',
  'late_credit',
  'missing_capture',
].map((value) => ({ value, label: t(`payments.kind.${value}`) }));

const SEVERITY_OPTIONS = ['high', 'medium', 'low'].map((value) => ({
  value,
  label: t(`payments.severity.${value}`),
}));

const STATUS_OPTIONS = ['open', 'resolved'].map((value) => ({
  value,
  label: t(`payments.exceptionStatus.${value}`),
}));

const RESOLUTION_OPTIONS = [
  { value: 'matched_to_order', label: t('payments.resolve.matched') },
  { value: 'refunded_to_remitter', label: t('payments.resolve.refunded') },
  { value: 'written_off', label: t('payments.resolve.writtenOff') },
];

const COLUMN_COUNT = 9;

export default function PaymentExceptions() {
  const dispatch = useDispatch();
  const [resolveOpen, setResolveOpen] = useState(false);

  // Data. ONE selector - this is the seam.
  const {
    exceptions,
    total,
    query,
    viewState,
    openCount,
    openValue,
    facets,
    selectedIds,
    allSelected,
    someSelected,
    selectedValue,
    actionStatus,
    actionError,
  } = useSelector(selectPaymentExceptions);

  useEffect(() => {
    dispatch(fetchExceptions());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setExceptionFilters({ ...query.filters, [field]: event.target.value }));

  const handleSelectAll = () =>
    dispatch(setExceptionSelection(allSelected ? [] : exceptions.map((row) => row.id)));

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.exceptionsTitle')}
        subtitle={t('payments.exceptionsSubtitle')}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="warning" label={t('payments.openExceptions', { count: openCount })} />
            <StatusPill tone="neutral" label={`${t('payments.openValue')} ${formatINR(openValue)}`} />
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('payments.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setExceptionSearch(event.target.value))}
        />
        <Select
          id="kind"
          className="w-52"
          placeholder={t('payments.filter.kind')}
          value={query.filters.kind}
          onChange={setFilter('kind')}
          options={KIND_OPTIONS}
        />
        <Select
          id="severity"
          className="w-40"
          placeholder={t('payments.filter.severity')}
          value={query.filters.severity}
          onChange={setFilter('severity')}
          options={SEVERITY_OPTIONS}
        />
        <Select
          id="status"
          className="w-40"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearExceptionFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-warning-surface px-4 py-2.5">
          <span className="text-base font-medium text-charcoal">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          {/* Two exceptions worth two lakh is a different decision from two
              worth two thousand, so the value comes with the count. */}
          <span className="text-sm text-charcoal-light">
            {t('payments.selectedValue', { value: formatINR(selectedValue) })}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setResolveOpen(true)}>
            {t('payments.resolveSelected')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setExceptionSelection([]))}>
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
            onPageChange={(page) => dispatch(setExceptionPage(page))}
            onPageSizeChange={(size) => dispatch(setExceptionPageSize(size))}
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
          <TableShell.HeadCell>{t('payments.column.exception')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.remitter')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.utr')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.expected')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.received')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.variance')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'raisedAt' ? query.sortDir : null}
            onSort={() =>
              dispatch(setExceptionSort({ sortBy: 'raisedAt', sortDir: query.sortDir === 'desc' ? 'asc' : 'desc' }))
            }
          >
            {t('payments.column.raised')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            exceptions.map((row) => (
              <TableShell.Row
                key={row.id}
                selected={selectedIds.includes(row.id)}
                onClick={() => dispatch(toggleExceptionSelection(row.id))}
              >
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${row.id}`}
                    checked={selectedIds.includes(row.id)}
                    onChange={() => dispatch(toggleExceptionSelection(row.id))}
                  />
                </TableShell.SelectCell>

                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{t(`payments.kind.${row.kind}`)}</span>
                  <span className="block text-xs text-charcoal-light">
                    {row.orderId ?? row.narration}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {row.jewellerName ?? row.remitterName}
                  <span className="block text-xs text-charcoal-light">
                    <Badge tone={SEVERITY_TONES[row.severity]}>{t(`payments.severity.${row.severity}`)}</Badge>
                  </span>
                </TableShell.Cell>

                <TableShell.Cell className="font-mono text-xs">{row.utr}</TableShell.Cell>

                {/* An unmatched receipt has no expected amount by definition:
                    nobody knows what it was for. formatINR renders a dash. */}
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.expectedAmount)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.receivedAmount)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  <span className={row.varianceAmount < 0 ? 'text-danger' : 'text-charcoal'}>
                    {formatINR(row.varianceAmount)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {formatDate(row.raisedAt)}
                  <span className="block text-xs text-charcoal-light">{formatRelativeTime(row.raisedAt)}</span>
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={row.status === 'open' ? 'warning' : 'success'}
                    label={t(`payments.exceptionStatus.${row.status}`)}
                  />
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchExceptions())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearExceptionFilters())}
                />
              ) : null}
              {/* Nothing unmatched is the all clear, not an empty collection
                  waiting to be filled. It reads as good news. */}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={CheckCircle2}
                  title={t('payments.exceptionsEmptyTitle')}
                  body={t('payments.exceptionsEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ResolveModal
        open={resolveOpen}
        selectedIds={selectedIds}
        selectedValue={selectedValue}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setResolveOpen(false)}
        onResolved={() => {
          setResolveOpen(false);
          dispatch(fetchExceptions());
        }}
      />
    </div>
  );
}

// Local sub-component, same file.
function ResolveModal({ open, selectedIds, selectedValue, actionStatus, actionError, onClose, onResolved }) {
  const dispatch = useDispatch();
  const [resolution, setResolution] = useState('');
  const [orderId, setOrderId] = useState('');
  const [note, setNote] = useState('');

  // Matching needs the order it matched to, and writing money off needs a note
  // because somebody will be asked about it at audit. The server enforces both
  // again; this is so the button reads as unavailable rather than failing.
  const needsOrder = resolution === 'matched_to_order';
  const needsNote = resolution === 'written_off';
  const canSubmit =
    resolution !== '' && (!needsOrder || orderId.trim().length > 0) && (!needsNote || note.trim().length > 0);

  const handleSubmit = async () => {
    const result = await dispatch(
      resolveExceptions({ exceptionIds: selectedIds, resolution, orderId: orderId.trim() || null, note }),
    );
    if (!result.error) {
      setResolution('');
      setOrderId('');
      setNote('');
      onResolved();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payments.resolve.title')}
      description={t('payments.resolve.description')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!canSubmit} loading={actionStatus === 'loading'} onClick={handleSubmit}>
            {t('payments.resolve.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <p className="text-base text-charcoal">
          {t('common.selectedCount', { count: selectedIds.length })} ·{' '}
          {t('payments.selectedValue', { value: formatINR(selectedValue) })}
        </p>
        <Select
          id="resolution"
          label={t('payments.resolve.resolution')}
          required
          placeholder={t('common.all')}
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          options={RESOLUTION_OPTIONS}
        />
        {needsOrder ? (
          <Input
            id="resolve-order"
            label={t('payments.resolve.order')}
            required
            help={t('payments.resolve.orderHelp')}
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
          />
        ) : null}
        <Textarea
          id="resolve-note"
          rows={3}
          label={t('payments.resolve.note')}
          required={needsNote}
          help={t('payments.resolve.noteHelp')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
