// ADM-076
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Images, Search } from 'lucide-react';
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
} from '@/components/primitives';
import { MediaViewer, TableShell } from '@/components';
import {
  deleteMediaAsset,
  fetchMedia,
  saveMediaAsset,
  selectMediaAsset,
  selectMediaLibrary,
  setMediaFilters,
  setMediaPage,
  setMediaSearch,
} from '@/store/slices/growthSlice';
import { formatDate, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const TYPE_OPTIONS = ['image', 'video', 'document'].map((value) => ({
  value,
  label: t(`growth.assetType.${value}`),
}));

const USAGE_OPTIONS = [
  { value: 'used', label: t('growth.usageUsed') },
  { value: 'unused', label: t('growth.usageUnused') },
  { value: 'missing_alt', label: t('growth.usageMissingAlt') },
];

const COLUMN_COUNT = 4;

export default function MediaLibrary() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    assets,
    total,
    query,
    selected,
    viewerItems,
    canDelete,
    missingAltCount,
    saveStatus,
    saveError,
    actionStatus,
    actionError,
    viewState,
    error,
  } = useSelector(selectMediaLibrary);

  const [form, setForm] = useState({ altText: '', credit: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchMedia());
  }, [dispatch, query]);

  useEffect(() => {
    setForm({ altText: selected?.altText ?? '', credit: selected?.credit ?? '' });
  }, [selected?.id]);

  // Handlers.
  const handleSave = () => dispatch(saveMediaAsset({ assetId: selected.id, patch: form }));

  const handleDelete = async () => {
    const result = await dispatch(deleteMediaAsset({ assetId: selected.id }));
    if (!result.error) setDeleting(false);
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.mediaTitle')}
        subtitle={t('growth.mediaSubtitle')}
        meta={
          missingAltCount > 0 ? (
            <StatusPill tone="warning">
              {t('growth.missingAltCount', { count: missingAltCount })}
            </StatusPill>
          ) : null
        }
      />

      {/* There is no upload here and it is not an omission. The fixtures carry
          no binaries, so the library describes and audits what exists. */}
      <p className="text-sm text-charcoal-light">{t('growth.mediaNoUpload')}</p>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('growth.mediaSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setMediaSearch(event.target.value))}
        />
        <Select
          id="type"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.type}
          onChange={(event) => dispatch(setMediaFilters({ ...query.filters, type: event.target.value }))}
          options={TYPE_OPTIONS}
        />
        <Select
          id="usage"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.usage}
          onChange={(event) => dispatch(setMediaFilters({ ...query.filters, usage: event.target.value }))}
          options={USAGE_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            dispatch(setMediaSearch(''));
            dispatch(setMediaFilters({ type: '', usage: '' }));
          }}
        >
          {t('common.clearFilters')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <TableShell
            footer={
              <TableShell.Pagination
                page={query.page}
                pageSize={query.pageSize}
                total={total}
                onPageChange={(page) => dispatch(setMediaPage(page))}
                onPageSizeChange={() => {}}
              />
            }
          >
            <TableShell.Head>
              <TableShell.HeadCell>{t('growth.columnAsset')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('growth.columnType')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('growth.columnSize')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('growth.columnUsage')}</TableShell.HeadCell>
            </TableShell.Head>

            <TableShell.Body>
              {viewState === 'populated' ? (
                assets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    selected={selected?.id === asset.id}
                    onSelect={() => dispatch(selectMediaAsset(asset.id))}
                  />
                ))
              ) : (
                <TableShell.StateRow colSpan={COLUMN_COUNT}>
                  {viewState === 'loading' ? <AssetSkeleton /> : null}
                  {viewState === 'error' ? (
                    <ErrorState detail={error?.message} onRetry={() => dispatch(fetchMedia())} />
                  ) : null}
                  {viewState === 'empty-filtered' ? (
                    <EmptyState
                      title={t('states.emptyFilteredTitle')}
                      body={t('states.emptyFilteredBody')}
                      actionLabel={t('common.clearFilters')}
                      onAction={() => dispatch(setMediaSearch(''))}
                    />
                  ) : null}
                  {viewState === 'empty' ? (
                    <EmptyState icon={Images} title={t('states.emptyTitle')} body={t('states.emptyBody')} />
                  ) : null}
                </TableShell.StateRow>
              )}
            </TableShell.Body>
          </TableShell>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {selected ? (
            <AssetPanel
              asset={selected}
              viewerItems={viewerItems}
              form={form}
              onForm={setForm}
              canDelete={canDelete}
              saving={saveStatus === 'loading'}
              saveError={saveError}
              actionError={actionError}
              onSave={handleSave}
              onDelete={() => setDeleting(true)}
            />
          ) : (
            <Card>
              <EmptyState
                icon={Images}
                title={t('growth.selectAnAsset')}
                body={t('growth.selectAnAssetBody')}
              />
            </Card>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={handleDelete}
        loading={actionStatus === 'loading'}
        title={t('growth.deleteAssetTitle', { label: selected?.label ?? '' })}
        body={t('growth.deleteAssetBody')}
        confirmLabel={t('growth.deleteAsset')}
      />
    </div>
  );
}

