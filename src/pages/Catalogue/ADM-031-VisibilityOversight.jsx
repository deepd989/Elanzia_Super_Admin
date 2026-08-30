// ADM-031
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, Lock, Search, ShieldCheck, Unlock } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  fetchPrivateRange,
  fetchPrivateRanges,
  resealRange,
  revokeAccessGrant,
  selectVisibilityOversight,
  setRangeFilters,
  setRangePage,
  setRangeSearch,
  unsealPrivateRange,
} from '@/store/slices/catalogueSlice';
import { formatDate, formatDateTime, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const GRANT_TONES = { active: 'success', expired: 'neutral', revoked: 'danger' };

const GRANT_STATE_OPTIONS = [
  { value: 'has_active', label: t('catalogue.grantStatus.active') },
  { value: 'none_active', label: t('catalogue.grantStatus.expired') },
];

// The manufacturer is told what is written here, so a one word reason is not
// good enough. The server enforces the same floor.
const UNSEAL_REASON_MIN_LENGTH = 20;

const COLUMN_COUNT = 5;

export default function VisibilityOversight() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    ranges,
    total,
    query,
    range,
    grants,
    viewLogs,
    revealed,
    revealExpiresAt,
    unsealStatus,
    unsealError,
    actionStatus,
    actionError,
    viewState,
    error,
  } = useSelector(selectVisibilityOversight);

  const [unsealing, setUnsealing] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchPrivateRanges());
  }, [dispatch, query]);

  // Leaving the screen puts the designs back in their box.
  useEffect(() => () => dispatch(resealRange()), [dispatch]);

  // Handlers.
  const handleUnseal = async () => {
    const result = await dispatch(
      unsealPrivateRange({ manufacturerId: range.manufacturerId, reason }),
    );
    if (!result.error) {
      setUnsealing(false);
      setReason('');
      dispatch(fetchPrivateRange(range.manufacturerId));
    }
  };

  const handleRevoke = async () => {
    const result = await dispatch(revokeAccessGrant({ grantId: revoking.id, reason }));
    if (!result.error) {
      setRevoking(null);
      setReason('');
    }
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.visibilityTitle')}
        subtitle={t('catalogue.visibilitySubtitle')}
        meta={<StatusPill tone="info" dot>{t('catalogue.sealedBadge')}</StatusPill>}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('catalogue.visibilitySearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setRangeSearch(event.target.value))}
        />
        <Select
          id="grantState"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.grantState}
          onChange={(event) => dispatch(setRangeFilters({ grantState: event.target.value }))}
          options={GRANT_STATE_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            dispatch(setRangeSearch(''));
            dispatch(setRangeFilters({ grantState: '' }));
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
            onPageChange={(page) => dispatch(setRangePage(page))}
            onPageSizeChange={() => {}}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('catalogue.columnRequestedBy')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnPieces')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnGrants')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnViews')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            ranges.map((row) => (
              <TableShell.Row
                key={row.manufacturerId}
                selected={range?.manufacturerId === row.manufacturerId}
                onClick={() => dispatch(fetchPrivateRange(row.manufacturerId))}
              >
                <TableShell.Cell>
                  <span className="flex items-center gap-2 font-medium text-charcoal">
                    {row.manufacturerName}
                    <Badge tone="outline">{t('catalogue.sealedBadge')}</Badge>
                  </span>
                  <span className="block text-xs text-charcoal-light">{row.city}</span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatNumber(row.pieceCount)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatNumber(row.activeGrants)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatNumber(row.viewsLast30Days)}</TableShell.Cell>
                <TableShell.ActionsCell>
                  <Button size="sm" variant="ghost">{t('common.view')}</Button>
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RangeSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchPrivateRanges())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setRangeSearch(''))}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={ShieldCheck}
                  title={t('states.emptyTitle')}
                  body={t('catalogue.grantsEmpty')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      {range ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <GrantsPanel grants={grants} onRevoke={setRevoking} />
            <ViewLogPanel logs={viewLogs} />
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <SealPanel
              range={range}
              revealed={revealed}
              expiresAt={revealExpiresAt}
              onUnseal={() => setUnsealing(true)}
              onReseal={() => dispatch(resealRange())}
            />
          </aside>
        </div>
      ) : null}

      <ConfirmDialog
        open={unsealing}
        onClose={() => setUnsealing(false)}
        onConfirm={handleUnseal}
        loading={unsealStatus === 'loading'}
        title={t('catalogue.unsealTitle')}
        body={t('catalogue.unsealBody', {
          count: range?.pieceCount ?? 0,
          manufacturer: range?.manufacturerName ?? '',
        })}
        confirmLabel={t('catalogue.unsealButton')}
      >
        <Textarea
          id="unseal-reason"
          className="mt-4"
          rows={4}
          required
          label={t('catalogue.unsealReason')}
          help={t('catalogue.unsealReasonHelp', { min: UNSEAL_REASON_MIN_LENGTH })}
          error={unsealError?.code === 'reason_required' ? unsealError.message : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={handleRevoke}
        loading={actionStatus === 'loading'}
        title={t('catalogue.revokeTitle', { name: revoking?.jewellerName ?? '' })}
        body={t('catalogue.revokeBody')}
        confirmLabel={t('catalogue.revokeGrant')}
      >
        <Textarea
          id="revoke-reason"
          className="mt-4"
          rows={3}
          required
          label={t('catalogue.revokeReason')}
          error={actionError?.code === 'reason_required' ? actionError.message : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

// The heart of the protection model on screen. Sealed is the default state and
// the panel says so plainly, rather than showing an empty grid that looks like
// a loading failure.
function SealPanel({ range, revealed, expiresAt, onUnseal, onReseal }) {
  if (revealed) {
    return (
      <Card
        title={t('catalogue.unsealedTitle', { time: formatDateTime(expiresAt) })}
        description={t('catalogue.unsealedBody')}
        action={
          <Button size="sm" variant="secondary" iconLeft={Lock} onClick={onReseal}>
            {t('catalogue.reseal')}
          </Button>
        }
        padded={false}
      >
        <ul className="divide-y divide-lightGray">
          {revealed.map((piece) => (
            <li key={piece.id} className="px-5 py-3">
              <p className="text-base text-charcoal">{piece.title}</p>
              <p className="font-mono text-xs text-charcoal-light">{piece.sku}</p>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <Card title={range.manufacturerName} description={range.city}>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lightGray text-charcoal-light">
          <Lock size={22} aria-hidden="true" />
        </span>
        <p className="font-display text-lg text-primary">{t('catalogue.sealedTitle')}</p>
        <p className="text-sm text-charcoal-light">{t('catalogue.sealedBody')}</p>
        <p className="font-display text-3xl text-primary">{formatNumber(range.pieceCount)}</p>
        <p className="text-xs text-charcoal-light">{t('catalogue.columnPieces')}</p>

        <Button variant="secondary" iconLeft={Unlock} className="mt-2" onClick={onUnseal}>
          {t('catalogue.unsealButton')}
        </Button>
      </div>

      <dl className="flex flex-col gap-2 border-t border-lightGray-dark pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-charcoal-light">{t('catalogue.columnGrants')}</dt>
          <dd className="tabular-nums text-charcoal">{formatNumber(range.activeGrants)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-charcoal-light">{t('catalogue.columnViews')}</dt>
          <dd className="tabular-nums text-charcoal">{formatNumber(range.viewsLast30Days)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function GrantsPanel({ grants, onRevoke }) {
  return (
    <Card title={t('catalogue.grantsTitle')} description={t('catalogue.grantedByManufacturer')} padded={false}>
      {grants.length === 0 ? (
        <div className="p-5">
          <EmptyState title={t('catalogue.grantsTitle')} body={t('catalogue.grantsEmpty')} />
        </div>
      ) : (
        <ul className="divide-y divide-lightGray">
          {grants.map((grant) => (
            <li key={grant.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-base text-charcoal">{grant.jewellerName}</p>
                <p className="text-xs text-charcoal-light">
                  {grant.jewellerCity} · {t('catalogue.columnGranted')} {formatDate(grant.grantedAt)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-charcoal-light">
                {t('catalogue.columnExpires')} {formatDate(grant.expiresAt)}
              </span>
              <StatusPill size="sm" tone={GRANT_TONES[grant.status]}>
                {t(`catalogue.grantStatus.${grant.status}`)}
              </StatusPill>
              {grant.status === 'active' ? (
                <Button size="sm" variant="ghost" onClick={() => onRevoke(grant)}>
                  {t('catalogue.revokeGrant')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ViewLogPanel({ logs }) {
  return (
    <Card title={t('catalogue.viewLogTitle')} padded={false}>
      {logs.length === 0 ? (
        <div className="p-5">
          <EmptyState title={t('catalogue.viewLogTitle')} body={t('catalogue.viewLogEmpty')} />
        </div>
      ) : (
        <ul className="divide-y divide-lightGray">
          {logs.slice(0, 12).map((log) => (
            <li key={log.id} className="flex items-start gap-3 px-5 py-3">
              <Eye size={14} className="mt-1 shrink-0 text-charcoal-lighter" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-base text-charcoal">
                  {log.viewerName}
                  {log.viewerType === 'admin' ? (
                    <Badge tone="danger" className="ml-2">
                      {t('catalogue.actionUnsealed')}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-charcoal-light">
                  {log.action === 'viewed_range'
                    ? t('catalogue.actionViewedRange')
                    : log.action === 'viewed_piece'
                      ? t('catalogue.actionViewedPiece')
                      : t('catalogue.actionUnsealed')}
                  {log.reason ? ` · ${log.reason}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-charcoal-light">
                {formatRelativeTime(log.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RangeSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
