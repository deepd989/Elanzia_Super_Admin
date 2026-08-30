// ADM-023
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearModerationFilters,
  decideProducts,
  fetchModerationCounts,
  fetchModerationQueue,
  selectModerationQueue,
  setModerationFilters,
  setModerationPage,
  setModerationPageSize,
  setModerationSearch,
  setModerationSelection,
  setModerationSort,
  toggleModerationSelection,
} from '@/store/slices/catalogueSlice';
import { formatDate, formatGrams, formatINR, formatPurity, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  draft: 'neutral',
  pending_review: 'warning',
  live: 'success',
  out_of_stock: 'warning',
  archived: 'neutral',
  rejected: 'danger',
};

const SEVERITY_TONES = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };

const STATUS_OPTIONS = ['draft', 'pending_review', 'live', 'out_of_stock', 'archived', 'rejected'].map(
  (value) => ({ value, label: t(`catalogue.status.${value}`) }),
);

const FLAG_OPTIONS = [
  'hallmark_missing',
  'below_media_standard',
  'no_video',
  'manufacturer_not_approved',
  'stale_listing',
  'zero_stock_live',
  'hsn_gst_mismatch',
].map((value) => ({ value, label: t(`catalogue.flag.${value}`) }));

const COLUMN_COUNT = 8;

