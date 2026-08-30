// ADM-053
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileCheck2, FileWarning, IndianRupee, Receipt, Search } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  cancelIrn,
  clearEinvoiceFilters,
  fetchEinvoice,
  fetchEinvoiceSummary,
  fetchEinvoices,
  openEinvoice,
  selectEinvoiceConsole,
  setEinvoiceFilters,
  setEinvoicePage,
  setEinvoicePageSize,
  setEinvoiceSearch,
} from '@/store/slices/taxSlice';
import { formatDate, formatDateTime, formatINR, formatINRCompact, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = { generated: 'success', failed: 'danger', pending: 'warning', cancelled: 'neutral' };

const STATUS_OPTIONS = ['generated', 'failed', 'pending', 'cancelled'].map((value) => ({
  value,
  label: t(`tax.status.${value}`),
}));

const SUPPLY_OPTIONS = ['intra_state', 'inter_state'].map((value) => ({
  value,
  label: t(`tax.supplyType.${value}`),
}));

const CANCEL_OPTIONS = [
  { value: 'wrong_value', label: t('tax.cancel.reasonWrongValue') },
  { value: 'wrong_entry', label: t('tax.cancel.reasonWrongEntry') },
  { value: 'duplicate', label: t('tax.cancel.reasonDuplicate') },
  { value: 'order_cancelled', label: t('tax.cancel.reasonOrderCancelled') },
];

const COLUMN_COUNT = 8;

export default function EinvoiceConsole() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { einvoices, total, query, viewState, summary, facets, openId, current, currentState, actionStatus, actionError } =
    useSelector(selectEinvoiceConsole);

  useEffect(() => {
    dispatch(fetchEinvoices());
    dispatch(fetchEinvoiceSummary());
  }, [dispatch, query]);

  useEffect(() => {
    if (openId) dispatch(fetchEinvoice(openId));
  }, [dispatch, openId]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setEinvoiceFilters({ ...query.filters, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('tax.eyebrow')}
        title={t('tax.einvoicesTitle')}
        subtitle={t('tax.einvoicesSubtitle')}
        meta={
          summary ? (
            <StatusPill
              tone="info"
              label={t('tax.cancellableNow', { count: summary.cancellableCount, hours: summary.windowHours })}
            />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('tax.registered')}
          value={formatNumber(summary?.generated ?? 0)}
          icon={FileCheck2}
          loading={!summary}
        />
        <MetricTile
          label={t('tax.failedIrn')}
          value={formatNumber(summary?.failed ?? 0)}
          caption={summary ? t('tax.pendingPush') + ': ' + formatNumber(summary.pending) : undefined}
          icon={FileWarning}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('tax.taxableValue')}
          value={formatINRCompact(summary?.taxableValue ?? 0)}
          icon={IndianRupee}
          loading={!summary}
        />
        <MetricTile
          label={t('tax.gstCollected')}
          value={formatINRCompact(summary?.gstValue ?? 0)}
          icon={Receipt}
          loading={!summary}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('tax.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setEinvoiceSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="supplier"
          className="w-56"
          placeholder={t('tax.filter.supplier')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Select
          id="supply"
          className="w-48"
          placeholder={t('tax.filter.supplyType')}
          value={query.filters.supplyType}
          onChange={setFilter('supplyType')}
          options={SUPPLY_OPTIONS}
        />
        <Select
          id="period"
          className="w-40"
          placeholder={t('tax.filter.period')}
          value={query.filters.period}
          onChange={setFilter('period')}
          options={facets.periods}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearEinvoiceFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setEinvoicePage(page))}
            onPageSizeChange={(size) => dispatch(setEinvoicePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('tax.column.document')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.supplier')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.recipient')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.date')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('tax.column.taxable')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('tax.column.gst')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.irn')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            einvoices.map((row) => (
              <TableShell.Row key={row.id} onClick={() => dispatch(openEinvoice(row.id))}>
                <TableShell.Cell>
                  <span className="font-mono text-sm text-charcoal">{row.documentNumber}</span>
                  <span className="block text-xs text-charcoal-light">{row.orderId}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {row.manufacturerName}
                  <span className="block font-mono text-xs text-charcoal-light">{row.supplierGstin}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {row.jewellerName}
                  <span className="block text-xs text-charcoal-light">
                    {t(`tax.supplyType.${row.supplyType}`)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>{formatDate(row.documentDate)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.taxableValue)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.gstValue)}
                </TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">
                  {row.irn ?? <span className="text-charcoal-light">-</span>}
                </TableShell.Cell>
                <TableShell.Cell>
                  <div className="flex items-center gap-1.5">
                    <StatusPill tone={STATUS_TONES[row.status]} label={t(`tax.status.${row.status}`)} />
                    {row.cancellable ? <Badge tone="info">{t('tax.cancelIrn')}</Badge> : null}
                  </div>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchEinvoices())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearEinvoiceFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Receipt}
                  title={t('tax.einvoicesEmptyTitle')}
                  body={t('tax.einvoicesEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <DocumentModal
        openId={openId}
        current={current}
        currentState={currentState}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => dispatch(openEinvoice(null))}
      />
    </div>
  );
}

// Local sub-components, same file.
function DocumentModal({ openId, current, currentState, actionStatus, actionError, onClose }) {
  const dispatch = useDispatch();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const invoice = current?.einvoice;

  const handleCancel = async () => {
    const result = await dispatch(cancelIrn({ einvoiceId: invoice.id, reason, note }));
    if (!result.error) {
      setReason('');
      setNote('');
      onClose();
    }
  };

  return (
    <Modal
      open={openId !== null}
      onClose={onClose}
      size="lg"
      title={invoice ? t('tax.documentTitle', { number: invoice.documentNumber }) : t('tax.einvoicesTitle')}
      description={invoice ? `${invoice.manufacturerName} · ${invoice.jewellerName}` : undefined}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          {invoice?.cancellable ? (
            <Button
              variant="danger"
              disabled={!reason}
              loading={actionStatus === 'loading'}
              onClick={handleCancel}
            >
              {t('tax.cancel.submit')}
            </Button>
          ) : null}
        </>
      }
    >
      {currentState === 'loading' ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : null}
      {currentState === 'error' ? <ErrorState onRetry={() => dispatch(fetchEinvoice(openId))} /> : null}
      {currentState === 'populated' && invoice ? (
        <div className="flex flex-col gap-field">
          <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
            <MetaRow label={t('tax.column.taxable')} value={formatINR(invoice.taxableValue)} />
            <MetaRow
              label={t('tax.column.gst')}
              value={
                invoice.supplyType === 'intra_state'
                  ? `${formatINR(invoice.cgst)} + ${formatINR(invoice.sgst)}`
                  : formatINR(invoice.igst)
              }
            />
            <MetaRow label={t('tax.column.total')} value={formatINR(invoice.invoiceValue)} />
            <MetaRow label={t('tax.supplyLabel')} value={t(`tax.supplyType.${invoice.supplyType}`)} />
            <MetaRow label={t('tax.irnLabel')} value={invoice.irn} mono />
            <MetaRow label={t('tax.ackLabel')} value={invoice.ackNumber} mono />
            <MetaRow
              label={t('common.createdAt')}
              value={invoice.ackDate ? formatDateTime(invoice.ackDate) : '-'}
            />
          </dl>

          {/* The signed payload, printed as the portal returned it. A rebuilt
              one does not verify at a checkpost. */}
          {invoice.qrPayload ? (
            <div>
              <h4 className="text-sm font-medium text-charcoal">{t('tax.qrTitle')}</h4>
              <p className="mb-2 text-xs text-charcoal-light">{t('tax.qrCaption')}</p>
              <pre className="overflow-x-auto rounded border border-lightGray-dark bg-lightGray p-3 font-mono text-xs text-charcoal">
                {JSON.stringify(invoice.qrPayload, null, 2)}
              </pre>
            </div>
          ) : null}

          {invoice.cancellable ? (
            <>
              <p className="text-sm text-info">{t('tax.cancel.description')}</p>
              <Select
                id="cancel-reason"
                label={t('tax.cancel.reason')}
                required
                placeholder={t('common.all')}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                options={CANCEL_OPTIONS}
              />
              <Textarea
                id="cancel-note"
                rows={2}
                label={t('tax.cancel.note')}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </>
          ) : invoice.status === 'generated' ? (
            <p className="text-sm text-charcoal-light">{t('tax.cancelWindowClosed')}</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function MetaRow({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-charcoal-light">{label}</dt>
      <dd className={mono ? 'text-right font-mono text-xs text-charcoal' : 'text-right text-charcoal'}>
        {value ?? '-'}
      </dd>
    </div>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
