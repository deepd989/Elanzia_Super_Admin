// ADM-071
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Flag, MessageSquare, Search, Star } from 'lucide-react';
import {
  Badge, Button, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input,
  PageHeader, Select, StatusPill, Tabs, Textarea,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearReviewFilters, fetchReviewCounts, fetchReviews, moderateReviews,
  selectReviewModeration, setReviewFilters, setReviewPage, setReviewPageSize,
  setReviewSearch, setReviewSelection, toggleReviewSelection,
} from '@/store/slices/trustSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = { published: 'success', pending: 'info', held: 'warning', removed: 'danger' };

const COLUMN_COUNT = 6;

export default function ReviewModeration() {
  const dispatch = useDispatch();

  // Data.
  const {
    reviews, total, query, counts, selectedIds, viewState, actionStatus, actionError, error,
  } = useSelector(selectReviewModeration);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canModerate = grantedPermissions.includes('catalogue.reviews.moderate');

  const [moderating, setModerating] = useState(null); // 'hold' | 'remove' | 'publish'
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchReviews());
    dispatch(fetchReviewCounts());
  }, [dispatch, query]);

  // Handlers.
  const handleModerate = async () => {
    const result = await dispatch(moderateReviews({
      reviewIds: selectedIds, decision: moderating, reason,
    }));
    setModerating(null); setReason('');
    if (!result.error) { dispatch(fetchReviews()); dispatch(fetchReviewCounts()); }
  };

  const stateTabs = [
    { id: '', label: t('common.all'), count: total },
    ...['published', 'pending', 'held', 'removed'].map((state) => ({
      id: state, label: t(`trust.reviewState.${state}`), count: counts?.byState?.[state] ?? 0,
    })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('trust.eyebrow')}
        title={t('trust.reviewsTitle')}
        subtitle={t('trust.reviewsSubtitle')}
        meta={<StatusPill tone="success">{t('trust.verifiedPurchase')}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('trust.tilePublished')} value={formatNumber(counts?.byState?.published ?? 0)} icon={MessageSquare} loading={!counts} />
        <MetricTile label={t('trust.tilePending')} value={formatNumber(counts?.pending ?? 0)} icon={MessageSquare} loading={!counts} />
        <MetricTile label={t('trust.tileFlagged')} value={formatNumber(counts?.flagged ?? 0)} icon={Flag} invertTrend loading={!counts} />
        <MetricTile
          label={t('trust.tileAverage')}
          value={counts ? `${counts.averageRating}` : '-'}
          caption={t('trust.averageHelp')}
          icon={Star}
          loading={!counts}
        />
      </div>

      <Tabs
        activeId={query.filters.state}
        onChange={(state) => dispatch(setReviewFilters({ ...query.filters, state }))}
        tabs={stateTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('logistics.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setReviewSearch(event.target.value))}
        />
        <Select
          id="rating" className="w-36" placeholder={t('common.all')}
          value={query.filters.rating}
          onChange={(event) => dispatch(setReviewFilters({ ...query.filters, rating: event.target.value }))}
          options={[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: t('trust.ratingStars', { count: value }) }))}
        />
        <Select
          id="target" className="w-44" placeholder={t('common.all')}
          value={query.filters.targetType}
          onChange={(event) => dispatch(setReviewFilters({ ...query.filters, targetType: event.target.value }))}
          options={[
            { value: 'product', label: t('trust.columnPiece') },
            { value: 'manufacturer', label: t('trust.party.manufacturer') },
          ]}
        />
        <Checkbox
          id="flagged-only" className="pb-2.5" label={t('trust.flaggedOnly')}
          checked={Boolean(query.filters.flaggedOnly)}
          onChange={(event) => dispatch(setReviewFilters({ ...query.filters, flaggedOnly: event.target.checked ? 'yes' : '' }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearReviewFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 && canModerate ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-warning-surface px-4 py-3">
          <span className="text-base font-medium text-charcoal">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setModerating('publish')}>{t('trust.publishReview')}</Button>
          <Button size="sm" variant="secondary" onClick={() => setModerating('hold')}>{t('trust.holdReview')}</Button>
          <Button size="sm" variant="danger" onClick={() => setModerating('remove')}>{t('trust.removeReview')}</Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setReviewSelection([]))}>{t('common.cancel')}</Button>
        </div>
      ) : null}

      <TableShell
        maxHeight="42rem"
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setReviewPage(page))}
            onPageSizeChange={(size) => dispatch(setReviewPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={selectedIds.length === reviews.length && reviews.length > 0}
              indeterminate={selectedIds.length > 0 && selectedIds.length < reviews.length}
              onChange={() => dispatch(setReviewSelection(
                selectedIds.length === reviews.length ? [] : reviews.map((row) => row.id),
              ))}
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('trust.columnReview')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnTarget')}</TableShell.HeadCell>
          <TableShell.HeadCell align="center">{t('trust.columnRating')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnSubmitted')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            reviews.map((review) => (
              <TableShell.Row key={review.id} selected={selectedIds.includes(review.id)}>
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${review.id}`}
                    checked={selectedIds.includes(review.id)}
                    onChange={() => dispatch(toggleReviewSelection(review.id))}
                  />
                </TableShell.SelectCell>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{review.title}</span>
                  <span className="block max-w-xl text-xs text-charcoal-light">{review.body}</span>
                  <span className="mt-1 block text-xs text-charcoal-lighter">
                    {review.jewellerName} · {review.orderId}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {review.targetName}
                  <span className="block text-xs text-charcoal-light">{review.manufacturerName}</span>
                </TableShell.Cell>
                <TableShell.Cell align="center" numeric>
                  <span className={review.rating <= 2 ? 'text-danger' : 'text-charcoal'}>
                    {t('trust.ratingStars', { count: review.rating })}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDate(review.submittedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(review.submittedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATE_TONES[review.state]}>
                    {t(`trust.reviewState.${review.state}`)}
                  </StatusPill>
                  {review.flagCount > 0 ? (
                    <Badge tone="danger" className="ml-1">{review.flagCount}</Badge>
                  ) : null}
                  {/* A low rating on a disputed order may be a fair account
                      rather than abuse. The moderator gets that context here. */}
                  {review.linkedDisputeId ? (
                    <Link
                      to={`/trust/disputes/${review.linkedDisputeId}`}
                      className="mt-1 block text-xs text-link underline underline-offset-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t('trust.linkedDispute', { id: review.linkedDisputeId })}
                    </Link>
                  ) : null}
                  {review.moderationReason ? (
                    <span className="block max-w-xs text-xs text-charcoal-light">{review.moderationReason}</span>
                  ) : null}
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT + 1}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchReviews())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearReviewFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={Boolean(moderating)}
        onClose={() => setModerating(null)}
        onConfirm={handleModerate}
        loading={actionStatus === 'loading'}
        tone={moderating === 'remove' ? 'danger' : 'primary'}
        title={t('trust.moderateTitle', { count: selectedIds.length })}
        body={t('trust.moderateBody')}
        confirmLabel={
          moderating === 'remove' ? t('trust.removeReview')
            : moderating === 'hold' ? t('trust.holdReview') : t('trust.publishReview')
        }
      >
        {/* Publishing back needs no reason. Holding or removing does, because
            the record of why has to outlive the review. */}
        {moderating !== 'publish' ? (
          <Textarea
            id="moderation-reason" className="mt-4" rows={3} required
            label={t('trust.moderationReason')}
            value={reason} onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
        {actionError ? <p className="mt-2 text-sm text-danger">{actionError.message}</p> : null}
      </ConfirmDialog>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-72 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