export default function CatalogueModeration() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    listings,
    total,
    query,
    counts,
    selectedIds,
    allSelected,
    someSelected,
    blockedFromApproval,
    viewState,
    error,
    actionStatus,
    actionError,
  } = useSelector(selectModerationQueue);

  const [deciding, setDeciding] = useState(null); // 'approve' | 'request_changes'
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchModerationQueue());
    dispatch(fetchModerationCounts());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setModerationFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setModerationSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  const handleDecide = async () => {
    const result = await dispatch(
      decideProducts({ productIds: selectedIds, decision: deciding, reason }),
    );
    if (result.error) return;
    setDeciding(null);
    setReason('');
    dispatch(fetchModerationQueue());
    dispatch(fetchModerationCounts());
  };

  const categoryOptions = Object.keys(counts?.byCategory ?? {}).map((value) => ({
    value,
    label: value,
  }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.moderationTitle')}
        subtitle={t('catalogue.moderationSubtitle')}
        meta={
          counts ? (
            <StatusPill tone={counts.awaitingDecision > 0 ? 'warning' : 'success'}>
              {t('catalogue.awaitingCount', { count: counts.awaitingDecision })}
            </StatusPill>
          ) : null
        }
      />

      <Tabs
        activeId={query.filters.queue}
        onChange={(queue) => dispatch(setModerationFilters({ ...query.filters, queue }))}
        tabs={[
          { id: 'awaiting', label: t('catalogue.tabAwaiting'), count: counts?.awaitingDecision },
          { id: 'flagged', label: t('catalogue.tabFlagged'), count: counts?.flagged },
          { id: 'all', label: t('catalogue.tabAll'), count: counts?.total },
        ]}
      />

      {/* Filter row. Search first and widest, then the narrow selects, then the
          clear action pushed right. Same order on every queue. */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('catalogue.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setModerationSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="category"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.category}
          onChange={setFilter('category')}
          options={categoryOptions}
        />
        <Select
          id="flag"
          className="w-52"
          placeholder={t('common.all')}
          value={query.filters.flag}
          onChange={setFilter('flag')}
          options={FLAG_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearModerationFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-accent-light/20 px-4 py-2.5">
          <span className="text-base font-medium text-primary">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          {/* The server refuses these, so the bar says so rather than letting
              an operator press it and read the error afterwards. */}
          {blockedFromApproval > 0 ? (
            <StatusPill tone="warning" size="sm">
              {t('catalogue.blockedFromApproval', { count: blockedFromApproval })}
            </StatusPill>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => setDeciding('approve')}>
            {t('catalogue.approveSelected')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDeciding('request_changes')}>
            {t('catalogue.requestChangesSelected')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setModerationSelection([]))}>
            {t('common.cancel')}
          </Button>
          {actionError ? <span className="text-sm text-danger">{actionError.message}</span> : null}
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setModerationPage(page))}
            onPageSizeChange={(size) => dispatch(setModerationPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={() =>
                dispatch(setModerationSelection(allSelected ? [] : listings.map((row) => row.id)))
              }
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('catalogue.fieldTitle')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('catalogue.fieldCategory')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('units.net')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('price.total')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'listedAt' ? query.sortDir : null}
            onSort={() => handleSort('listedAt')}
          >
            {t('common.createdAt')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('catalogue.flagsTitle')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            listings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                selected={selectedIds.includes(listing.id)}
                onToggle={() => dispatch(toggleModerationSelection(listing.id))}
                onOpen={() => navigate(`/catalogue/products/${listing.id}`)}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <ListingSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchModerationQueue())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearModerationFilters())}
                />
              ) : null}
              {/* Not "nothing here yet". An empty decision queue means every
                  submission has been dealt with, and that is worth saying. */}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={CheckCircle2}
                  title={t('catalogue.allClearTitle')}
                  body={t('catalogue.allClearBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={Boolean(deciding)}
        onClose={() => setDeciding(null)}
        onConfirm={handleDecide}
        loading={actionStatus === 'loading'}
        tone={deciding === 'approve' ? 'primary' : 'danger'}
        title={
          deciding === 'approve'
            ? t('catalogue.approveSelected')
            : t('catalogue.requestChangesSelected')
        }
        body={t('common.selectedCount', { count: selectedIds.length })}
        confirmLabel={t('common.confirm')}
      >
        {deciding !== 'approve' ? (
          <Textarea
            id="bulk-reason"
            className="mt-4"
            rows={3}
            required
            label={t('catalogue.bulkReason')}
            help={t('catalogue.bulkReasonHelp')}
            error={actionError?.code === 'rejection_reason_required' ? actionError.message : undefined}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function ListingRow({ listing, selected, onToggle, onOpen }) {
  return (
    <TableShell.Row selected={selected} onClick={onOpen}>
      <TableShell.SelectCell>
        <Checkbox id={`select-${listing.id}`} checked={selected} onChange={onToggle} />
      </TableShell.SelectCell>

      <TableShell.Cell>
        <span className="flex items-center gap-2 font-medium text-charcoal">
          {listing.title}
          {listing.visibility === 'private' ? (
            <Badge tone="outline">{t('catalogue.visibility.private')}</Badge>
          ) : null}
        </span>
        <span className="block text-xs text-charcoal-light">
          {listing.manufacturerName} · {listing.sku}
        </span>
      </TableShell.Cell>

      <TableShell.Cell>
        {listing.category}
        <span className="block text-xs text-charcoal-light">
          {formatPurity(listing.purity)} · {listing.speciality}
        </span>
      </TableShell.Cell>

      {/* Weight to 3 decimals, right aligned, tabular. A jeweller reading
          12.4g where the record says 12.400g assumes we are rounding. */}
      <TableShell.Cell align="right" numeric>
        {formatGrams(listing.netWeight)}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatINR(listing.priceTotal)}
      </TableShell.Cell>

      <TableShell.Cell>
        {formatDate(listing.listedAt)}
        <span className="block text-xs text-charcoal-light">
          {formatRelativeTime(listing.listedAt)}
        </span>
      </TableShell.Cell>

      <TableShell.Cell>
        {listing.flagCount > 0 ? (
          <StatusPill size="sm" tone={SEVERITY_TONES[listing.topSeverity]}>
            {t(`catalogue.flag.${listing.flags[0].code}`)}
          </StatusPill>
        ) : (
          <span className="text-xs text-charcoal-lighter">{t('common.none')}</span>
        )}
        {listing.flagCount > 1 ? (
          <span className="block text-xs text-charcoal-light">+{listing.flagCount - 1}</span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={STATUS_TONES[listing.status]}>
          {t(`catalogue.status.${listing.status}`)}
        </StatusPill>
      </TableShell.Cell>
    </TableShell.Row>
  );
}

function ListingSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
