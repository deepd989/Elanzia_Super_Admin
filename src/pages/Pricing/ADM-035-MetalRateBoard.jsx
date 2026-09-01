// ADM-035
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  fetchMetalRates,
  refreshRates,
  selectRateBoard,
  setSelectedMetal,
} from '@/store/slices/pricingSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SOURCE_TONES = { IBJA: 'info', derived: 'neutral', manual_override: 'warning' };
const SOURCE_LABELS = {
  IBJA: t('pricing.sourceFeed'),
  derived: t('pricing.sourceDerived'),
  manual_override: t('pricing.sourceOverride'),
};

const COLUMN_COUNT = 6;

export default function MetalRateBoard() {
  const dispatch = useDispatch();

  // Data.
  const {
    rates,
    metalOptions,
    selectedMetal,
    source,
    capturedAt,
    nextRefreshAt,
    stale,
    flaggedCount,
    viewState,
    refreshStatus,
    refreshError,
    error,
  } = useSelector(selectRateBoard);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canEditRates = grantedPermissions.includes('pricing.rates.edit');

  useEffect(() => {
    dispatch(fetchMetalRates());
  }, [dispatch]);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.ratesTitle')}
        subtitle={t('pricing.ratesSubtitle')}
        meta={
          capturedAt ? (
            <StatusPill tone={stale ? 'warning' : 'success'} dot>
              {formatRelativeTime(capturedAt)}
            </StatusPill>
          ) : null
        }
        actions={
          canEditRates ? (
            <Button
              variant="secondary"
              iconLeft={RefreshCw}
              loading={refreshStatus === 'loading'}
              onClick={() => dispatch(refreshRates())}
            >
              {t('pricing.refreshFromFeed')}
            </Button>
          ) : null
        }
      />

      {stale ? (
        <Banner tone="warning" title={t('pricing.staleTitle')}>
          {t('pricing.staleBody', {
            when: formatRelativeTime(capturedAt),
            source: source ?? '',
          })}
          {nextRefreshAt ? (
            <span className="ml-1">
              {t('pricing.nextRefresh', { when: formatRelativeTime(nextRefreshAt) })}
            </span>
          ) : null}
        </Banner>
      ) : null}

      {flaggedCount > 0 ? (
        <Banner tone="info" title={t('pricing.flaggedTitle', { count: flaggedCount })}>
          {t('pricing.flaggedBody')}
        </Banner>
      ) : null}

      {refreshError ? (
        <Banner tone="danger" title={refreshError.message}>
          {null}
        </Banner>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Select
          id="metal"
          className="w-48"
          placeholder={t('common.all')}
          value={selectedMetal}
          onChange={(event) => dispatch(setSelectedMetal(event.target.value))}
          options={metalOptions}
        />
        {capturedAt ? (
          <p className="ml-auto text-sm text-charcoal-light">
            {t('pricing.columnEffective')} {formatDateTime(capturedAt)}
          </p>
        ) : null}
      </div>

      <TableShell>
        <TableShell.Head>
          <TableShell.HeadCell>{t('pricing.columnMetal')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('pricing.columnPurity')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('pricing.columnRate')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('pricing.columnChange')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('pricing.columnSource')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('pricing.columnDeviation')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            rates.map((rate) => <RateRow key={rate.id} rate={rate} />)
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RateSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchMetalRates())} />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function RateRow({ rate }) {
  return (
    <TableShell.Row>
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{rate.metalLabel}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        <span className="flex items-center gap-2">
          {rate.purityLabel}
          {rate.isReference ? <Badge tone="outline">{t('pricing.referenceRow')}</Badge> : null}
        </span>
      </TableShell.Cell>

      {/* Silver is quoted to the paisa. Rounding it to whole rupees would lose
          a fifth of a percent on every sterling price. */}
      <TableShell.Cell align="right" numeric>
        <span className="font-medium">
          {formatINR(rate.ratePerGram, { paise: rate.metal === 'silver' })}
        </span>
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        <span className={rate.changePercent >= 0 ? 'text-success' : 'text-danger'}>
          {rate.changePercent >= 0 ? '+' : ''}
          {formatPercent(rate.changePercent, { decimals: 2 })}
        </span>
        <span className="block text-xs text-charcoal-light">
          {formatINR(rate.previousRatePerGram, { paise: rate.metal === 'silver' })}
        </span>
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={SOURCE_TONES[rate.source]}>{SOURCE_LABELS[rate.source]}</StatusPill>
        <span className="mt-0.5 block text-xs text-charcoal-light">
          {rate.source === 'derived'
            ? t('pricing.derivedFromLabel', {
                reference: rate.derivedFrom,
                factor: Number(rate.factorApplied).toFixed(4),
              })
            : rate.source === 'manual_override'
              ? t('pricing.sourceOverride')
              : t('pricing.quotedLabel')}
        </span>
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        <span className={rate.beyondTolerance ? 'text-warning' : 'text-charcoal-light'}>
          {rate.deviationPercent >= 0 ? '+' : ''}
          {formatPercent(rate.deviationPercent, { decimals: 3 })}
        </span>
        <span className="block text-xs text-charcoal-lighter">
          {rate.beyondTolerance ? t('pricing.beyondTolerance') : t('pricing.withinTolerance')}
        </span>
      </TableShell.Cell>
    </TableShell.Row>
  );
}

// Local banner. Three screens in this area need one and they each want
// different content, so it stays bespoke rather than becoming a shared prop bag.
function Banner({ tone, title, children }) {
  const tones = {
    warning: 'border-warning/40 bg-warning-surface text-warning',
    info: 'border-neutral-border bg-neutral-surface text-neutral',
    danger: 'border-danger/30 bg-danger-surface text-danger',
  };

  return (
    <div className={`flex items-start gap-3 rounded-md border px-4 py-3 ${tones[tone]}`}>
      <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-body text-base font-semibold">{title}</p>
        {children ? <p className="mt-0.5 text-sm text-charcoal-light">{children}</p> : null}
      </div>
    </div>
  );
}

function RateSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
