// ADM-081
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Signpost } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearRedirectDraft,
  deleteRedirect,
  fetchRedirects,
  saveRedirect,
  selectRedirects,
  setRedirectDraftField,
  setRedirectFilters,
  setRedirectSearch,
  setRedirectSort,
  setRedirectsPage,
  startRedirectDraft,
} from '@/store/slices/growthSlice';
import { formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const HEALTH_TONES = {
  ok: 'success',
  chained: 'warning',
  loop: 'danger',
  target_missing: 'info',
  shadowed: 'danger',
};

const HEALTH_LABELS = {
  ok: 'growth.healthOk',
  chained: 'growth.healthChained',
  loop: 'growth.healthLoop',
  target_missing: 'growth.healthTargetMissing',
  shadowed: 'growth.healthShadowed',
};

const HEALTH_HELP = {
  chained: 'growth.healthChainedHelp',
  loop: 'growth.healthLoopHelp',
  target_missing: 'growth.healthTargetMissingHelp',
  shadowed: 'growth.healthShadowedHelp',
};

const HEALTH_OPTIONS = Object.keys(HEALTH_LABELS).map((value) => ({
  value,
  label: t(HEALTH_LABELS[value]),
}));

const KIND_OPTIONS = [
  { value: 301, label: t('growth.kind301') },
  { value: 302, label: t('growth.kind302') },
];

const COLUMN_COUNT = 5;

export default function Redirects() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    redirectRows,
    total,
    counts,
    query,
    draft,
    dirty,
    unhealthyCount,
    saveStatus,
    saveError,
    actionStatus,
    actionError,
    viewState,
    error,
  } = useSelector(selectRedirects);

  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    dispatch(fetchRedirects());
  }, [dispatch, query]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setRedirectDraftField({ field, value: event.target.value }));

  const handleSave = async () => {
    const result = await dispatch(saveRedirect(draft));
    if (!result.error) {
      dispatch(clearRedirectDraft());
      dispatch(fetchRedirects());
    }
  };

  const handleDelete = async () => {
    const result = await dispatch(deleteRedirect({ redirectId: deleting.id }));
    if (!result.error) {
      setDeleting(null);
      dispatch(fetchRedirects());
    }
  };

  const handleSort = (sortBy) =>
    dispatch(
      setRedirectSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'asc' ? 'desc' : 'asc',
      }),
    );

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.redirectsTitle')}
        subtitle={t('growth.redirectsSubtitle')}
        meta={
          unhealthyCount > 0 ? (
            <StatusPill tone="danger" dot>
              {t('growth.unhealthyCount', { count: unhealthyCount })}
            </StatusPill>
          ) : null
        }
        actions={
          <Button iconLeft={Plus} onClick={() => dispatch(startRedirectDraft())}>
            {t('growth.addRedirect')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('growth.redirectsSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setRedirectSearch(event.target.value))}
        />
        <Select
          id="health"
          className="w-52"
          placeholder={t('common.all')}
          value={query.filters.health}
          onChange={(event) =>
            dispatch(setRedirectFilters({ ...query.filters, health: event.target.value }))
          }
          options={HEALTH_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            dispatch(setRedirectSearch(''));
            dispatch(setRedirectFilters({ kind: '', health: '' }));
          }}
        >
          {t('common.clearFilters')}
        </Button>
      </div>

      {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setRedirectsPage(page))}
            onPageSizeChange={() => {}}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'fromPath' ? query.sortDir : null}
            onSort={() => handleSort('fromPath')}
          >
            {t('growth.columnFrom')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('growth.columnTo')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('growth.columnHealth')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('growth.columnHits')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            redirectRows.map((row) => (
              <RedirectRow
                key={row.id}
                redirect={row}
                onEdit={() => dispatch(startRedirectDraft(row))}
                onDelete={() => setDeleting(row)}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RedirectSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchRedirects())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setRedirectSearch(''))}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Signpost}
                  title={t('states.emptyTitle')}
                  body={t('states.emptyBody')}
                  actionLabel={t('growth.addRedirect')}
                  onAction={() => dispatch(startRedirectDraft())}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={Boolean(draft)}
        onClose={() => dispatch(clearRedirectDraft())}
        title={draft?.id ? t('common.edit') : t('growth.addRedirect')}
        footer={
          <>
            <Button variant="secondary" onClick={() => dispatch(clearRedirectDraft())}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
              {t('common.saveChanges')}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-field">
            <Input
              id="fromPath"
              className="font-mono"
              label={t('growth.redirectFrom')}
              required
              value={draft.fromPath}
              error={
                ['redirect_loop', 'from_path_taken', 'from_path_is_live_page'].includes(saveError?.code)
                  ? saveError.message
                  : undefined
              }
              onChange={setField('fromPath')}
            />
            <Input
              id="toPath"
              className="font-mono"
              label={t('growth.redirectTo')}
              required
              value={draft.toPath}
              error={saveError?.code === 'redirect_chain' ? saveError.message : undefined}
              onChange={setField('toPath')}
            />
            <Select
              id="kind"
              label={t('growth.redirectKind')}
              value={draft.kind}
              onChange={(event) =>
                dispatch(setRedirectDraftField({ field: 'kind', value: Number(event.target.value) }))
              }
              options={KIND_OPTIONS}
            />
            <Textarea
              id="reason"
              rows={2}
              label={t('growth.redirectReason')}
              required
              value={draft.reason}
              error={saveError?.code === 'validation_failed' ? saveError.message : undefined}
              onChange={setField('reason')}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={actionStatus === 'loading'}
        title={t('growth.deleteRedirectTitle', { from: deleting?.fromPath ?? '' })}
        body={t('growth.deleteRedirectBody', { hits: deleting?.hits ?? 0 })}
        confirmLabel={t('growth.deleteRedirect')}
      />
    </div>
  );
}

function RedirectRow({ redirect, onEdit, onDelete }) {
  return (
    <TableShell.Row onClick={onEdit}>
      <TableShell.Cell className="font-mono text-xs">{redirect.fromPath}</TableShell.Cell>
      <TableShell.Cell className="font-mono text-xs">{redirect.toPath}</TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={HEALTH_TONES[redirect.health]}>
          {t(HEALTH_LABELS[redirect.health])}
        </StatusPill>
        {/* An unhealthy redirect says what is wrong with it in the row. A
            health label on its own is a puzzle, not a diagnosis. */}
        {HEALTH_HELP[redirect.health] ? (
          <span className="block text-xs text-charcoal-light">{t(HEALTH_HELP[redirect.health])}</span>
        ) : (
          <span className="block text-xs text-charcoal-light">{redirect.reason}</span>
        )}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatNumber(redirect.hits)}
        {redirect.lastHitAt ? (
          <span className="block text-xs text-charcoal-light">
            {formatRelativeTime(redirect.lastHitAt)}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        <Button size="sm" variant="ghost" onClick={onEdit}>{t('common.edit')}</Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>{t('growth.deleteRedirect')}</Button>
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function RedirectSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
