// ADM-080
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import {
  fetchMedia,
  fetchSeoSettings,
  fetchSitemap,
  rebuildSitemap,
  saveSeoSettings,
  selectSeoSettings,
  setSeoField,
} from '@/store/slices/growthSlice';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const ROBOTS_OPTIONS = [
  { value: 'index', label: t('growth.robotsIndex') },
  { value: 'noindex', label: t('growth.robotsNoindex') },
];

const SECTION_LABELS = {
  page: 'growth.sectionKindPage',
  product: 'growth.sectionKindProduct',
  collection: 'growth.sectionKindCollection',
  template: 'growth.sectionKindTemplate',
  microsite: 'growth.sectionKindMicrosite',
};

const SITEMAP_TOGGLES = [
  { field: 'sitemapIncludesProducts', label: 'growth.includeProducts' },
  { field: 'sitemapIncludesMicrosites', label: 'growth.includeMicrosites' },
  { field: 'sitemapIncludesCollections', label: 'growth.includeCollections' },
  { field: 'sitemapIncludesTemplatePages', label: 'growth.includeTemplatePages' },
];

export default function SeoSettings() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    settings,
    dirty,
    saveStatus,
    saveError,
    sitemap,
    sitemapState,
    rebuildStatus,
    withheld,
    withheldCount,
    sitemapStale,
    siteIsNoindex,
    assetOptions,
    viewState,
    error,
  } = useSelector(selectSeoSettings);

  const [confirmingNoindex, setConfirmingNoindex] = useState(false);

  useEffect(() => {
    dispatch(fetchSeoSettings());
    dispatch(fetchSitemap());
    dispatch(fetchMedia());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setSeoField({ field, value: event.target.value }));

  const setToggle = (field) => (event) =>
    dispatch(setSeoField({ field, value: event.target.checked }));

  const handleSave = () => {
    // Switching the whole site to noindex is one select away from turning off
    // the front door, so it asks twice.
    if (settings.robotsPolicy === 'noindex' && !confirmingNoindex) {
      setConfirmingNoindex(true);
      return;
    }
    setConfirmingNoindex(false);
    dispatch(saveSeoSettings(settings));
  };

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !settings) {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchSeoSettings())} />;
  }

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.seoTitle')}
        subtitle={t('growth.seoSubtitle')}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            {siteIsNoindex ? (
              <StatusPill tone="danger" dot>{t('growth.robotsNoindex')}</StatusPill>
            ) : null}
            {sitemapStale ? (
              <StatusPill tone="warning">{t('growth.sitemapStale')}</StatusPill>
            ) : null}
          </span>
        }
        actions={
          <Button
            variant="secondary"
            iconLeft={RefreshCw}
            loading={rebuildStatus === 'loading'}
            onClick={() => dispatch(rebuildSitemap())}
          >
            {t('growth.rebuildSitemap')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={t('growth.siteName')}>
            <div className="grid grid-cols-1 gap-field md:grid-cols-2">
              <Input id="siteName" label={t('growth.siteName')} required value={settings.siteName} onChange={setField('siteName')} />
              <Input id="titleSuffix" label={t('growth.titleSuffix')} value={settings.titleSuffix} onChange={setField('titleSuffix')} />
              <Input
                id="canonicalHost"
                className="md:col-span-2 font-mono"
                label={t('growth.canonicalHost')}
                required
                value={settings.canonicalHost}
                error={['canonical_host_required', 'validation_failed'].includes(saveError?.code) ? saveError.message : undefined}
                onChange={setField('canonicalHost')}
              />
              <Textarea
                id="defaultMeta"
                className="md:col-span-2"
                rows={3}
                label={t('growth.defaultMeta')}
                value={settings.defaultMetaDescription}
                onChange={setField('defaultMetaDescription')}
              />
            </div>
          </Card>

          <Card title={t('growth.robotsPolicy')}>
            <div className="grid grid-cols-1 gap-field md:grid-cols-2">
              <Select id="robotsPolicy" label={t('growth.robotsPolicy')} value={settings.robotsPolicy} onChange={setField('robotsPolicy')} options={ROBOTS_OPTIONS} />
              <Input id="crawlDelay" type="number" label={t('growth.crawlDelay')} value={settings.crawlDelaySeconds} onChange={setField('crawlDelaySeconds')} />
              <Select
                id="ogImage"
                label={t('growth.openGraphImage')}
                placeholder={t('common.none')}
                value={settings.openGraphImageAssetId ?? ''}
                onChange={setField('openGraphImageAssetId')}
                options={assetOptions}
              />
              <Input id="twitter" label={t('growth.twitterHandle')} value={settings.twitterHandle ?? ''} onChange={setField('twitterHandle')} />
              <Checkbox
                id="organisationSchema"
                className="md:col-span-2"
                label={t('growth.organisationSchema')}
                checked={settings.organisationSchema}
                onChange={setToggle('organisationSchema')}
              />
            </div>
          </Card>

          <Card title={t('growth.sitemapIncludes')}>
            <div className="grid grid-cols-1 gap-field md:grid-cols-2">
              {SITEMAP_TOGGLES.map((toggle) => (
                <Checkbox
                  key={toggle.field}
                  id={toggle.field}
                  label={t(toggle.label)}
                  checked={Boolean(settings[toggle.field])}
                  onChange={setToggle(toggle.field)}
                />
              ))}
            </div>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <SitemapPanel
            sitemap={sitemap}
            state={sitemapState}
            withheld={withheld}
            withheldCount={withheldCount}
            onRetry={() => dispatch(fetchSitemap())}
          />
        </aside>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3">
        <div className="flex items-center justify-end gap-2">
          {saveError && !['canonical_host_required', 'validation_failed'].includes(saveError.code) ? (
            <p className="mr-auto text-sm text-danger">{saveError.message}</p>
          ) : null}
          <Button disabled={!dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmingNoindex}
        onClose={() => setConfirmingNoindex(false)}
        onConfirm={handleSave}
        loading={saveStatus === 'loading'}
        title={t('growth.noindexWarningTitle')}
        body={t('growth.noindexWarningBody')}
        confirmLabel={t('common.saveChanges')}
      />
    </div>
  );
}

