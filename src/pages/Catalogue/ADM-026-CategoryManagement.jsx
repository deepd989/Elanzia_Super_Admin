// ADM-026
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronRight, Plus } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import {
  archiveCategory,
  clearCategoryDraft,
  fetchAttributeSets,
  fetchCategories,
  fetchHsnCodes,
  saveCategory,
  selectCategoryManager,
  setCategoryDraftField,
  startCategoryDraft,
} from '@/store/slices/catalogueSlice';
import { formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_OPTIONS = [
  { value: 'active', label: t('catalogue.categoryActive') },
  { value: 'hidden', label: t('catalogue.categoryHidden') },
];

export default function CategoryManagement() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    tree,
    categories,
    draft,
    dirty,
    saveStatus,
    saveError,
    actionStatus,
    actionError,
    attributeSetOptions,
    hsnOptions,
    viewState,
    error,
  } = useSelector(selectCategoryManager);

  const [archiving, setArchiving] = useState(null);
  const [reassignTo, setReassignTo] = useState('');

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchAttributeSets());
    dispatch(fetchHsnCodes());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setCategoryDraftField({ field, value: event.target.value }));

  const handleSave = async () => {
    const result = await dispatch(saveCategory(draft));
    if (!result.error) {
      dispatch(clearCategoryDraft());
      dispatch(fetchCategories());
    }
  };

  const handleArchive = async () => {
    const result = await dispatch(
      archiveCategory({ categoryId: archiving.id, reassignToId: reassignTo || undefined }),
    );
    if (!result.error) {
      setArchiving(null);
      setReassignTo('');
      dispatch(fetchCategories());
    }
  };

  const parentOptions = [
    { value: '', label: t('catalogue.categoryTopLevel') },
    ...categories.filter((row) => !row.parentId).map((row) => ({ value: row.id, label: row.name })),
  ];

  const moveTargets = categories
    .filter((row) => row.parentId && row.id !== archiving?.id)
    .map((row) => ({ value: row.id, label: row.name }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.categoriesTitle')}
        subtitle={t('catalogue.categoriesSubtitle')}
        actions={
          <Button iconLeft={Plus} onClick={() => dispatch(startCategoryDraft())}>
            {t('catalogue.addCategory')}
          </Button>
        }
      />

      {viewState === 'loading' ? <TreeSkeleton /> : null}
      {viewState === 'error' ? (
        <ErrorState detail={error?.message} onRetry={() => dispatch(fetchCategories())} />
      ) : null}
      {viewState === 'empty' ? (
        <Card>
          <EmptyState
            title={t('states.emptyTitle')}
            body={t('states.emptyBody')}
            actionLabel={t('catalogue.addCategory')}
            onAction={() => dispatch(startCategoryDraft())}
          />
        </Card>
      ) : null}

      {viewState === 'populated'
        ? tree.map((parent) => (
            <Card
              key={parent.id}
              title={parent.name}
              description={t('catalogue.attributeCount', { count: parent.children.length })}
              action={
                <span className="flex items-center gap-2">
                  <Badge tone="outline">{formatNumber(parent.subtreeProductCount)}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => dispatch(startCategoryDraft(parent))}>
                    {t('common.edit')}
                  </Button>
                </span>
              }
              padded={false}
            >
              <ul className="divide-y divide-lightGray">
                {parent.children.map((child) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    onEdit={() => dispatch(startCategoryDraft(child))}
                    onArchive={() => setArchiving(child)}
                  />
                ))}
              </ul>
            </Card>
          ))
        : null}

      <Modal
        open={Boolean(draft)}
        onClose={() => dispatch(clearCategoryDraft())}
        title={draft?.id ? t('catalogue.editCategory') : t('catalogue.addCategory')}
        footer={
          <>
            <Button variant="secondary" onClick={() => dispatch(clearCategoryDraft())}>
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
              id="category-name"
              label={t('catalogue.categoryName')}
              required
              value={draft.name}
              error={saveError?.code === 'name_taken' ? saveError.message : undefined}
              onChange={setField('name')}
            />
            <Select
              id="category-parent"
              label={t('catalogue.categoryParent')}
              value={draft.parentId ?? ''}
              error={saveError?.code === 'nesting_too_deep' ? saveError.message : undefined}
              onChange={setField('parentId')}
              options={parentOptions}
            />
            <Select
              id="category-hsn"
              label={t('catalogue.categoryDefaultHsn')}
              help={t('catalogue.categoryDefaultHsnHelp')}
              value={draft.defaultHsn ?? ''}
              onChange={setField('defaultHsn')}
              options={hsnOptions}
            />
            <Select
              id="category-set"
              label={t('catalogue.categoryAttributeSet')}
              value={draft.attributeSetId ?? ''}
              onChange={setField('attributeSetId')}
              options={attributeSetOptions}
            />
            <Select
              id="category-status"
              label={t('catalogue.categoryStatus')}
              value={draft.status}
              onChange={setField('status')}
              options={STATUS_OPTIONS}
            />
            {saveError && !['name_taken', 'nesting_too_deep'].includes(saveError.code) ? (
              <p className="text-sm text-danger">{saveError.message}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={handleArchive}
        loading={actionStatus === 'loading'}
        title={t('catalogue.archiveCategoryTitle', { name: archiving?.name ?? '' })}
        body={t('catalogue.archiveCategoryBody')}
        confirmLabel={t('catalogue.archiveCategory')}
      >
        {archiving?.productCount > 0 ? (
          <Select
            id="reassign"
            className="mt-4"
            required
            label={t('catalogue.reassignTo')}
            placeholder={t('common.none')}
            value={reassignTo}
            error={actionError?.code === 'category_has_products' ? actionError.message : undefined}
            onChange={(event) => setReassignTo(event.target.value)}
            options={moveTargets}
          />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

function CategoryRow({ category, onEdit, onArchive }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <ChevronRight size={14} className="shrink-0 text-charcoal-lighter" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-base text-charcoal">
          {category.name}
          {category.status === 'hidden' ? (
            <StatusPill size="sm" tone="neutral">
              {t('catalogue.categoryHidden')}
            </StatusPill>
          ) : null}
        </p>
        <p className="font-mono text-xs text-charcoal-light">
          {category.defaultHsn ?? t('common.none')}
        </p>
      </div>

      <span className="shrink-0 text-right">
        <span className="block text-sm tabular-nums text-charcoal">
          {category.productCount === 0
            ? t('catalogue.emptyCategoryHint')
            : formatNumber(category.productCount)}
        </span>
        <span className="block text-xs text-charcoal-light">
          {t('catalogue.columnLive')} {formatNumber(category.liveCount)}
        </span>
      </span>

      <Button size="sm" variant="ghost" onClick={onEdit}>
        {t('common.edit')}
      </Button>
      {category.status === 'active' ? (
        <Button size="sm" variant="ghost" onClick={onArchive}>
          {t('catalogue.archiveCategory')}
        </Button>
      ) : null}
    </li>
  );
}

function TreeSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-md bg-lightGray-dark" />
      ))}
    </div>
  );
}
