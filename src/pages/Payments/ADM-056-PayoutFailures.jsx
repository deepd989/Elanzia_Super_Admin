// ADM-056
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, RotateCw, Search, TriangleAlert } from 'lucide-react';
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
import { MetricTile, TableShell } from '@/components';
import {
  clearPayoutFilters,
  editBeneficiary,
  fetchPayoutFailures,
  retryPayouts,
  selectPayoutFailures,
  setPayoutFilters,
  setPayoutPage,
  setPayoutPageSize,
  setPayoutSearch,
  setPayoutSelection,
  togglePayoutSelection,
  updateBeneficiary,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const PAYOUT_TONES = { queued: 'neutral', failed: 'danger', succeeded: 'success' };

const STATUS_OPTIONS = ['failed', 'queued'].map((value) => ({
  value,
  label: t(`payments.payoutStatus.${value}`),
}));

const COLUMN_COUNT = 8;

export default function PayoutFailures() {
  const dispatch = useDispatch();
  const [retryOpen, setRetryOpen] = useState(false);

  // Data. ONE selector - this is the seam.
  const {
    payouts,
    total,
    query,
    viewState,
    failedCount,
    failedValue,
    queuedCount,
    facets,
    selectedIds,
    allSelected,
    someSelected,
    selectedValue,
    selectedNeedingBankFix,
    actionStatus,
    actionError,
    editingBeneficiaryId,
  } = useSelector(selectPayoutFailures);

  useEffect(() => {
    dispatch(fetchPayoutFailures());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setPayoutFilters({ ...query.filters, [field]: event.target.value }));

  const handleSelectAll = () =>
    dispatch(setPayoutSelection(allSelected ? [] : payouts.map((row) => row.id)));

  const editing = payouts.find((row) => row.manufacturerId === editingBeneficiaryId) ?? null;

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.payoutsTitle')}
        subtitle={t('payments.payoutsSubtitle')}
        meta={<StatusPill tone="danger" label={`${formatNumber(failedCount)} ${t('payments.failedPayouts').toLowerCase()}`} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricTile
          label={t('payments.failedPayouts')}
          value={formatNumber(failedCount)}
          icon={TriangleAlert}
          invertTrend
        />
        <MetricTile label={t('payments.failedValue')} value={formatINRCompact(failedValue)} icon={RotateCw} />
        <MetricTile label={t('payments.queuedPayouts')} value={formatNumber(queuedCount)} icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('payments.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setPayoutSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-40"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="failure"
          className="w-56"
          placeholder={t('payments.filter.failureCode')}
          value={query.filters.failureCode}
          onChange={setFilter('failureCode')}
          options={facets.failureCodes.map((row) => ({
            value: row.value,
            label: t(`payments.failureCode.${row.value}`),
          }))}
        />
        <Select
          id="manufacturer"
          className="w-56"
          placeholder={t('payments.filter.manufacturer')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearPayoutFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-warning-surface px-4 py-2.5">
          <span className="text-base font-medium text-charcoal">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          <span className="text-sm text-charcoal-light">
            {t('payments.selectedValue', { value: formatINR(selectedValue) })}
          </span>
          {/* Retrying against details that do not resolve fails again and burns
              a day, so the desk is told before it spends one. */}
          {selectedNeedingBankFix > 0 ? (
            <Badge tone="warning">{t('payments.needsBankFix', { count: selectedNeedingBankFix })}</Badge>
          ) : null}
          <Button size="sm" variant="secondary" iconLeft={RotateCw} onClick={() => setRetryOpen(true)}>
            {t('payments.retrySelected')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setPayoutSelection([]))}>
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
            onPageChange={(page) => dispatch(setPayoutPage(page))}
            onPageSizeChange={(size) => dispatch(setPayoutPageSize(size))}
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
          <TableShell.HeadCell>{t('payments.column.manufacturer')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.order')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.amount')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.attempt')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.failure')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            payouts.map((row) => (
              <TableShell.Row
                key={row.id}
                selected={selectedIds.includes(row.id)}
                onClick={() => dispatch(togglePayoutSelection(row.id))}
              >
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${row.id}`}
                    checked={selectedIds.includes(row.id)}
                    onChange={() => dispatch(togglePayoutSelection(row.id))}
                  />
                </TableShell.SelectCell>

                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.manufacturerName}</span>
                  <span className="block text-xs text-charcoal-light">{row.rail}</span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {row.orderId}
                  <span className="block font-mono text-xs text-charcoal-light">{row.nodalReference ?? '-'}</span>
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatINR(row.amount)}
                </TableShell.Cell>

                <TableShell.Cell>
                  {t('payments.attemptNumber', { number: row.attemptNumber })}
                  <span className="block text-xs text-charcoal-light">
                    {row.attemptedAt ? formatRelativeTime(row.attemptedAt) : formatDate(row.queuedAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {row.failureCode ? (
                    <span className="text-charcoal">{t(`payments.failureCode.${row.failureCode}`)}</span>
                  ) : (
                    <span className="text-charcoal-light">-</span>
                  )}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={PAYOUT_TONES[row.status] ?? 'neutral'}
                    label={t(`payments.payoutStatus.${row.status}`)}
                  />
                </TableShell.Cell>

                <TableShell.ActionsCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch(editBeneficiary(row.manufacturerId))}
                  >
                    {t('payments.fixBankDetails')}
                  </Button>
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchPayoutFailures())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearPayoutFilters())}
                />
              ) : null}
              {/* Every payout landing is the all clear, not an empty list. */}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={CheckCircle2}
                  title={t('payments.payoutsEmptyTitle')}
                  body={t('payments.payoutsEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <RetryModal
        open={retryOpen}
        selectedIds={selectedIds}
        selectedValue={selectedValue}
        needingBankFix={selectedNeedingBankFix}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setRetryOpen(false)}
        onRetried={() => {
          setRetryOpen(false);
          dispatch(fetchPayoutFailures());
        }}
      />

      <BeneficiaryModal
        payout={editing}
        manufacturerId={editingBeneficiaryId}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => dispatch(editBeneficiary(null))}
      />
    </div>
  );
}

// Local sub-components, same file.
function RetryModal({ open, selectedIds, selectedValue, needingBankFix, actionStatus, actionError, onClose, onRetried }) {
  const dispatch = useDispatch();
  const [note, setNote] = useState('');

  const handleRetry = async () => {
    const result = await dispatch(retryPayouts({ payoutIds: selectedIds, note }));
    if (!result.error) {
      setNote('');
      onRetried();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payments.retrySelected')}
      description={t('payments.payoutsSubtitle')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button loading={actionStatus === 'loading'} onClick={handleRetry}>
            {t('payments.retrySelected')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <p className="text-base text-charcoal">
          {t('common.selectedCount', { count: selectedIds.length })} ·{' '}
          {t('payments.selectedValue', { value: formatINR(selectedValue) })}
        </p>
        {needingBankFix > 0 ? (
          <p className="text-sm text-warning">{t('payments.needsBankFix', { count: needingBankFix })}</p>
        ) : null}
        <Textarea
          id="retry-note"
          rows={3}
          label={t('payments.field.note')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function BeneficiaryModal({ payout, manufacturerId, actionStatus, actionError, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ accountHolder: '', accountNumber: '', ifsc: '' });

  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSave = async () => {
    const result = await dispatch(updateBeneficiary({ manufacturerId, ...form }));
    if (!result.error) {
      setForm({ accountHolder: '', accountNumber: '', ifsc: '' });
      onClose();
    }
  };

  return (
    <Modal
      open={manufacturerId !== null}
      onClose={onClose}
      title={t('payments.bank.title')}
      description={t('payments.bank.description')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!form.accountNumber.trim() || !form.ifsc.trim()}
            loading={actionStatus === 'loading'}
            onClick={handleSave}
          >
            {t('payments.bank.submit')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        {payout ? <p className="text-base text-charcoal">{payout.manufacturerName}</p> : null}
        <Input
          id="holder"
          label={t('payments.bank.accountHolder')}
          value={form.accountHolder}
          onChange={setField('accountHolder')}
        />
        <Input
          id="account"
          label={t('payments.bank.accountNumber')}
          required
          value={form.accountNumber}
          onChange={setField('accountNumber')}
        />
        <Input
          id="ifsc"
          label={t('payments.bank.ifsc')}
          required
          help={t('payments.bank.ifscHelp')}
          value={form.ifsc}
          onChange={setField('ifsc')}
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
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
