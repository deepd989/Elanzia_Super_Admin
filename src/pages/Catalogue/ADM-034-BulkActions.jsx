// ADM-034
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, Play } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  fetchBulkRuns,
  fetchCategories,
  fetchHsnCodes,
  previewBulkAction,
  runBulkAction,
  selectBulkActions,
  setBulkAction,
  setBulkFilters,
  setBulkParams,
  selectCategoryManager,
  selectHsnRegistry,
} from '@/store/slices/catalogueSlice';
import { formatDateTime, formatGrams, formatINR, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const ACTION_OPTIONS = [
  'publish', 'archive', 'unpublish', 'recategorise', 'set_hsn', 'set_visibility', 'request_changes',
].map((value) => ({ value, label: t(`catalogue.action.${value}`) }));

const STATUS_OPTIONS = ['draft', 'pending_review', 'live', 'out_of_stock', 'archived', 'rejected'].map(
  (value) => ({ value, label: t(`catalogue.status.${value}`) }),
);

const VISIBILITY_OPTIONS = [
  { value: 'public', label: t('catalogue.visibility.public') },
  { value: 'private', label: t('catalogue.visibility.private') },
];

const RUN_TONES = { succeeded: 'success', partial: 'warning', failed: 'danger' };

export default function BulkActions() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { action, params, filters, filterCount, preview, canPreview, canRun, runStatus, runError, lastRun, runs } =
    useSelector(selectBulkActions);
  const { categories } = useSelector(selectCategoryManager);
  const { codes } = useSelector(selectHsnRegistry);

  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchBulkRuns());
    dispatch(fetchCategories());
    dispatch(fetchHsnCodes());
  }, [dispatch]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setBulkFilters({ ...filters, [field]: event.target.value }));

  const handleRun = async () => {
    const result = await dispatch(
      runBulkAction({ previewToken: preview.token, action, filters, params, reason }),
    );
    if (result.error) return;
    setConfirming(false);
    setReason('');
    dispatch(fetchBulkRuns());
  };

  const categoryOptions = categories
    .filter((row) => row.parentId)
    .map((row) => ({ value: row.name, label: row.name }));
  const hsnOptions = codes
    .filter((row) => row.kind === 'goods')
    .map((row) => ({ value: row.code, label: `${row.code} - ${row.description}` }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.bulkTitle')}
        subtitle={t('catalogue.bulkSubtitle')}
        meta={
          preview.token ? (
            <StatusPill tone="warning">
              {t('catalogue.previewCount', { count: preview.total })}
            </StatusPill>
          ) : null
        }
      />

      <Card title={t('catalogue.stepSelect')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Select
            id="action"
            label={t('catalogue.bulkActionLabel')}
            required
            placeholder={t('catalogue.chooseAction')}
            value={action}
            onChange={(event) => dispatch(setBulkAction(event.target.value))}
            options={ACTION_OPTIONS}
          />
          {action === 'recategorise' ? (
            <Select
              id="param-category"
              label={t('catalogue.fieldCategory')}
              required
              value={params.category ?? ''}
              onChange={(event) => dispatch(setBulkParams({ category: event.target.value }))}
              options={categoryOptions}
            />
          ) : null}
          {action === 'set_hsn' ? (
            <Select
              id="param-hsn"
              label={t('catalogue.fieldHsn')}
              required
              value={params.hsn ?? ''}
              onChange={(event) => dispatch(setBulkParams({ hsn: event.target.value }))}
              options={hsnOptions}
            />
          ) : null}
          {action === 'set_visibility' ? (
            <Select
              id="param-visibility"
              label={t('catalogue.fieldVisibility')}
              required
              value={params.visibility ?? ''}
              onChange={(event) => dispatch(setBulkParams({ visibility: event.target.value }))}
              options={VISIBILITY_OPTIONS}
            />
          ) : null}
        </div>
      </Card>

      <Card title={t('catalogue.stepFilter')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-4">
          <Select
            id="filter-status"
            label={t('common.status')}
            placeholder={t('common.all')}
            value={filters.status}
            onChange={setFilter('status')}
            options={STATUS_OPTIONS}
          />
          <Select
            id="filter-category"
            label={t('catalogue.fieldCategory')}
            placeholder={t('common.all')}
            value={filters.category}
            onChange={setFilter('category')}
            options={categoryOptions}
          />
          <Select
            id="filter-visibility"
            label={t('catalogue.fieldVisibility')}
            placeholder={t('common.all')}
            value={filters.visibility}
            onChange={setFilter('visibility')}
            options={VISIBILITY_OPTIONS}
          />
          <Input
            id="filter-manufacturer"
            label={t('catalogue.columnRequestedBy')}
            placeholder={t('common.all')}
            value={filters.manufacturerId}
            onChange={setFilter('manufacturerId')}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={!canPreview}
            loading={preview.status === 'loading'}
            onClick={() => dispatch(previewBulkAction({ action, filters, params }))}
          >
            {t('catalogue.previewAction')}
          </Button>
          {filterCount === 0 ? (
            <span className="text-xs text-charcoal-light">{t('catalogue.previewEmptyBody')}</span>
          ) : null}
          {preview.error ? <span className="text-sm text-danger">{preview.error.message}</span> : null}
        </div>
      </Card>

      <PreviewPanel preview={preview} />

      {preview.token ? (
        <div className="flex items-center justify-end gap-3">
          <Button
            iconLeft={Play}
            disabled={!canRun}
            loading={runStatus === 'loading'}
            onClick={() => setConfirming(true)}
          >
            {t('catalogue.runAction')}
          </Button>
        </div>
      ) : null}

      {lastRun ? <RunResult run={lastRun} /> : null}

      <RunHistory runs={runs} />

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleRun}
        loading={runStatus === 'loading'}
        title={t('catalogue.runConfirmTitle', { count: preview.total })}
        body={t('catalogue.runConfirmBody')}
        confirmLabel={t('catalogue.runAction')}
      >
        <Textarea
          id="run-reason"
          className="mt-4"
          rows={3}
          required
          label={t('catalogue.bulkRunReason')}
          help={t('catalogue.bulkRunReasonHelp')}
          error={runError?.code === 'reason_required' ? runError.message : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {runError?.code === 'preview_stale' ? (
          <p className="mt-2 text-sm text-danger">{t('catalogue.staleWarning')}</p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

// The safety mechanism, not a convenience. Nothing runs until this has been
// looked at, because a bulk archive that matched 400 listings instead of 4
// cannot be undone from here.
function PreviewPanel({ preview }) {
  if (!preview.token) {
    return (
      <Card>
        <EmptyState title={t('catalogue.previewEmpty')} body={t('catalogue.previewEmptyBody')} />
      </Card>
    );
  }

  return (
    <>
      {preview.blocked.length > 0 ? (
        <Card
          title={t('catalogue.blockedTitle')}
          description={t('catalogue.blockedCount', { count: preview.blocked.length })}
          padded={false}
        >
          <ul className="divide-y divide-lightGray">
            {preview.blocked.map((row) => (
              <li key={row.productId} className="flex items-start gap-3 px-5 py-2.5">
                <AlertTriangle size={14} className="mt-1 shrink-0 text-warning" aria-hidden="true" />
                <span className="font-mono text-xs text-charcoal">{row.productId}</span>
                <span className="text-sm text-charcoal-light">{row.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card
        title={t('catalogue.stepPreview')}
        description={t('catalogue.previewCount', { count: preview.total })}
        padded={false}
      >
        <TableShell maxHeight="24rem">
          <TableShell.Head>
            <TableShell.HeadCell>{t('catalogue.fieldTitle')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('catalogue.fieldCategory')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('units.net')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('price.total')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          </TableShell.Head>
          <TableShell.Body>
            {preview.items.map((row) => (
              <TableShell.Row key={row.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.title}</span>
                  <span className="block text-xs text-charcoal-light">
                    {row.manufacturerName} · {row.sku}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>{row.category}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatGrams(row.netWeight)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.priceTotal)}
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill size="sm" tone="neutral">
                    {t(`catalogue.status.${row.status}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))}
          </TableShell.Body>
        </TableShell>
      </Card>
    </>
  );
}

function RunResult({ run }) {
  return (
    <Card title={t('catalogue.runsTitle')}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill tone={RUN_TONES[run.status]}>
          {t(`catalogue.runStatus.${run.status}`)}
        </StatusPill>
        <span className="text-base text-charcoal">
          {formatNumber(run.succeeded)} / {formatNumber(run.total)}
        </span>
        {run.blocked > 0 ? (
          <Badge tone="outline">{t('catalogue.blockedCount', { count: run.blocked })}</Badge>
        ) : null}
        <span className="text-xs text-charcoal-light">{run.reason}</span>
      </div>
    </Card>
  );
}

function RunHistory({ runs }) {
  return (
    <Card title={t('catalogue.runsTitle')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {runs.map((run) => (
          <li key={run.id} className="flex items-start gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-base text-charcoal">
                {t(`catalogue.action.${run.action}`)}
              </p>
              <p className="text-xs text-charcoal-light">
                {run.requestedByName} · {run.reason}
              </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-charcoal">
              {formatNumber(run.succeeded)} / {formatNumber(run.total)}
            </span>
            <StatusPill size="sm" tone={RUN_TONES[run.status]}>
              {t(`catalogue.runStatus.${run.status}`)}
            </StatusPill>
            <span className="shrink-0 text-xs text-charcoal-light">
              {formatDateTime(run.requestedAt)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
