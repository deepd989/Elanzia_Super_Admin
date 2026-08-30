// ADM-077
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutGrid, Plus, Search, ShieldAlert } from 'lucide-react';
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
import {
  clearCollectionDraft,
  fetchCollection,
  fetchCollections,
  fetchMedia,
  publishCollection,
  saveCollection,
  selectCollectionCuration,
  setCollectionDraftField,
  setCollectionFilters,
  setCollectionSearch,
  startCollectionDraft,
  toggleCollectionProduct,
} from '@/store/slices/growthSlice';
import { formatINR } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = { draft: 'neutral', published: 'success', scheduled: 'info', archived: 'neutral' };

const STATUS_OPTIONS = ['draft', 'published', 'scheduled', 'archived'].map((value) => ({
  value,
  label: t(`growth.collectionStatus.${value}`),
}));

const SURFACE_OPTIONS = [
  { value: 'homepage', label: t('growth.surfaceHomepage') },
  { value: 'category_page', label: t('growth.surfaceCategoryPage') },
  { value: 'campaign', label: t('growth.surfaceCampaign') },
  { value: 'microsite', label: t('growth.surfaceMicrosite') },
];

export default function Collections() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    collectionRows,
    query,
    draft,
    items,
    dirty,
    blocked,
    blockedCount,
    canPublish,
    liveWithBlocked,
    saveStatus,
    saveError,
    publishStatus,
    publishError,
    assetOptions,
    viewState,
    error,
  } = useSelector(selectCollectionCuration);

  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    dispatch(fetchCollections());
    dispatch(fetchMedia());
  }, [dispatch, query]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setCollectionDraftField({ field, value: event.target.value }));

  const handleSave = () => dispatch(saveCollection(draft));

  const handlePublish = async () => {
    const result = await dispatch(publishCollection({ collectionId: draft.id }));
    if (!result.error) {
      setPublishing(false);
      dispatch(fetchCollections());
    }
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.collectionsTitle')}
        subtitle={t('growth.collectionsSubtitle')}
        meta={
          liveWithBlocked > 0 ? (
            <StatusPill tone="danger" dot>
              {t('growth.liveWithBlocked', { count: liveWithBlocked })}
            </StatusPill>
          ) : null
        }
        actions={
          <Button iconLeft={Plus} onClick={() => dispatch(startCollectionDraft())}>
            {t('growth.addCollection')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-3">
          <Input
            id="search"
            iconLeft={Search}
            placeholder={t('growth.collectionsSearchPlaceholder')}
            value={query.search}
            onChange={(event) => dispatch(setCollectionSearch(event.target.value))}
          />
          <Select
            id="status"
            placeholder={t('common.all')}
            value={query.filters.status}
            onChange={(event) =>
              dispatch(setCollectionFilters({ ...query.filters, status: event.target.value }))
            }
            options={STATUS_OPTIONS}
          />

          <Card padded={false} className="max-h-96 overflow-y-auto">
            {viewState === 'loading' ? <ListSkeleton /> : null}
            {viewState === 'error' ? (
              <div className="p-4">
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchCollections())} />
              </div>
            ) : null}
            {viewState === 'empty-filtered' ? (
              <div className="p-4">
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setCollectionSearch(''))}
                />
              </div>
            ) : null}
            {viewState === 'empty' ? (
              <div className="p-4">
                <EmptyState icon={LayoutGrid} title={t('states.emptyTitle')} body={t('states.emptyBody')} />
              </div>
            ) : null}

            {viewState === 'populated' ? (
              <ul className="divide-y divide-lightGray">
                {collectionRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => dispatch(fetchCollection(row.id))}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-lightGray ${
                        draft?.id === row.id ? 'bg-accent-light/20' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 text-base text-charcoal">
                        {row.title}
                        {/* A live edit carrying a piece that can no longer go
                            public is the row that matters on a Monday. */}
                        {row.blocked.length > 0 ? (
                          <Badge tone="danger">{row.blocked.length}</Badge>
                        ) : null}
                      </span>
                      <span className="text-xs text-charcoal-light">
                        {t('growth.publishedItemCount', {
                          published: row.publishedItemCount,
                          total: row.itemCount,
                        })}
                      </span>
                      <StatusPill size="sm" tone={STATUS_TONES[row.status]}>
                        {t(`growth.collectionStatus.${row.status}`)}
                      </StatusPill>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {!draft ? (
            <Card>
              <EmptyState
                icon={LayoutGrid}
                title={t('growth.selectACollection')}
                body={t('growth.selectACollectionBody')}
                actionLabel={t('growth.addCollection')}
                onAction={() => dispatch(startCollectionDraft())}
              />
            </Card>
          ) : (
            <>
              {blockedCount > 0 ? <BlockedPanel blocked={blocked} /> : null}

              <Card
                title={draft.title || t('growth.addCollection')}
                action={
                  draft.id ? (
                    <StatusPill tone={STATUS_TONES[draft.status]}>
                      {t(`growth.collectionStatus.${draft.status}`)}
                    </StatusPill>
                  ) : null
                }
              >
                <div className="grid grid-cols-1 gap-field md:grid-cols-2">
                  <Input
                    id="title"
                    label={t('growth.collectionTitleField')}
                    required
                    value={draft.title}
                    error={saveError?.code === 'slug_taken' ? saveError.message : undefined}
                    onChange={setField('title')}
                  />
                  <Select
                    id="surface"
                    label={t('growth.collectionSurface')}
                    value={draft.surface}
                    onChange={setField('surface')}
                    options={SURFACE_OPTIONS}
                  />
                  <Select
                    id="hero"
                    label={t('growth.pageHero')}
                    placeholder={t('common.none')}
                    value={draft.heroAssetId ?? ''}
                    onChange={setField('heroAssetId')}
                    options={assetOptions}
                  />
                  <Textarea
                    id="description"
                    className="md:col-span-2"
                    rows={2}
                    label={t('growth.collectionDescription')}
                    value={draft.description ?? ''}
                    onChange={setField('description')}
                  />
                </div>
              </Card>

              <Card
                title={t('growth.piecesTitle')}
                description={t('growth.publishedItemCount', {
                  published: draft.publishedItemCount ?? items.filter((i) => i.listable).length,
                  total: items.length,
                })}
                padded={false}
              >
                {items.length === 0 ? (
                  <div className="p-5">
                    <EmptyState title={t('growth.piecesTitle')} body={t('states.emptyBody')} />
                  </div>
                ) : (
                  <ul className="divide-y divide-lightGray">
                    {items.map((item) => (
                      <li key={item.productId} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-base text-charcoal">
                            {item.title}
                            {!item.listable ? (
                              <Badge tone="danger">{t('growth.blockedCount', { count: 1 })}</Badge>
                            ) : null}
                          </p>
                          <p className="font-mono text-xs text-charcoal-light">
                            {item.sku} · {item.manufacturerName}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums text-charcoal">
                          {formatINR(item.priceTotal)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dispatch(toggleCollectionProduct(item.productId))}
                        >
                          {t('growth.removePiece')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {draft ? (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
          <div className="flex items-center justify-end gap-2">
            {saveError && saveError.code !== 'slug_taken' ? (
              <p className="mr-auto text-sm text-danger">{saveError.message}</p>
            ) : null}
            {publishError ? <p className="mr-auto text-sm text-danger">{publishError.message}</p> : null}
            <Button variant="secondary" onClick={() => dispatch(clearCollectionDraft())}>
              {t('common.cancel')}
            </Button>
            <Button variant="secondary" disabled={!dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
              {t('common.saveChanges')}
            </Button>
            {/* Disabled while anything is blocked, for the same reason the
                server refuses it. */}
            <Button
              disabled={!canPublish}
              loading={publishStatus === 'loading'}
              onClick={() => setPublishing(true)}
            >
              {t('growth.publishCollection')}
            </Button>
          </div>
        </footer>
      ) : null}

      <ConfirmDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        onConfirm={handlePublish}
        loading={publishStatus === 'loading'}
        tone="primary"
        title={t('growth.publishCollectionTitle', { title: draft?.title ?? '' })}
        body={t('growth.publishCollectionBody', { surface: draft?.surface?.replace(/_/g, ' ') ?? '' })}
        confirmLabel={t('growth.publishCollection')}
      />
    </div>
  );
}

// The guard's verdict, from the server. A screen never decides for itself
// whether a piece may go public - it renders what it was told and says why.
function BlockedPanel({ blocked }) {
  return (
    <Card
      title={t('growth.protectedTitle')}
      description={t('growth.protectedBody')}
      className="border-danger"
      padded={false}
    >
      <ul className="divide-y divide-lightGray">
        {blocked.map((row) => (
          <li key={`${row.productId}-${row.code}`} className="flex items-start gap-3 px-5 py-3">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
                <span className="font-mono text-xs">{row.productId}</span>
                <StatusPill size="sm" tone="danger">
                  {t(`growth.blockCode.${row.code}`)}
                </StatusPill>
              </p>
              <p className="text-xs text-charcoal-light">{row.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ListSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 px-4 py-3">
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