function AssetRow({ asset, selected, onSelect }) {
  return (
    <TableShell.Row selected={selected} onClick={onSelect}>
      <TableShell.Cell>
        <span className="flex items-center gap-2 font-medium text-charcoal">
          {asset.label}
          {asset.type === 'image' && !asset.altText ? (
            <Badge tone="danger">{t('growth.usageMissingAlt')}</Badge>
          ) : null}
        </span>
        <span className="block font-mono text-xs text-charcoal-light">{asset.id}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        <Badge tone="outline">{t(`growth.assetType.${asset.type}`)}</Badge>
        {asset.widthPx ? (
          <span className="block text-xs text-charcoal-light">
            {asset.widthPx} x {asset.heightPx}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatNumber(asset.sizeKb)}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {asset.usageCount === 0 ? (
          <span className="text-xs text-charcoal-lighter">{t('growth.notUsed')}</span>
        ) : (
          formatNumber(asset.usageCount)
        )}
      </TableShell.Cell>
    </TableShell.Row>
  );
}

function AssetPanel({ asset, viewerItems, form, onForm, canDelete, saving, saveError, actionError, onSave, onDelete }) {
  return (
    <Card title={asset.label} description={formatDate(asset.uploadedAt)}>
      <div className="flex flex-col gap-field">
        {/* The fixtures carry no binaries, so MediaViewer renders the label on
            its document surface. Honest for a prototype and the same
            placeholder ADM-024 and ADM-029 already use. */}
        <MediaViewer items={viewerItems} />

        <Input
          id="altText"
          label={t('growth.altText')}
          help={t('growth.altTextHelp')}
          value={form.altText}
          onChange={(event) => onForm({ ...form, altText: event.target.value })}
        />
        <Input
          id="credit"
          label={t('growth.credit')}
          value={form.credit}
          onChange={(event) => onForm({ ...form, credit: event.target.value })}
        />

        {saveError ? <p className="text-sm text-danger">{saveError.message}</p> : null}
        {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

        <div>
          <h4 className="text-sm font-medium text-charcoal">
            {asset.usageCount === 0
              ? t('growth.notUsed')
              : t('growth.usedByCount', { count: asset.usageCount })}
          </h4>
          <ul className="mt-1 flex flex-col gap-1">
            {asset.usedBy.map((use) => (
              <li key={`${use.kind}-${use.id}`} className="flex items-center gap-2 text-xs">
                <Badge tone="outline">{use.kind}</Badge>
                <span className="truncate text-charcoal-light">{use.title}</span>
                {use.live ? <StatusPill size="sm" tone="success">{t('growth.bannerStatus.live')}</StatusPill> : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 border-t border-lightGray-dark pt-3">
          {/* An asset on a live surface cannot be deleted, so the button says
              so rather than letting the operator press it and read a 409. */}
          <Button size="sm" variant="ghost" disabled={!canDelete} onClick={onDelete}>
            {t('growth.deleteAsset')}
          </Button>
          <Button size="sm" loading={saving} onClick={onSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AssetSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
