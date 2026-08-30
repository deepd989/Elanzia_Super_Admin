// ADM-052
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Landmark, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import { BANK_ACCOUNTS } from '@/services/mock/paymentsApi';
import {
  clearManualForm,
  fetchManualPayments,
  findMatchCandidates,
  recordManualPayment,
  selectManualPayment,
  setManualPage,
  setManualPageSize,
  setManualSearch,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatDateTime, formatINR, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const METHOD_OPTIONS = [
  { value: 'RTGS', label: 'RTGS' },
  { value: 'NEFT', label: 'NEFT' },
];

const ACCOUNT_OPTIONS = BANK_ACCOUNTS.map((account) => ({
  value: account.id,
  label: `${account.label} (${account.bank} ${account.last4})`,
}));

const COLUMN_COUNT = 6;

const EMPTY_FORM = {
  orderId: '',
  method: 'RTGS',
  amount: '',
  utr: '',
  receivedAt: '',
  bankAccountId: BANK_ACCOUNTS[0].id,
  remitterName: '',
  note: '',
};

export default function ManualPaymentRecording() {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY_FORM);

  // Data. ONE selector - this is the seam.
  const { payments, total, query, viewState, recordedToday, recordedValue, candidates, candidateState, saveStatus, saveError, lastRecorded } =
    useSelector(selectManualPayment);

  useEffect(() => {
    dispatch(fetchManualPayments());
  }, [dispatch, query]);

  // Handlers.
  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSearch = () =>
    dispatch(findMatchCandidates({ amount: Number(form.amount), remitterName: form.remitterName }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(
      recordManualPayment({ ...form, amount: Number(form.amount), receivedAt: form.receivedAt || undefined }),
    );
    if (!result.error) {
      setForm(EMPTY_FORM);
      dispatch(fetchManualPayments());
    }
  };

  const canSubmit = form.orderId.trim() && form.utr.trim() && Number(form.amount) > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.manualTitle')}
        subtitle={t('payments.manualSubtitle')}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="info" label={`${t('payments.recordedToday')}: ${formatNumber(recordedToday)}`} />
            <StatusPill tone="neutral" label={formatINR(recordedValue)} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card title={t('payments.manualFormTitle')}>
          <div className="grid grid-cols-1 gap-field md:grid-cols-2">
            <Input
              id="order"
              label={t('payments.field.order')}
              required
              value={form.orderId}
              onChange={setField('orderId')}
            />
            <Select
              id="method"
              label={t('payments.field.method')}
              required
              value={form.method}
              onChange={setField('method')}
              options={METHOD_OPTIONS}
            />
            <Input
              id="amount"
              type="number"
              label={t('payments.field.amount')}
              required
              value={form.amount}
              onChange={setField('amount')}
            />
            <Input
              id="utr"
              label={t('payments.field.utr')}
              required
              help={t('payments.field.utrHelp')}
              value={form.utr}
              onChange={setField('utr')}
            />
            <Input
              id="received"
              type="date"
              label={t('payments.field.receivedAt')}
              value={form.receivedAt}
              onChange={setField('receivedAt')}
            />
            <Select
              id="account"
              label={t('payments.field.bankAccount')}
              value={form.bankAccountId}
              onChange={setField('bankAccountId')}
              options={ACCOUNT_OPTIONS}
            />
            <Input
              id="remitter"
              label={t('payments.field.remitter')}
              value={form.remitterName}
              onChange={setField('remitterName')}
            />
            <Textarea
              id="note"
              className="md:col-span-2"
              rows={2}
              label={t('payments.field.note')}
              value={form.note}
              onChange={setField('note')}
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-lightGray-dark pt-4">
            {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
            {lastRecorded && !saveError ? (
              <p className="mr-auto text-sm text-success">
                {t('payments.recordedOk', { orderId: lastRecorded.orderId })}
              </p>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => dispatch(clearManualForm())}>
              {t('common.reset')}
            </Button>
            <Button type="submit" disabled={!canSubmit} loading={saveStatus === 'loading'}>
              {t('common.save')}
            </Button>
          </div>
        </Card>

        {/* The matcher. Every candidate says why it is a candidate: a ranked
            list without its reasoning just moves the guessing to the operator. */}
        <Card
          title={t('payments.candidatesTitle')}
          description={t('payments.candidatesCaption')}
          action={
            <Button type="button" size="sm" variant="secondary" iconLeft={Search} onClick={handleSearch}>
              {t('payments.findCandidates')}
            </Button>
          }
        >
          {candidateState === 'loading' ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-base text-charcoal-light">{t('payments.noCandidates')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {candidates.map((candidate) => (
                <li key={candidate.orderId} className="rounded border border-lightGray-dark p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-base font-medium text-charcoal">{candidate.orderId}</span>
                      <span className="block text-xs text-charcoal-light">{candidate.jewellerName}</span>
                    </span>
                    <span className="shrink-0 text-base tabular-nums text-charcoal">
                      {formatINR(candidate.total)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={candidate.confidence >= 70 ? 'success' : 'neutral'}>
                      {t('payments.confidence', { value: formatPercent(candidate.confidence, { decimals: 0 }) })}
                    </Badge>
                    {candidate.reasons.map((reason) => (
                      <Badge key={reason} tone={reason === 'already_paid' ? 'danger' : 'neutral'}>
                        {t(`payments.reason.${reason}`)}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => setForm({ ...form, orderId: candidate.orderId, amount: String(candidate.total) })}
                  >
                    {t('payments.useThisOrder')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setManualPage(page))}
            onPageSizeChange={(size) => dispatch(setManualPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('payments.column.order')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.remitter')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.utr')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.amount')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.field.receivedAt')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.recordedBy')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            payments.map((row) => (
              <TableShell.Row key={row.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.orderId}</span>
                  <span className="block text-xs text-charcoal-light">{row.method}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {row.remitterName}
                  <span className="block text-xs text-charcoal-light">{row.jewellerName}</span>
                </TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">{row.utr}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.amount)}
                </TableShell.Cell>
                <TableShell.Cell>{formatDate(row.valueDate)}</TableShell.Cell>
                {/* Attribution is on every row. This is the one place money
                    enters the platform on somebody's say-so. */}
                <TableShell.Cell>
                  {row.recordedByName}
                  <span className="block text-xs text-charcoal-light">{formatDateTime(row.recordedAt)}</span>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchManualPayments())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setManualSearch(''))}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Landmark}
                  title={t('payments.manualRecentTitle')}
                  body={t('payments.manualSubtitle')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </form>
  );
}

function QueueSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