function SitemapPanel({ sitemap, state, withheld, withheldCount, onRetry }) {
  if (state === 'failed') {
    return (
      <Card title={t('growth.sitemapTitle')}>
        <ErrorState onRetry={onRetry} />
      </Card>
    );
  }
  if (!sitemap) {
    return <div className="h-72 animate-pulse rounded-md bg-lightGray-dark" />;
  }

  return (
    <Card
      title={t('growth.sitemapTitle')}
      description={
        sitemap.generatedAt
          ? t('growth.sitemapGenerated', { time: formatRelativeTime(sitemap.generatedAt) })
          : t('growth.sitemapNeverBuilt')
      }
    >
      <p className="font-heading text-3xl text-charcoal">
        {t('growth.sitemapUrls', { count: formatNumber(sitemap.totalUrls) })}
      </p>

      <ul className="mt-4 flex flex-col gap-1.5 border-t border-lightGray-dark pt-4">
        {sitemap.sections.map((section) => (
          <li key={section.kind} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-charcoal-light">{t(SECTION_LABELS[section.kind] ?? 'common.details')}</span>
            <Badge tone={section.excluded === 0 ? 'accent' : 'neutral'}>
              {t('growth.includedOf', {
                included: section.included,
                total: section.included + section.excluded,
              })}
            </Badge>
          </li>
        ))}
      </ul>

      {/* A sitemap that silently drops seventeen products is indistinguishable
          from a generator that is broken. So it says what it withheld, by id
          and by reason. */}
      <div className="mt-4 rounded border border-danger bg-danger-surface px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
          <ShieldAlert size={14} className="shrink-0 text-danger" aria-hidden="true" />
          {t('growth.withheldCount', { count: withheldCount })}
        </p>
        <ul className="mt-2 flex max-h-52 flex-col gap-1 overflow-y-auto">
          {withheld.map((row) => (
            <li key={`${row.productId}-${row.code}`} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-charcoal">{row.productId}</span>
              <StatusPill size="sm" tone="danger">
                {t(`growth.blockCode.${row.code}`)}
              </StatusPill>
            </li>
          ))}
        </ul>
      </div>

      {sitemap.generatedAt ? (
        <p className="mt-3 text-xs text-charcoal-lighter">{formatDateTime(sitemap.generatedAt)}</p>
      ) : null}
    </Card>
  );
}
