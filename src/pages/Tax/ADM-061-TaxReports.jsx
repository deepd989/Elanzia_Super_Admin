// ADM-061
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, IndianRupee, Landmark, Receipt, Scale } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
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
  exportTaxReport,
  fetchGstSummary,
  fetchTaxPeriods,
  fetchTcsReport,
  selectTaxReports,
  setReportPeriod,
} from '@/store/slices/taxSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const GSTR8_TONES = { open: 'warning', ready: 'info', filed: 'success' };

export default function TaxReports() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    period,
    periods,
    tcs,
    tcsState,
    tcsError,
    gst,
    gstState,
    viewState,
    canFile,
    outstandingTcs,
    exportStatus,
    exportError,
    lastExport,
  } = useSelector(selectTaxReports);

  useEffect(() => {
    dispatch(fetchTaxPeriods());
  }, [dispatch]);

  useEffect(() => {
    if (!period) return;
    dispatch(fetchTcsReport());
    dispatch(fetchGstSummary());
  }, [dispatch, period]);

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={tcsError?.message} onRetry={() => dispatch(fetchTcsReport())} />;
  }

  const summary = tcs.period;

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('tax.eyebrow')}
        title={t('tax.reportsTitle')}
        subtitle={t('tax.reportsSubtitle')}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill
              tone={GSTR8_TONES[summary.gstr8Status]}
              label={t(`tax.gstr8Status.${summary.gstr8Status}`)}
            />
            <StatusPill tone="neutral" label={t('tax.dueOn', { date: formatDate(tcs.dueOn) })} />
          </div>
        }
        actions={
          <>
            <Select
              id="period"
              className="w-44"
              value={period ?? ''}
              onChange={(event) => dispatch(setReportPeriod(event.target.value))}
              options={periods.map((row) => ({ value: row.period, label: row.label }))}
            />
            <Button
              variant="secondary"
              iconLeft={Download}
              disabled={!canFile}
              loading={exportStatus === 'loading'}
              onClick={() => dispatch(exportTaxReport({ report: 'gstr8', period }))}
            >
              {t('tax.exportGstr8')}
            </Button>
          </>
        }
      />

      {/* A month that can still take supplies cannot be filed from. Saying so
          is better than a disabled button with no explanation. */}
      {!canFile ? (
        <div className="rounded-md border border-warning/40 bg-warning-surface px-4 py-3">
          <p className="text-base text-charcoal">{t('tax.periodOpen')}</p>
        </div>
      ) : null}
      {exportError ? <p className="text-sm text-danger">{exportError.message}</p> : null}
      {lastExport ? (
        <p className="text-sm text-success">
          {t('tax.exportedOk', { fileName: lastExport.fileName, count: lastExport.rowCount })}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('tax.outwardSupplies')}
          value={formatINRCompact(summary.taxableValue)}
          caption={`${formatNumber(summary.invoiceCount)} · ${formatNumber(summary.supplierCount)}`}
          icon={IndianRupee}
        />
        {/* The two GST figures are never added together: different suppliers,
            different rates, different returns. */}
        <MetricTile
          label={t('tax.goodsGst')}
          value={formatINRCompact(summary.gstValue)}
          caption={t('tax.goodsGstCaption')}
          icon={Receipt}
        />
        <MetricTile
          label={t('tax.commissionGst')}
          value={formatINRCompact(summary.commissionGst)}
          caption={t('tax.commissionGstCaption')}
          icon={Scale}
        />
        <MetricTile
          label={t('tax.tcsCollected')}
          value={formatINR(summary.tcsCollected)}
          caption={t('tax.tcsCollectedCaption', { rate: formatPercent(summary.tcsRate) })}
          icon={Landmark}
        />
      </div>

      <Card title={t('tax.tcsCollected')} description={t('tax.notAddedTogether')}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Fact label={t('tax.tcsCollected')} value={formatINR(summary.tcsCollected)} emphasis />
          <Fact label={t('tax.tcsRemitted')} value={formatINR(summary.tcsRemitted)} />
          <Fact label={t('tax.tcsOutstanding')} value={formatINR(outstandingTcs)} />
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('tax.seriesTitle')}
          description={t('tax.seriesCaption')}
          status={gstState === 'succeeded' ? 'succeeded' : gstState === 'failed' ? 'failed' : 'loading'}
          onRetry={() => dispatch(fetchGstSummary())}
          legend={[
            { label: t('tax.outwardSupplies'), color: chartColors[0] },
            { label: t('tax.tcsCollected'), color: chartColors[1] },
          ]}
        >
          <LineChart data={gst?.series ?? []}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="period" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Line type="monotone" dataKey="taxableValue" stroke={chartColors[0]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tcsCollected" stroke={chartColors[1]} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard
          title={t('tax.byStateTitle')}
          description={t('tax.byStateCaption')}
          status={tcsState === 'succeeded' ? 'succeeded' : tcsState === 'failed' ? 'failed' : 'loading'}
          onRetry={() => dispatch(fetchTcsReport())}
          legend={[{ label: t('tax.outwardSupplies'), color: chartColors[2] }]}
        >
          <BarChart data={tcs.byState}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="state" {...chartAxisProps} interval={0} angle={-30} height={70} textAnchor="end" />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Bar dataKey="taxableValue" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <Card title={t('tax.byManufacturerTitle')} description={t('tax.byManufacturerCaption')} padded={false}>
        <TableShell>
          <TableShell.Head>
            <TableShell.HeadCell>{t('tax.column.supplier')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('tax.column.invoices')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('tax.column.taxable')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('tax.column.gst')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('tax.column.tcs')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {tcs.byManufacturer.length > 0 ? (
              tcs.byManufacturer.map((row) => (
                <TableShell.Row key={row.manufacturerId}>
                  <TableShell.Cell>
                    <span className="font-medium text-charcoal">{row.manufacturerName}</span>
                    <span className="block font-mono text-xs text-charcoal-light">{row.gstin}</span>
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatNumber(row.invoiceCount)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.taxableValue)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.gstValue)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.tcsCollected)}
                  </TableShell.Cell>
                </TableShell.Row>
              ))
            ) : (
              <TableShell.StateRow colSpan={5}>
                <EmptyState title={t('tax.byManufacturerTitle')} body={t('tax.byManufacturerCaption')} />
              </TableShell.StateRow>
            )}
          </TableShell.Body>
        </TableShell>
      </Card>

      <Card
        title={t('tax.commissionInvoicesTitle')}
        description={t('tax.commissionInvoicesCaption')}
        padded={false}
      >
        <ul className="divide-y divide-lightGray">
          {tcs.commissionInvoices.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="font-mono text-sm text-charcoal">{row.documentNumber}</span>
                <span className="block text-xs text-charcoal-light">
                  {row.manufacturerName} · {t('tax.column.invoices')}: {formatNumber(row.orderCount)}
                </span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-charcoal-light">
                  {formatINR(row.taxableValue)} + {formatINR(row.gstValue)}
                </span>
                <span className="text-base tabular-nums text-charcoal">{formatINR(row.total)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Fact({ label, value, emphasis = false }) {
  return (
    <div>
      <dt className="text-sm text-charcoal-light">{label}</dt>
      <dd
        className={
          emphasis
            ? 'mt-0.5 text-xl font-semibold tabular-nums text-primary'
            : 'mt-0.5 text-base tabular-nums text-charcoal'
        }
      >
        {value ?? '-'}
      </dd>
    </div>
  );
}
