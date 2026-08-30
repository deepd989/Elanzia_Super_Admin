// ADM-075
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FileText, Plus, Search } from 'lucide-react';
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
  clearPageDraft,
  fetchMedia,
  fetchPage,
  fetchPages,
  publishPage,
  savePage,
  selectCmsPages,
  setPageDraftField,
  setPageFilters,
  setPageSearch,
  startPageDraft,
  unpublishPage,
} from '@/store/slices/growthSlice';
import { formatDate, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  draft: 'neutral',
  in_review: 'warning',
  published: 'success',
  archived: 'neutral',
};

const STATUS_OPTIONS = ['draft', 'in_review', 'published', 'archived'].map((value) => ({
  value,
  label: t(`growth.pageStatus.${value}`),
}));

export default function CmsPages() {
  const { pageId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    pageRows,
    query,
    draft,
    dirty,
    saveStatus,
    saveError,
    publishStatus,
    publishError,
    assetOptions,
    canPublish,
    missingMetaDescription,
    viewState,
    error,
  } = useSelector(selectCmsPages);

  const [confirming, setConfirming] = useState(null); // 'publish' | 'unpublish'
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchPages());
    dispatch(fetchMedia());
  }, [dispatch, query]);

  // The route carries the selection, so a page is linkable and the browser
  // back button walks the editor rather than leaving the screen.
  useEffect(() => {
    if (pageId) dispatch(fetchPage(pageId));
    else dispatch(clearPageDraft());
  }, [dispatch, pageId]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setPageDraftField({ field, value: event.target.value }));

  const handleSave = async () => {
    const result = await dispatch(savePage(draft));
    if (!result.error && !pageId) navigate(`/growth/pages/${result.payload.id}`);
  };

  const handleConfirm = async () => {
    const result =
      confirming === 'publish'
        ? await dispatch(publishPage({ pageId: draft.id }))
        : await dispatch(unpublishPage({ pageId: draft.id, reason }));

    if (result.error) return;
    setConfirming(null);
    setReason('');
    dispatch(fetchPages());
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.pagesTitle')}
        subtitle={t('growth.pagesSubtitle')}
        actions={
          <Button
            iconLeft={Plus}
            onClick={() => {
              navigate('/growth/pages');
              dispatch(startPageDraft());
            }}
          >
            {t('growth.addPage')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-3">
          <Input
            id="search"
            iconLeft={Search}
            placeholder={t('growth.pagesSearchPlaceholder')}
            value={query.search}
            onChange={(event) => dispatch(setPageSearch(event.target.value))}
          />
          <Select
            id="status"
            placeholder={t('common.all')}
            value={query.filters.status}
            onChange={(event) => dispatch(setPageFilters({ status: event.target.value }))}
            options={STATUS_OPTIONS}
          />

          <Card padded={false} className="max-h-96 overflow-y-auto">
            {viewState === 'loading' ? <ListSkeleton /> : null}
            {viewState === 'error' ? (
              <div className="p-4">
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchPages())} />
              </div>
            ) : null}
            {viewState === 'empty-filtered' ? (
              <div className="p-4">
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setPageSearch(''))}
                />
              </div>
            ) : null}
            {viewState === 'empty' ? (
              <div className="p-4">
                <EmptyState icon={FileText} title={t('states.emptyTitle')} body={t('states.emptyBody')} />
              </div>
            ) : null}

            {viewState === 'populated' ? (
              <ul className="divide-y divide-lightGray">
                {pageRows.map((page) => (
                  <li key={page.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/growth/pages/${page.id}`)}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-lightGray ${
                        draft?.id === page.id ? 'bg-accent-light/20' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 text-base text-charcoal">
                        {page.title}
                        {!page.metaDescription && page.status === 'published' ? (
                          <Badge tone="danger">!</Badge>
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-charcoal-light">{page.path}</span>
                      <StatusPill size="sm" tone={STATUS_TONES[page.status]}>
                        {t(`growth.pageStatus.${page.status}`)}
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
                icon={FileText}
                title={t('growth.selectAPage')}
                body={t('growth.selectAPageBody')}
                actionLabel={t('growth.addPage')}
                onAction={() => dispatch(startPageDraft())}
              />
            </Card>
          ) : (
            <>
              <Card
                title={draft.title || t('growth.addPage')}
                description={draft.id ? t('growth.versionLabel', { version: draft.version }) : undefined}
                action={
                  draft.id ? (
                    <StatusPill tone={STATUS_TONES[draft.status]}>
                      {t(`growth.pageStatus.${draft.status}`)}
                    </StatusPill>
                  ) : null
                }
              >
                <div className="grid grid-cols-1 gap-field md:grid-cols-2">
                  <Input id="title" label={t('growth.pageTitleField')} required value={draft.title} onChange={setField('title')} />
                  <Input
                    id="slug"
                    label={t('growth.pageSlug')}
                    help={t('growth.pageSlugHelp')}
                    value={draft.slug}
                    error={['slug_taken', 'reserved_slug'].includes(saveError?.code) ? saveError.message : undefined}
                    onChange={setField('slug')}
                  />
                </div>
              </Card>

              <Card title={t('growth.pageBody')}>
                {/* The only long-form field in the portal. It is the Textarea
                    primitive at a taller row count, not a new editor - adding a
                    rich text dependency to ship one screen is not the trade
                    CLAUDE.md asks for. */}
                <Textarea
                  id="body"
                  rows={14}
                  label={t('growth.pageBody')}
                  required
                  value={draft.body ?? ''}
                  onChange={setField('body')}
                />
                <p className="mt-2 text-xs text-charcoal-light">
                  {t('growth.wordCount', { count: draft.wordCount ?? 0 })}
                </p>
              </Card>

              <Card title={t('growth.pageMetaTitle')}>
                <div className="flex flex-col gap-field">
                  <Input id="metaTitle" label={t('growth.pageMetaTitle')} value={draft.metaTitle ?? ''} onChange={setField('metaTitle')} />
                  {/* A page indexed without a description gets one written for
                      it by the search engine, out of whatever it found first. */}
                  <Textarea
                    id="metaDescription"
                    rows={3}
                    label={t('growth.pageMetaDescription')}
                    required
                    help={t('growth.pageMetaDescriptionHelp')}
                    error={publishError?.code === 'meta_description_required' ? publishError.message : undefined}
                    value={draft.metaDescription ?? ''}
                    onChange={setField('metaDescription')}
                  />
                  <Select
                    id="hero"
                    label={t('growth.pageHero')}
                    placeholder={t('common.none')}
                    value={draft.heroAssetId ?? ''}
                    onChange={setField('heroAssetId')}
                    options={assetOptions}
                  />
                  <Textarea id="excerpt" rows={2} label={t('growth.pageExcerpt')} value={draft.excerpt ?? ''} onChange={setField('excerpt')} />
                </div>
              </Card>

              {draft.publishedAt ? (
                <p className="text-xs text-charcoal-light">
                  {t('common.lastUpdated')} {formatDate(draft.updatedAt)} ·{' '}
                  {formatRelativeTime(draft.publishedAt)}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {draft ? (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
          <div className="flex items-center justify-end gap-2">
            {saveError && !['slug_taken', 'reserved_slug'].includes(saveError.code) ? (
              <p className="mr-auto text-sm text-danger">{saveError.message}</p>
            ) : null}
            {publishError && publishError.code !== 'meta_description_required' ? (
              <p className="mr-auto text-sm text-danger">{publishError.message}</p>
            ) : null}
            {missingMetaDescription && draft.id ? (
              <p className="mr-auto text-xs text-warning">{t('growth.pageMetaDescriptionHelp')}</p>
            ) : null}

            {draft.status === 'published' ? (
              <Button variant="secondary" onClick={() => setConfirming('unpublish')}>
                {t('growth.unpublish')}
              </Button>
            ) : null}
            <Button variant="secondary" disabled={!dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
              {t('common.saveChanges')}
            </Button>
            <Button
              disabled={!canPublish}
              loading={publishStatus === 'loading'}
              onClick={() => setConfirming('publish')}
            >
              {t('growth.publish')}
            </Button>
          </div>
        </footer>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
        loading={publishStatus === 'loading'}
        tone={confirming === 'unpublish' ? 'danger' : 'primary'}
        title={
          confirming === 'unpublish'
            ? t('growth.unpublishTitle', { title: draft?.title ?? '' })
            : t('growth.publishTitle', { title: draft?.title ?? '' })
        }
        body={
          confirming === 'unpublish'
            ? t('growth.unpublishBody')
            : t('growth.publishBody', { path: draft?.path ?? '' })
        }
        confirmLabel={confirming === 'unpublish' ? t('growth.unpublish') : t('growth.publish')}
      >
        {confirming === 'unpublish' ? (
          <Textarea
            id="unpublish-reason"
            className="mt-4"
            rows={3}
            required
            label={t('growth.unpublishReason')}
            error={publishError?.code === 'reason_required' ? publishError.message : undefined}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function ListSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 px-4 py-3">
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
