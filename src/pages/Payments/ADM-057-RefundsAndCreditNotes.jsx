// ADM-057
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Receipt, Search, ShieldCheck } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearRefundFilters,
  fetchCreditNotes,
  fetchRefunds,
  selectRefundsConsole,
  setRefundFilters,
  setRefundPage,
  setRefundPageSize,
  setRefundSearch,
  setRefundTab,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const REFUND_TONES = { awaiting_verification: 'warning', processed: 'success', rejected: 'danger' };
const NOTE_TONES = { draft: 'neutral', issued: 'info', applied: 'success' };

const REFUND_STATUS_OPTIONS = ['awaiting_verification', 'processed', 'rejected'].map((value) => ({
  value,
  label: t(`payments.refundStatus.${value}`),
}));

const NOTE_STATUS_OPTIONS = ['draft', 'issued', 'applied'].map((value) => ({
  value,
  label: t(`payments.creditNoteStatus.${value}`),
}));

const PARTY_OPTIONS = ['manufacturer', 'jeweller'].map((value) => ({
  value,
  label: t(`payments.partyType.${value}`),
}));

const COLUMN_COUNT = 7;

export default function RefundsAndCreditNotes() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { tab, rows, total, query, viewState, awaitingCount, awaitingValue, issuedValue } =
    useSelector(selectRefundsConsole);

  const isRefunds = tab === 'refunds';

  useEffect(() => {
    if (isRefunds) dispatch(fetchRefunds());
    else dispatch(fetchCreditNotes());
  }, [dispatch, isRefunds, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setRefundFilters({ ...query.filters, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.refundsTitle')}
        subtitle={t('payments.refundsSubtitle')}
        meta={
          isRefunds ? (
            <StatusPill
              tone="warning"
              label={`${t('payments.awaitingVerification')}: ${formatINR(awaitingValue)}`}
            />
          ) : (
            <StatusPill tone="info" label={`${t('payments.issuedValue')}: ${formatINR(issuedValue)}`} />
          )
        }
      />

      <Tabs
        activeId={tab}
        onChange={(next) => dispatch(setRefundTab(next))}
        tabs={[
          { id: 'refunds', label: t('payments.tabRefunds') },
          { id: 'credit_notes', label: t('payments.tabCreditNotes') },
        ]}
      />

      {/* Rows sitting at awaiting verification are the NORMAL state of this
          queue, not a backlog. Saying so stops somebody "clearing" them. */}
      {isRefunds && awaitingCount > 0 ? (
        <div className="flex items-start gap-3 rounded-md border border-neutral-border bg-neutral-surface px-4 py-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-neutral" aria-hidden="true" />
          <p className="text-base text-charcoal">{t('payments.awaitingCaption')}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('payments.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setRefundSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-52"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={isRefunds ? REFUND_STATUS_OPTIONS : NOTE_STATUS_OPTIONS}
        />
        {isRefunds ? null : (
          <Select
            id="party"
            className="w-44"
            placeholder={t('payments.filter.party')}
            value={query.filters.partyType}
            onChange={setFilter('partyType')}
            options={PARTY_OPTIONS}
          />
        )}
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearRefundFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setRefundPage(page))}
            onPageSizeChange={(size) => dispatch(setRefundPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{isRefunds ? t('payments.column.order') : t('payments.column.document')}</TableShell.HeadCell>
          <TableShell.HeadCell>{isRefunds ? t('orders.column.jeweller') : t('payments.column.party')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.filter.reason')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.amount')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{isRefunds ? t('payments.column.utr') : t('price.gst')}</TableShell.HeadCell>
          <TableShell.HeadCell>{isRefunds ? t('payments.column.raised') : t('payments.column.issued')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            rows.map((row) =>
              isRefunds ? (
                <TableShell.Row key={row.id}>
                  <TableShell.Cell>
                    <span className="font-medium text-charcoal">{row.orderId}</span>
                    <span className="block text-xs text-charcoal-light">{row.id}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>{row.jewellerName}</TableShell.Cell>
                  <TableShell.Cell>{t(`payments.refundReason.${row.reason}`)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.amount)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" className="font-mono text-xs">
                    {row.utr ?? '-'}
                  </TableShell.Cell>
                  <TableShell.Cell>
                    {formatDate(row.raisedAt)}
                    <span className="block text-xs text-charcoal-light">{formatRelativeTime(row.raisedAt)}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>
                    <StatusPill
                      tone={REFUND_TONES[row.status]}
                      label={t(`payments.refundStatus.${row.status}`)}
                    />
                  </TableShell.Cell>
                </TableShell.Row>
              ) : (
                <TableShell.Row key={row.id}>
                  <TableShell.Cell>
                    <span className="font-mono text-sm text-charcoal">{row.documentNumber}</span>
                    <span className="block text-xs text-charcoal-light">{row.orderId}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>
                    {row.partyName}
                    <span className="block text-xs text-charcoal-light">
                      <Badge tone="neutral">{t(`payments.partyType.${row.partyType}`)}</Badge>
                    </span>
                  </TableShell.Cell>
                  <TableShell.Cell>{t(`payments.creditNoteReason.${row.reason}`)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.amount)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.gstValue)}
                  </TableShell.Cell>
                  <TableShell.Cell>{formatDate(row.issuedAt)}</TableShell.Cell>
                  <TableShell.Cell>
                    <StatusPill
                      tone={NOTE_TONES[row.status]}
                      label={t(`payments.creditNoteStatus.${row.status}`)}
                    />
                  </TableShell.Cell>
                </TableShell.Row>
              ),
            )
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState onRetry={() => dispatch(isRefunds ? fetchRefunds() : fetchCreditNotes())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearRefundFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Receipt}
                  title={isRefunds ? t('payments.refundsEmptyTitle') : t('payments.creditNotesEmptyTitle')}
                  body={isRefunds ? t('payments.refundsEmptyBody') : t('payments.creditNotesEmptyBody')}
                />
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
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
