import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { IndianRupee, Package, TrendingUp, Users } from 'lucide-react';
import {
  ChartCard,
  MediaViewer,
  MetricTile,
  PriceBreakup,
  SplitReviewLayout,
  TableShell,
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartTooltipProps,
} from '@/components';
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { manufacturers, products } from '@/data/core';
import { formatDate, formatGrams, formatINR, formatINRCompact, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';
import { Row, Section, Stack } from './GallerySection';

const SAMPLE_ROWS = manufacturers.slice(0, 6);

const STATUS_TONES = {
  approved: 'success',
  applied: 'info',
  under_review: 'info',
  info_requested: 'warning',
  rejected: 'danger',
  suspended: 'danger',
};

const CHART_DATA = [
  { month: 'Mar', gmv: 8200000, orders: 42 },
  { month: 'Apr', gmv: 9450000, orders: 51 },
  { month: 'May', gmv: 7800000, orders: 38 },
  { month: 'Jun', gmv: 11200000, orders: 64 },
  { month: 'Jul', gmv: 12750000, orders: 71 },
  { month: 'Aug', gmv: 10400000, orders: 58 },
];

const MEDIA_ITEMS = [
  { id: 'm1', type: 'document', label: 'GST registration certificate.pdf', caption: 'Uploaded 12 Aug 2026 by the applicant' },
  { id: 'm2', type: 'document', label: 'BIS hallmarking licence.pdf' },
  { id: 'm3', type: 'image', label: 'Workshop premises.jpg' },
  { id: 'm4', type: 'video', label: 'Production floor walkthrough.mp4' },
];

export default function SharedGallery() {
  const [tableState, setTableState] = useState('populated');
  const [chartState, setChartState] = useState('succeeded');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDir, setSortDir] = useState('desc');

  const toggleRow = (id) =>
    setSelected(selected.includes(id) ? selected.filter((row) => row !== id) : [...selected, id]);

  const COLUMN_COUNT = 7;

  return (
    <div className="flex flex-col gap-10">
      <Section id="tableshell" title="TableShell" note="Styling only. The screen writes its own rows, and each of the four states renders inside the same shell.">
        <Row label="state">
          {['populated', 'loading', 'empty', 'empty-filtered', 'error'].map((state) => (
            <Button
              key={state}
              size="sm"
              variant={tableState === state ? 'primary' : 'secondary'}
              onClick={() => setTableState(state)}
            >
              {state}
            </Button>
          ))}
        </Row>

        {selected.length > 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-accent bg-accent-light/20 px-4 py-2.5">
            <span className="text-base font-medium text-primary">
              {selected.length} {t('common.selected')}
            </span>
            <Button size="sm" variant="secondary">{t('common.approve')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>{t('common.cancel')}</Button>
          </div>
        ) : null}

        <TableShell
          footer={
            <TableShell.Pagination
              page={page}
              pageSize={pageSize}
              total={tableState === 'populated' ? 214 : 0}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <TableShell.Head>
            <TableShell.SelectCell header>
              <Checkbox
                id="g-table-all"
                checked={selected.length === SAMPLE_ROWS.length}
                indeterminate={selected.length > 0 && selected.length < SAMPLE_ROWS.length}
                onChange={() => setSelected(selected.length === SAMPLE_ROWS.length ? [] : SAMPLE_ROWS.map((r) => r.id))}
              />
            </TableShell.SelectCell>
            <TableShell.HeadCell>Business</TableShell.HeadCell>
            <TableShell.HeadCell>City</TableShell.HeadCell>
            <TableShell.HeadCell>GSTIN</TableShell.HeadCell>
            <TableShell.SortableHeadCell
              direction={sortDir}
              onSort={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            >
              Applied
            </TableShell.SortableHeadCell>
            <TableShell.HeadCell align="right">Lifetime GMV</TableShell.HeadCell>
            <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {tableState === 'populated' ? (
              SAMPLE_ROWS.map((manufacturer) => (
                <TableShell.Row
                  key={manufacturer.id}
                  selected={selected.includes(manufacturer.id)}
                  onClick={() => {}}
                >
                  <TableShell.SelectCell>
                    <Checkbox
                      id={`g-table-${manufacturer.id}`}
                      checked={selected.includes(manufacturer.id)}
                      onChange={() => toggleRow(manufacturer.id)}
                    />
                  </TableShell.SelectCell>
                  <TableShell.Cell>
                    <span className="font-medium text-charcoal">{manufacturer.businessName}</span>
                    <span className="block text-xs text-charcoal-light">{manufacturer.contactName}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>{manufacturer.city}</TableShell.Cell>
                  <TableShell.Cell className="font-mono text-xs">{manufacturer.gstin}</TableShell.Cell>
                  <TableShell.Cell>
                    {formatDate(manufacturer.appliedAt)}
                    <span className="block text-xs text-charcoal-light">
                      {formatRelativeTime(manufacturer.appliedAt)}
                    </span>
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINRCompact(manufacturer.lifetimeGmv)}
                  </TableShell.Cell>
                  <TableShell.Cell>
                    <StatusPill tone={STATUS_TONES[manufacturer.status]} label={manufacturer.status} />
                  </TableShell.Cell>
                  <TableShell.ActionsCell>
                    <Button size="sm" variant="ghost">{t('common.view')}</Button>
                  </TableShell.ActionsCell>
                </TableShell.Row>
              ))
            ) : (
              <TableShell.StateRow colSpan={COLUMN_COUNT + 1}>
                {tableState === 'loading' ? (
                  <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
                ) : tableState === 'error' ? (
                  <ErrorState detail="503 mock_failure" onRetry={() => setTableState('populated')} />
                ) : tableState === 'empty-filtered' ? (
                  <EmptyState
                    title={t('states.emptyFilteredTitle')}
                    body={t('states.emptyFilteredBody')}
                    actionLabel={t('common.clearFilters')}
                    onAction={() => setTableState('populated')}
                  />
                ) : (
                  <EmptyState />
                )}
              </TableShell.StateRow>
            )}
          </TableShell.Body>
        </TableShell>
      </Section>

      <Section id="metrictile" title="MetricTile">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Gross merchandise value"
            value={formatINRCompact(104000000)}
            icon={IndianRupee}
            trend={{ direction: 'up', value: 12.4, label: 'vs last month' }}
          />
          <MetricTile
            label="Active jewellers"
            value="312"
            icon={Users}
            trend={{ direction: 'down', value: 3.1, label: 'vs last month' }}
          />
          <MetricTile
            label="Return rate"
            value="4.2%"
            icon={Package}
            invertTrend
            trend={{ direction: 'up', value: 0.8, label: 'vs last month' }}
            caption="Up is bad here"
          />
          <MetricTile label="Loading" value="-" icon={TrendingUp} loading />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricTile label="Flat trend" value="1,204" trend={{ direction: 'flat', value: 0, label: 'no change' }} />
          <MetricTile label="No trend" value={formatINR(4850000)} caption="Since 1 Apr 2026" />
          <MetricTile label="Clickable" value="18" onClick={() => {}} caption="Opens the pending queue" />
        </div>
      </Section>

      <Section id="chartcard" title="ChartCard">
        <Row label="state">
          {['succeeded', 'loading', 'empty', 'failed'].map((state) => (
            <Button
              key={state}
              size="sm"
              variant={chartState === state ? 'primary' : 'secondary'}
              onClick={() => setChartState(state)}
            >
              {state}
            </Button>
          ))}
        </Row>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="GMV by month"
            description="Confirmed orders only"
            status={chartState}
            onRetry={() => setChartState('succeeded')}
            legend={[{ label: 'GMV', color: chartColors[0] }]}
          >
            <BarChart data={CHART_DATA}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" {...chartAxisProps} />
              <YAxis {...chartAxisProps} tickFormatter={formatINRCompact} width={70} />
              <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
              <Bar dataKey="gmv" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Orders by month"
            status={chartState}
            onRetry={() => setChartState('succeeded')}
            legend={[{ label: 'Orders', color: chartColors[1] }]}
          >
            <LineChart data={CHART_DATA}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" {...chartAxisProps} />
              <YAxis {...chartAxisProps} width={40} />
              <Tooltip {...chartTooltipProps} />
              <Line type="monotone" dataKey="orders" stroke={chartColors[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
        </div>
      </Section>

      <Section id="pricebreakup" title="PriceBreakup" note="Shared because the composition of a price is a domain rule. Wastage is added, not deducted.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PriceBreakup breakup={products[1].price} />
          <PriceBreakup breakup={products[4].price} dense />
        </div>
      </Section>

      <Section id="mediaviewer" title="MediaViewer">
        <Stack label="populated">
          <MediaViewer items={MEDIA_ITEMS} onDownload={() => {}} />
        </Stack>
        <Stack label="empty">
          <MediaViewer items={[]} />
        </Stack>
      </Section>

      <Section id="splitreview" title="SplitReviewLayout" note="Layout only. Evidence left, decision form right and pinned.">
        <SplitReviewLayout
          header={
            <PageHeader
              eyebrow="Onboarding"
              title={manufacturers[1].businessName}
              subtitle={`${manufacturers[1].city} · Applied ${formatRelativeTime(manufacturers[1].appliedAt)}`}
              meta={<StatusPill tone="info" label="under_review" />}
            />
          }
          media={<MediaViewer items={MEDIA_ITEMS} />}
          decisionTitle="Verification decision"
          decision={
            <div className="flex flex-col gap-field">
              <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-charcoal-light">GSTIN</dt>
                  <dd className="font-mono text-xs text-charcoal">{manufacturers[1].gstin}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-charcoal-light">Declared capacity</dt>
                  <dd className="num text-charcoal">{formatGrams(4200)} per month</dd>
                </div>
              </dl>

              <Select
                id="g-split-decision"
                label="Decision"
                options={[
                  { value: 'approve', label: 'Approve' },
                  { value: 'info', label: 'Request more information' },
                  { value: 'reject', label: 'Reject' },
                ]}
                placeholder="Choose a decision"
              />
              <Textarea id="g-split-note" label="Reviewer note" rows={5} help="Shared with the applicant" />
              <Checkbox id="g-split-ack" label="I have opened every document" />
            </div>
          }
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary">{t('common.cancel')}</Button>
              <Button>{t('common.submit')}</Button>
            </div>
          }
        />
      </Section>
    </div>
  );
}
