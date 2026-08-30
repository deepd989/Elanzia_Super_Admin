// ADM-033
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
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
  clearHsnDraft,
  fetchCategories,
  fetchHsnCodes,
  saveHsnCode,
  selectHsnRegistry,
  setHsnDraftField,
  setHsnFilters,
  setHsnPage,
  setHsnSearch,
  startHsnDraft,
} from '@/store/slices/catalogueSlice';
import { formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const KIND_OPTIONS = [
  { value: 'goods', label: t('catalogue.kindGoods') },
  { value: 'service', label: t('catalogue.kindService') },
];

const COLUMN_COUNT = 6;

export default function HsnCodes() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { codes, total, query, draft, dirty, saveStatus, saveError, viewState, error } =
    useSelector(selectHsnRegistry);

  useEffect(() => {
    dispatch(fetchHsnCodes());
  }, [dispatch, query]);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setHsnDraftField({ field, value: event.target.value }));

  const handleSave = async () => {
    const result = await dispatch(saveHsnCode(draft));
    if (!result.error) {
      dispatch(clearHsnDraft());
      dispatch(fetchHsnCodes());
    }
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.hsnTitle')}
        subtitle={t('catalogue.hsnSubtitle')}
        actions={
          <Button iconLeft={Plus} onClick={() => dispatch(startHsnDraft())}>
            {t('catalogue.addHsn')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('catalogue.hsnSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setHsnSearch(event.target.value))}
        />
        <Select
          id="kind"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.kind}
          onChange={(event) =>
            dispatch(setHsnFilters({ ...query.filters, kind: event.target.value }))
          }
          options={KIND_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            dispatch(setHsnSearch(''));
            dispatch(setHsnFilters({ kind: '', gstRate: '' }));
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
            onPageChange={(page) => dispatch(setHsnPage(page))}
            onPageSizeChange={() => {}}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('catalogue.columnCode')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('catalogue.columnDescription')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('catalogue.columnKind')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnGst')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnUsedBy')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            codes.map((code) => (
              <HsnRow key={code.code} code={code} onEdit={() => dispatch(startHsnDraft(code))} />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <HsnSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchHsnCodes())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(setHsnSearch(''))}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  title={t('states.emptyTitle')}
                  body={t('states.emptyBody')}
                  actionLabel={t('catalogue.addHsn')}
                  onAction={() => dispatch(startHsnDraft())}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={Boolean(draft)}
        onClose={() => dispatch(clearHsnDraft())}
        title={t('catalogue.addHsn')}
        description={t('catalogue.hsnSubtitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => dispatch(clearHsnDraft())}>
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
              id="hsn-code"
              label={t('catalogue.columnCode')}
              required
              value={draft.code}
              onChange={setField('code')}
            />
            <Textarea
              id="hsn-description"
              rows={2}
              label={t('catalogue.columnDescription')}
              required
              value={draft.description}
              onChange={setField('description')}
            />
            <Select
              id="hsn-kind"
              label={t('catalogue.columnKind')}
              value={draft.kind}
              onChange={setField('kind')}
              options={KIND_OPTIONS}
            />
            <Input
              id="hsn-rate"
              type="number"
              label={t('catalogue.columnGst')}
              required
              value={draft.gstRate}
              onChange={(event) =>
                dispatch(setHsnDraftField({ field: 'gstRate', value: Number(event.target.value) }))
              }
            />
            {/* The rate on a code is the GST on every listing under it, so the
                blast radius is stated before the save, not after. */}
            {draft.productCount > 0 ? (
              <p className="rounded border border-warning bg-warning-surface px-3 py-2 text-xs text-charcoal">
                {t('catalogue.hsnRateWarning', { count: draft.productCount })}
              </p>
            ) : null}
            {saveError ? <p className="text-sm text-danger">{saveError.message}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function HsnRow({ code, onEdit }) {
  return (
    <TableShell.Row onClick={onEdit}>
      <TableShell.Cell className="font-mono text-xs">{code.code}</TableShell.Cell>

      <TableShell.Cell>
        <span className="text-charcoal">{code.description}</span>
        {code.categoryNames?.length > 0 ? (
          <span className="block text-xs text-charcoal-light">
            {t('catalogue.columnCategories')}: {code.categoryNames.join(', ')}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell>
        <Badge tone="outline">
          {code.kind === 'service' ? t('catalogue.kindService') : t('catalogue.kindGoods')}
        </Badge>
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        <StatusPill tone={code.gstRate === 3 ? 'neutral' : 'info'}>
          {formatPercent(code.gstRate, { decimals: 0 })}
        </StatusPill>
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {code.productCount === 0 ? (
          <span className="text-xs text-charcoal-lighter">{t('catalogue.hsnUnused')}</span>
        ) : (
          formatNumber(code.productCount)
        )}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          {t('common.edit')}
        </Button>
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function HsnSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-72 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
