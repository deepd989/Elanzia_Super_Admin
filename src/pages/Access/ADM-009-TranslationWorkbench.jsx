// ADM-009
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearTranslationFilters,
  fetchLocales,
  fetchTranslations,
  publishLocale,
  saveTranslation,
  selectTranslationWorkbench,
  setEditingTranslation,
  setTranslationFilters,
  setTranslationPage,
  setTranslationPageSize,
  setTranslationSearch,
  setTranslationSort,
} from '@/store/slices/accessSlice';
import { formatDate, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = {
  translated: 'success',
  missing: 'danger',
  draft: 'warning',
  stale: 'warning',
};

const STATE_OPTIONS = [
  { value: 'translated', label: t('access.translationState.translated') },
  { value: 'missing', label: t('access.translationState.missing') },
  { value: 'draft', label: t('access.translationState.draft') },
  { value: 'stale', label: t('access.translationState.stale') },
];

const COLUMN_COUNT = 6;

export default function TranslationWorkbench() {
  const dispatch = useDispatch();

  // Data.
  const {
    entries,
    total,
    query,
    locales,
    activeLocale,
    editingKey,
    moduleOptions,
    viewState,
    saveStatus,
    error,
  } = useSelector(selectTranslationWorkbench);

  const [draftValue, setDraftValue] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    dispatch(fetchLocales());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchTranslations());
  }, [dispatch, query]);

  // Handlers.
  const handleSort = (sortBy) =>
    dispatch(
      setTranslationSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'asc' ? 'desc' : 'asc',
      }),
    );

  const startEditing = (entry) => {
    dispatch(setEditingTranslation(entry.key));
    setDraftValue(entry.value ?? '');
  };

  const handleSave = async (entry) => {
    await dispatch(
      saveTranslation({ key: entry.key, locale: query.filters.locale, value: draftValue }),
    );
    dispatch(fetchLocales());
  };

  // English is the source and lives in the codebase. Editing it here would put
  // the two out of step with nothing to reconcile them.
  const isSourceLocale = activeLocale?.isDefault;

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={t('access.translationsTitle')}
        subtitle={t('access.translationsSubtitle')}
        meta={
          activeLocale ? (
            <StatusPill tone={activeLocale.completeness === 100 ? 'success' : 'warning'}>
              {t('access.completeness', { percent: formatPercent(activeLocale.completeness) })}
            </StatusPill>
          ) : null
        }
        actions={
          activeLocale && !isSourceLocale ? (
            <Button
              variant="secondary"
              disabled={activeLocale.missingCount > 0}
              onClick={() => setPublishing(true)}
            >
              {t('access.publish')}
            </Button>
          ) : null
        }
      />

      <Tabs
        activeId={query.filters.locale}
        onChange={(locale) => dispatch(setTranslationFilters({ ...query.filters, locale }))}
        tabs={locales.map((locale) => ({
          id: locale.code,
          label: `${locale.nativeLabel}${locale.isDefault ? '' : ` · ${formatPercent(locale.completeness)}`}`,
          count: locale.isDefault ? undefined : locale.missingCount,
        }))}
      />

      {activeLocale ? <LocaleSummary locale={activeLocale} isSource={isSourceLocale} /> : null}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-80"
          iconLeft={Search}
          placeholder={t('access.translationsSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setTranslationSearch(event.target.value))}
        />
        <Select
          id="module"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.module}
          onChange={(event) =>
            dispatch(setTranslationFilters({ ...query.filters, module: event.target.value }))
          }
          options={moduleOptions}
        />
        <Select
          id="state"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) =>
            dispatch(setTranslationFilters({ ...query.filters, state: event.target.value }))
          }
          options={STATE_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => dispatch(clearTranslationFilters())}
        >
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        maxHeight="40rem"
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setTranslationPage(page))}
            onPageSizeChange={(size) => dispatch(setTranslationPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SortableHeadCell
            width="22rem"
            direction={query.sortBy === 'key' ? query.sortDir : null}
            onSort={() => handleSort('key')}
          >
            {t('access.columnKey')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('access.columnSource')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('access.columnTranslation')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('access.columnUpdated')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            entries.map((entry) => (
              <TranslationRow
                key={entry.key}
                entry={entry}
                readOnly={isSourceLocale}
                editing={editingKey === entry.key}
                draftValue={draftValue}
                saving={saveStatus === 'loading'}
                onDraftChange={setDraftValue}
                onStartEdit={() => startEditing(entry)}
                onCancel={() => dispatch(setEditingTranslation(null))}
                onSave={() => handleSave(entry)}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <TranslationSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchTranslations())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('access.translationsEmptyTitle')}
                  body={t('access.translationsEmptyBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearTranslationFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        onConfirm={() =>
          dispatch(publishLocale(activeLocale.code)).then(() => setPublishing(false))
        }
        tone="primary"
        title={t('access.publishTitle', { language: activeLocale?.label ?? '' })}
        body={t('access.publishBody')}
        confirmLabel={t('access.publish')}
      />
    </div>
  );
}

function LocaleSummary({ locale, isSource }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-lightGray-dark bg-white px-4 py-3">
      <p className="text-base text-charcoal">
        <span className="font-medium">{locale.label}</span>
        <span className="ml-2 text-charcoal-light">{locale.nativeLabel}</span>
      </p>

      {isSource ? (
        <p className="text-sm text-charcoal-light">{t('access.sourceLocaleHelp')}</p>
      ) : (
        <>
          <p className="text-sm text-charcoal-light num">
            {t('access.missingCount', { count: locale.missingCount })}
          </p>
          <p className="text-sm text-charcoal-light">
            {locale.publishedAt
              ? t('access.published', { when: formatDate(locale.publishedAt) })
              : t('access.notPublished')}
          </p>
          {locale.missingCount > 0 ? (
            <p className="ml-auto text-sm text-warning">
              {t('access.publishBlocked', { count: locale.missingCount })}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function TranslationRow({
  entry,
  readOnly,
  editing,
  draftValue,
  saving,
  onDraftChange,
  onStartEdit,
  onCancel,
  onSave,
}) {
  return (
    <TableShell.Row>
      <TableShell.Cell className="font-mono text-xs">{entry.key}</TableShell.Cell>
      <TableShell.Cell className="text-charcoal-light">{entry.sourceText}</TableShell.Cell>

      <TableShell.Cell>
        {editing ? (
          <Input
            id={`value-${entry.key}`}
            autoFocus
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
          />
        ) : (
          entry.value ?? <span className="text-charcoal-lighter">{t('common.notAvailable')}</span>
        )}
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={STATE_TONES[entry.state]} size="sm">
          {t(`access.translationState.${entry.state}`)}
        </StatusPill>
        {entry.state === 'stale' ? (
          <span className="block text-xs text-charcoal-light">{t('access.staleHelp')}</span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell>
        {entry.updatedAt ? formatDate(entry.updatedAt) : <span className="text-charcoal-lighter">-</span>}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        {readOnly ? null : editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
            <Button size="sm" loading={saving} onClick={onSave}>{t('access.saveTranslation')}</Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={onStartEdit}>
            {entry.value ? t('access.editTranslation') : t('access.addTranslation')}
          </Button>
        )}
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function TranslationSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
