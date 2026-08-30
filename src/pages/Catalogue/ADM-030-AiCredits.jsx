// ADM-030
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Coins, Search, Sparkles, TriangleAlert, Wand2 } from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import {
  ChartCard,
  MetricTile,
  TableShell,
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartTooltipProps,
} from '@/components';
import {
  fetchAiCredits,
  fetchAiCreditsSummary,
  grantAiCredits,
  selectAiCredits,
  setAiCreditFilters,
  setAiCreditPage,
  setAiCreditSearch,
} from '@/store/slices/catalogueSlice';
import { formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = { healthy: 'success', low: 'warning', exhausted: 'danger' };

const STATE_OPTIONS = ['healthy', 'low', 'exhausted'].map((value) => ({
  value,
  label: t(`catalogue.creditState.${value}`),
}));

const COLUMN_COUNT = 7;

export default function AiCredits() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { accounts, total, query, summary, usageSeries, viewState, error, actionStatus, actionError } =
    useSelector(selectAiCredits);

  const [granting, setGranting] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchAiCredits());
  }, [dispatch, query]);

  useEffect(() => {
    dispatch(fetchAiCreditsSummary());
  }, [dispatch]);

  // Handlers.
  const handleGrant = async () => {
    const result = await dispatch(
      grantAiCredits({ manufacturerId: granting.manufacturerId, credits: Number(amount), reason }),
    );
    if (result.error) return;
    setGranting(null);
    setAmount('');
    setReason('');
    dispatch(fetchAiCreditsSummary());
  };

  const loading = viewState === 'loading';

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.creditsTitle')}
        subtitle={t('catalogue.creditsSubtitle')}
        meta={
          summary?.exhaustedAccounts > 0 ? (
            <StatusPill tone="danger" dot>
              {t('catalogue.tileExhausted', { count: summary.exhaustedAccounts })}
            </StatusPill>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('catalogue.tileConsumed')}
          value={formatNumber(summary?.creditsConsumedThisMonth ?? 0)}
          icon={Coins}
          loading={loading}
        />
        <MetricTile
          label={t('catalogue.tileOutstanding')}
          value={formatNumber(summary?.creditsOutstanding ?? 0)}
          icon={Sparkles}
          loading={loading}
        />
        <MetricTile
          label={t('catalogue.tileJobs')}
          value={formatNumber(summary?.jobsThisMonth ?? 0)}
          icon={Wand2}
          loading={loading}
        />
        {/* A rising failure rate is bad, so the tile is told which way is up. */}
        <MetricTile
          label={t('catalogue.tileFailureRate')}
          value={formatPercent(summary?.failureRate ?? 0)}
          icon={TriangleAlert}
          invertTrend
          loading={loading}
        />
      </div>

      <ChartCard
        title={t('catalogue.usageChartTitle')}
        description={t('catalogue.usageChartDescription')}
        status={loading ? 'loading' : 'succeeded'}
        onRetry={() => dispatch(fetchAiCreditsSummary())}
        legend={[{ label: t('catalogue.tileConsumed'), color: chartColors[0] }]}
      >
        <BarChart data={usageSeries}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="month" {...chartAxisProps} />
          <YAxis {...chartAxisProps} width={50} allowDecimals={false} />
          <Tooltip {...chartTooltipProps} />
          <Bar dataKey="creditsConsumed" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('catalogue.creditsSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setAiCreditSearch(event.target.value))}
        />
        <Select
          id="state"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) =>
            dispatch(setAiCreditFilters({ ...query.filters, state: event.target.value }))
          }
          options={STATE_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            dispatch(setAiCreditSearch(''));
            dispatch(setAiCreditFilters({ state: '', plan: '' }));
          }}
        >
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setAiCreditPage(page))}
            onPageSizeChange={() => {}}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('catalogue.columnRequestedBy')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('catalogue.columnPlan')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnBalance')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnConsumed')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnJobs')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnSuccess')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            accounts.map((account) => (
              <CreditRow key={account.manufacturerId} account={account} onGrant={() => setGranting(account)} />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <CreditSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAiCredits())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setAiCreditSearch(''))}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState title={t('catalogue.aiEmptyTitle')} body={t('catalogue.aiEmptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={Boolean(granting)}
        onClose={() => setGranting(null)}
        title={t('catalogue.grantTitle', { name: granting?.manufacturerName ?? '' })}
        description={t('catalogue.grantDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGranting(null)}>
              {t('common.cancel')}
            </Button>
            <Button loading={actionStatus === 'loading'} onClick={handleGrant}>
              {t('catalogue.grantCredits')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-field">
          <Input
            id="grant-amount"
            type="number"
            label={t('catalogue.grantAmount')}
            required
            error={
              actionError?.code === 'credits_must_be_positive' ? actionError.message : undefined
            }
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Textarea
            id="grant-reason"
            rows={3}
            label={t('catalogue.grantReason')}
            required
            help={t('catalogue.grantReasonHelp')}
            error={actionError?.code === 'reason_required' ? actionError.message : undefined}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {actionError && !['credits_must_be_positive', 'reason_required'].includes(actionError.code) ? (
            <p className="text-sm text-danger">{actionError.message}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function CreditRow({ account, onGrant }) {
  return (
    <TableShell.Row>
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{account.manufacturerName}</span>
        <span className="block text-xs text-charcoal-light">{account.city}</span>
      </TableShell.Cell>

      <TableShell.Cell>{account.plan}</TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        <StatusPill tone={STATE_TONES[account.state]}>
          {formatNumber(account.balance)}
        </StatusPill>
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatNumber(account.consumedThisMonth)}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatNumber(account.jobsThisMonth)}
        {account.lastJobAt ? (
          <span className="block text-xs text-charcoal-light">
            {formatRelativeTime(account.lastJobAt)}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {account.successRate !== null ? formatPercent(account.successRate) : '-'}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        <Button size="sm" variant="ghost" onClick={onGrant}>
          {t('catalogue.grantCredits')}
        </Button>
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function CreditSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
