// ADM-069
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Scale, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorState, Input,
  PageHeader, Select, Spinner, StatusPill, Textarea,
} from '@/components/primitives';
import { MediaViewer, MetricTile, SplitReviewLayout, TableShell } from '@/components';
import {
  clearReturnFilters, closeReturnWorkspace, fetchReturnCounts, fetchReturnWorkspace,
  fetchReturns, processRefund, selectReturnWorkspace, selectReturnsQueue,
  setDecisionField, setReturnFilters, setReturnPage, setReturnPageSize,
  setReturnSearch, verifyReturn,
} from '@/store/slices/logisticsSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatGrams, formatINR, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = {
  awaiting_verification: 'warning', verified: 'info',
  refunded: 'success', disputed: 'danger', rejected: 'neutral',
};

const STATE_OPTIONS = Object.keys(STATE_TONES).map((value) => ({
  value, label: t(`logistics.returnState.${value}`),
}));

const COLUMN_COUNT = 7;

export default function ReturnsVerificationQueue() {
  const dispatch = useDispatch();

  // Data.
  const { returns, total, query, counts, toleranceGrams, viewState, error } =
    useSelector(selectReturnsQueue);
  const workspace = useSelector(selectReturnWorkspace);

  useEffect(() => {
    dispatch(fetchReturns());
    dispatch(fetchReturnCounts());
  }, [dispatch, query]);

  // Markup. The workspace takes over the screen when a return is open, because
  // watching a video and reading a table at once helps nobody.
  if (workspace.viewState !== 'loading' || workspace.returnRecord) {
    if (workspace.returnRecord) {
      return <VerificationWorkspace workspace={workspace} onClose={() => dispatch(closeReturnWorkspace())} />;
    }
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('logistics.eyebrow')}
        title={t('logistics.returnsTitle')}
        subtitle={t('logistics.returnsSubtitle')}
        meta={<StatusPill tone="info">{t('logistics.noRefundRule')}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('logistics.tileAwaiting')} value={formatNumber(counts?.awaitingVerification ?? 0)} icon={Scale} loading={!counts} />
        <MetricTile label={t('logistics.tileBlocked')} value={formatNumber(counts?.blockedByDispute ?? 0)} icon={TriangleAlert} invertTrend loading={!counts} />
        <MetricTile label={t('logistics.returnState.refunded')} value={formatNumber(counts?.byState?.refunded ?? 0)} icon={ShieldCheck} loading={!counts} />
        <MetricTile label={t('logistics.tileTolerance')} value={formatGrams(toleranceGrams)} loading={!counts} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('logistics.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setReturnSearch(event.target.value))}
        />
        <Select
          id="state" className="w-52" placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) => dispatch(setReturnFilters({ ...query.filters, state: event.target.value }))}
          options={STATE_OPTIONS}
        />
        <Select
          id="reason" className="w-56" placeholder={t('common.all')}
          value={query.filters.reasonCode}
          onChange={(event) => dispatch(setReturnFilters({ ...query.filters, reasonCode: event.target.value }))}
          options={Object.keys(counts?.byReason ?? {}).map((code) => ({
            value: code, label: t(`logistics.returnReason.${code}`),
          }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearReturnFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setReturnPage(page))}
            onPageSizeChange={(size) => dispatch(setReturnPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('logistics.columnReturn')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnPiece')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnReason')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnDeclaredWeight')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnShortfall')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnRefund')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            returns.map((row) => (
              <TableShell.Row key={row.id} onClick={() => dispatch(fetchReturnWorkspace(row.id))}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.id}</span>
                  <span className="block text-xs text-charcoal-light">
                    {row.orderId} · {formatRelativeTime(row.raisedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <span className="text-charcoal">{row.title}</span>
                  <span className="block font-mono text-xs text-charcoal-light">{row.sku}</span>
                </TableShell.Cell>
                <TableShell.Cell className="text-charcoal-light">
                  {t(`logistics.returnReason.${row.reasonCode}`)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatGrams(row.declaredNetWeight)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {row.shortfallGrams === null ? (
                    <span className="text-charcoal-lighter">-</span>
                  ) : (
                    <span className={row.withinTolerance ? 'text-charcoal-light' : 'text-danger'}>
                      {formatGrams(row.shortfallGrams)}
                    </span>
                  )}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatINR(row.refundAmount)}</TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATE_TONES[row.state]}>
                    {t(`logistics.returnState.${row.state}`)}
                  </StatusPill>
                  {row.disputeId ? (
                    <span className="block font-mono text-xs text-danger">{row.disputeId}</span>
                  ) : null}
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchReturns())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearReturnFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

