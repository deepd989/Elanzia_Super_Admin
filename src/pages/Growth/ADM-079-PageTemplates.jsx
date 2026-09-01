// ADM-079
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Blocks, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  StatusPill,
  Tabs,
  Textarea,
} from '@/components/primitives';
import {
  fetchPageTemplates,
  previewPageTemplate,
  savePageTemplate,
  selectPageTemplates,
  setActiveTemplate,
  setTemplateDraftField,
} from '@/store/slices/growthSlice';
import { formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

export default function PageTemplates() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    templates,
    activeTemplateId,
    draft,
    dirty,
    preview,
    previewState,
    previewError,
    generated,
    suppressed,
    generatedCount,
    suppressedCount,
    withheldCount,
    saveStatus,
    saveError,
    viewState,
    error,
  } = useSelector(selectPageTemplates);

  useEffect(() => {
    dispatch(fetchPageTemplates());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setTemplateDraftField({ field, value: event.target.value }));

  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchPageTemplates())} />;
  }
  if (viewState !== 'populated' || !draft) {
    return <TemplateSkeleton />;
  }

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.templatesTitle')}
        subtitle={t('growth.templatesSubtitle')}
        meta={
          <StatusPill tone={draft.status === 'active' ? 'success' : 'neutral'}>
            {draft.status === 'active' ? t('growth.templateActive') : t('growth.templatePaused')}
          </StatusPill>
        }
        actions={
          <Button
            variant="secondary"
            loading={previewState === 'loading'}
            onClick={() =>
              dispatch(
                previewPageTemplate({
                  templateId: draft.id,
                  minProducts: Number(draft.minProducts),
                }),
              )
            }
          >
            {t('growth.previewTemplate')}
          </Button>
        }
      />

      <Tabs
        activeId={activeTemplateId}
        onChange={(id) => dispatch(setActiveTemplate(id))}
        tabs={templates.map((template) => ({
          id: template.id,
          label: template.name,
          count: template.generatedCount,
        }))}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={t('growth.templateName')} description={t('growth.patternHelp')}>
            <div className="flex flex-col gap-field">
              <Input id="name" label={t('growth.templateName')} value={draft.name} onChange={setField('name')} />
              <Input
                id="pathPattern"
                label={t('growth.pathPattern')}
                required
                className="font-mono"
                value={draft.pathPattern}
                error={saveError?.code === 'pattern_missing_placeholder' ? saveError.message : undefined}
                onChange={setField('pathPattern')}
              />
              <Input id="titlePattern" label={t('growth.titlePattern')} value={draft.titlePattern} onChange={setField('titlePattern')} />
              <Textarea
                id="metaPattern"
                rows={2}
                label={t('growth.metaPattern')}
                value={draft.metaDescriptionPattern}
                onChange={setField('metaDescriptionPattern')}
              />
              <Textarea id="introPattern" rows={2} label={t('growth.introPattern')} value={draft.introPattern} onChange={setField('introPattern')} />
              {/* Previewed before it is saved, the same shape as the media
                  standard in ADM-032. Afterwards is too late to find out. */}
              <Input
                id="minProducts"
                type="number"
                label={t('growth.minProducts')}
                help={t('growth.minProductsHelp')}
                value={draft.minProducts}
                onChange={setField('minProducts')}
              />
            </div>
          </Card>

          {previewState === 'idle' || !preview ? (
            <Card>
              <EmptyState icon={Blocks} title={t('growth.previewFirst')} body={t('growth.previewStale')} />
            </Card>
          ) : null}

          {previewState === 'failed' ? (
            <ErrorState detail={previewError?.message} onRetry={() => dispatch(previewPageTemplate({ templateId: draft.id }))} />
          ) : null}

          {preview ? (
            <>
              <Card
                title={t('growth.generatedTitle')}
                description={t('growth.generatedCount', { count: generatedCount })}
                padded={false}
              >
                <ul className="max-h-80 divide-y divide-lightGray overflow-y-auto">
                  {generated.map((page) => (
                    <li key={page.path} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs text-charcoal">{page.path}</span>
                        <span className="block truncate text-xs text-charcoal-light">{page.title}</span>
                      </span>
                      <Badge tone="outline">{page.productCount}</Badge>
                      {page.withheldCount > 0 ? (
                        <Badge tone="danger">{page.withheldCount}</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card
                title={t('growth.suppressedTitle')}
                description={t('growth.suppressedCount', { count: suppressedCount })}
                padded={false}
              >
                <ul className="max-h-64 divide-y divide-lightGray overflow-y-auto">
                  {suppressed.slice(0, 40).map((page) => (
                    <li key={page.path} className="flex items-center gap-3 px-5 py-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-charcoal-light">
                        {page.path}
                      </span>
                      <Badge tone="neutral">{page.productCount}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Card title={t('growth.previewTitle')}>
            {preview ? (
              <div className="flex flex-col gap-3">
                <Stat label={t('growth.combinations', { count: preview.combinations })} value={formatNumber(preview.combinations)} />
                <Stat label={t('growth.generatedTitle')} value={formatNumber(generatedCount)} emphasis />
                <Stat label={t('growth.suppressedTitle')} value={formatNumber(suppressedCount)} />

                {/* Suppressed and withheld are different failures and are never
                    added together. Suppressed means there were not enough
                    pieces; withheld means there were, and they are not allowed
                    out. */}
                <div className="rounded border border-danger bg-danger-surface px-3 py-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
                    <ShieldAlert size={14} className="shrink-0 text-danger" aria-hidden="true" />
                    {t('growth.withheldFromTemplate', { count: withheldCount })}
                  </p>
                  <p className="mt-1 text-xs text-charcoal-light">{t('growth.withheldVsSuppressed')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-charcoal-light">{t('growth.previewFirst')}</p>
            )}
          </Card>
        </aside>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3">
        <div className="flex items-center justify-end gap-2">
          {saveError && saveError.code !== 'pattern_missing_placeholder' ? (
            <p className="mr-auto text-sm text-danger">{saveError.message}</p>
          ) : null}
          <Button
            disabled={!dirty}
            loading={saveStatus === 'loading'}
            onClick={() => dispatch(savePageTemplate(draft))}
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-charcoal-light">{label}</span>
      <span className={`text-right ${emphasis ? 'font-heading text-2xl text-charcoal' : 'text-base text-charcoal'}`}>
        {value}
      </span>
    </div>
  );
}

function TemplateSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-12 animate-pulse rounded-md bg-lightGray-dark" />
      <div className="h-72 animate-pulse rounded-md bg-lightGray-dark" />
      <div className="h-48 animate-pulse rounded-md bg-lightGray-dark" />
    </div>
  );
}