// The unboxing video on the left, the weigh-in and the decision on the right.
function VerificationWorkspace({ workspace, onClose }) {
  const dispatch = useDispatch();
  const { grantedPermissions } = useSelector(selectShellSession);
  const canVerify = grantedPermissions.includes('returns.verify');
  const canRefund = grantedPermissions.includes('returns.refund');

  const {
    returnRecord, media, decision, previewShortfall, previewWithinTolerance,
    toleranceGrams, disputeCreated, canRefund: isVerified, isBlocked,
    decisionStatus, decisionError, refundStatus, refundError,
  } = workspace;

  const mediaItems = media.map((item) => ({
    id: item.id,
    type: item.type,
    url: item.url,
    label: item.label,
    caption: t('trust.uploadedBy', { party: item.uploadedByParty }),
  }));

  const isPending = returnRecord.state === 'awaiting_verification';

  return (
    <SplitReviewLayout
      header={
        <PageHeader
          eyebrow={t('logistics.eyebrow')}
          title={t('logistics.workspaceTitle', { sku: returnRecord.sku })}
          subtitle={t('logistics.workspaceSubtitle', {
            jeweller: returnRecord.jewellerName, order: returnRecord.orderId,
          })}
          meta={
            <StatusPill tone={STATE_TONES[returnRecord.state]}>
              {t(`logistics.returnState.${returnRecord.state}`)}
            </StatusPill>
          }
          actions={<Button variant="secondary" onClick={onClose}>{t('common.back')}</Button>}
        />
      }
      media={<MediaViewer items={mediaItems} onDownload={() => {}} />}
      decisionTitle={t('logistics.weighInCard')}
      decision={
        <div className="flex flex-col gap-field">
          <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
            <Row label={t('logistics.columnReason')} value={t(`logistics.returnReason.${returnRecord.reasonCode}`)} />
            <Row label={t('logistics.declaredWeight')} value={formatGrams(returnRecord.declaredNetWeight)} />
            <Row label={t('common.createdAt')} value={formatDate(returnRecord.raisedAt)} />
          </dl>

          {isPending ? (
            <>
              <Input
                id="received-weight" type="number" step="0.001" required
                label={t('logistics.receivedWeight')}
                help={t('logistics.receivedWeightHelp')}
                disabled={!canVerify}
                value={decision.receivedNetWeight}
                onChange={(event) => dispatch(setDecisionField({ field: 'receivedNetWeight', value: event.target.value }))}
              />

              {previewShortfall !== null ? (
                <div className={`rounded border px-3 py-2.5 text-sm ${
                  previewWithinTolerance
                    ? 'border-success/30 bg-success-surface text-success'
                    : 'border-danger/30 bg-danger-surface text-danger'
                }`}>
                  <p className="font-medium">
                    {t('logistics.shortfallLabel')} {formatGrams(Math.max(0, previewShortfall))}
                  </p>
                  <p className="text-charcoal-light">
                    {t('logistics.toleranceLabel', { grams: formatGrams(toleranceGrams) })}
                  </p>
                  <p className="mt-1">
                    {previewWithinTolerance ? t('logistics.withinTolerance') : t('logistics.beyondTolerance')}
                  </p>
                  {!previewWithinTolerance ? (
                    <p className="mt-1 font-medium">{t('logistics.beyondToleranceWarning')}</p>
                  ) : null}
                </div>
              ) : null}

              {/* Mandatory. The video is what the weigh-in is checked against,
                  so verifying without watching it is not verification. */}
              <Checkbox
                id="media-checked"
                label={t('logistics.mediaCheck')}
                help={t('logistics.mediaCheckHelp')}
                disabled={!canVerify}
                checked={decision.mediaChecked}
                onChange={(event) => dispatch(setDecisionField({ field: 'mediaChecked', value: event.target.checked }))}
              />

              <Textarea
                id="verify-note" rows={3} label={t('logistics.verificationNote')}
                disabled={!canVerify}
                value={decision.note}
                onChange={(event) => dispatch(setDecisionField({ field: 'note', value: event.target.value }))}
              />

              {decisionError ? <p className="text-sm text-danger">{decisionError.message}</p> : null}

              <Button
                fullWidth
                disabled={!canVerify || !decision.mediaChecked || !decision.receivedNetWeight}
                loading={decisionStatus === 'loading'}
                onClick={() => dispatch(verifyReturn({
                  id: returnRecord.id,
                  receivedNetWeight: decision.receivedNetWeight,
                  mediaChecked: decision.mediaChecked,
                  note: decision.note,
                }))}
              >
                {t('logistics.submitVerification')}
              </Button>
            </>
          ) : null}

          {disputeCreated ? (
            <div className="rounded border border-danger/30 bg-danger-surface px-3 py-2.5 text-sm">
              <p className="font-medium text-danger">{t('logistics.disputeOpenedTitle')}</p>
              <p className="text-charcoal-light">
                {t('logistics.disputeOpenedBody', { dispute: disputeCreated.id })}
              </p>
              <Link to={`/trust/disputes/${disputeCreated.id}`} className="mt-2 inline-block">
                <Button size="sm" variant="secondary">{t('logistics.openDispute')}</Button>
              </Link>
            </div>
          ) : null}

          <Card title={t('logistics.refundCard')} className="shadow-none">
            <dl className="flex flex-col gap-2 text-sm">
              <Row label={t('logistics.refundAmount')} value={formatINR(returnRecord.refundAmount)} />
            </dl>
            <p className="mt-1 text-xs text-charcoal-light">{t('logistics.refundAmountHelp')}</p>

            {returnRecord.state === 'refunded' ? (
              <p className="mt-3 text-sm text-success">
                {t('logistics.alreadyRefunded', { when: formatDate(returnRecord.refundedAt) })}
              </p>
            ) : isBlocked ? (
              <p className="mt-3 text-sm text-danger">
                {t('logistics.refundBlockedDispute', { dispute: returnRecord.disputeId })}
              </p>
            ) : !isVerified ? (
              <p className="mt-3 text-sm text-warning">{t('logistics.refundBlockedVerification')}</p>
            ) : (
              <Button
                fullWidth className="mt-3"
                disabled={!canRefund}
                loading={refundStatus === 'loading'}
                onClick={() => dispatch(processRefund({ id: returnRecord.id }))}
              >
                {t('logistics.processRefund')}
              </Button>
            )}
            {refundError ? <p className="mt-2 text-sm text-danger">{refundError.message}</p> : null}
          </Card>
        </div>
      }
    />
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-charcoal-light">{label}</dt>
      <dd className="num text-right text-charcoal">{value}</dd>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-5 w-28 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
