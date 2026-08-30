// ADM-027
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ErrorState,
  Input,
  PageHeader,
  StatusPill,
  Tabs,
  Textarea,
} from '@/components/primitives';
import {
  fetchAttributeSets,
  saveAttributeSet,
  selectAttributeSets,
  setActiveAttributeSet,
  setAttributeDraftField,
  toggleAttributeInSet,
} from '@/store/slices/catalogueSlice';
import { formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

// Dropping any of these leaves a listing that cannot be priced or taxed, so
// the server refuses it. The checkbox is disabled for the same reason rather
// than letting somebody untick it and read a 422.
const REQUIRED_ATTRIBUTE_IDS = ['ATR-purity', 'ATR-gross', 'ATR-hsn'];

const GROUP_LABELS = {
  metal: 'catalogue.groupMetal',
  weight: 'catalogue.groupWeight',
  stone: 'catalogue.groupStone',
  making: 'catalogue.groupMaking',
  compliance: 'catalogue.groupComplianceAttrs',
};

export default function AttributeSets() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { sets, groups, activeSetId, draft, selectedIds, dirty, saveStatus, saveError, viewState, error } =
    useSelector(selectAttributeSets);

  useEffect(() => {
    dispatch(fetchAttributeSets());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setAttributeDraftField({ field, value: event.target.value }));

  const handleSave = () => dispatch(saveAttributeSet(draft));

  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAttributeSets())} />;
  }
  if (viewState !== 'populated' || !draft) {
    return <SetSkeleton />;
  }

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.attributesTitle')}
        subtitle={t('catalogue.attributesSubtitle')}
        meta={
          <StatusPill tone="info">
            {t('catalogue.attributeCount', { count: selectedIds.length })}
          </StatusPill>
        }
      />

      <Tabs
        activeId={activeSetId}
        onChange={(setId) => dispatch(setActiveAttributeSet(setId))}
        tabs={sets.map((set) => ({
          id: set.id,
          label: set.name,
          count: set.productCount,
        }))}
      />

      <Card title={t('catalogue.groupIdentity')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="set-name"
            label={t('catalogue.setName')}
            required
            value={draft.name}
            onChange={setField('name')}
          />
          <Input
            id="set-applies"
            label={t('catalogue.appliesToCategories')}
            disabled
            value={draft.categoryIds.length}
          />
          <Textarea
            id="set-description"
            className="md:col-span-2"
            rows={2}
            label={t('catalogue.setDescription')}
            value={draft.description ?? ''}
            onChange={setField('description')}
          />
        </div>
      </Card>

      {groups.map((group) => (
        <Card key={group.group} title={t(GROUP_LABELS[group.group])} padded={false}>
          <ul className="divide-y divide-lightGray">
            {group.attributes.map((attribute) => (
              <AttributeRow
                key={attribute.id}
                attribute={attribute}
                checked={selectedIds.includes(attribute.id)}
                locked={REQUIRED_ATTRIBUTE_IDS.includes(attribute.id)}
                onToggle={() => dispatch(toggleAttributeInSet(attribute.id))}
              />
            ))}
          </ul>
        </Card>
      ))}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-2">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          <span className="mr-auto text-xs text-charcoal-light">
            {t('catalogue.attributeCount', { count: selectedIds.length })} ·{' '}
            {formatNumber(draft.productCount)} {t('catalogue.columnListings').toLowerCase()}
          </span>
          <Button disabled={!dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function AttributeRow({ attribute, checked, locked, onToggle }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <Checkbox
        id={`attr-${attribute.id}`}
        checked={checked}
        disabled={locked}
        onChange={onToggle}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-base text-charcoal">
          {attribute.label}
          {attribute.unit ? (
            <span className="font-mono text-xs text-charcoal-lighter">{attribute.unit}</span>
          ) : null}
          {/* Net weight is gross minus stone. It is calculated, so a
              manufacturer is never asked to type it. */}
          {attribute.derived ? <Badge tone="accent">{t('catalogue.derivedBadge')}</Badge> : null}
          {locked ? <Badge tone="outline">{t('catalogue.requiredBadge')}</Badge> : null}
        </p>
        {attribute.helpText ? (
          <p className="text-xs text-charcoal-light">{attribute.helpText}</p>
        ) : null}
        {locked ? (
          <p className="text-xs text-charcoal-lighter">{t('catalogue.cannotRemove')}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs uppercase tracking-wide text-charcoal-lighter">
        {attribute.type}
      </span>
    </li>
  );
}

function SetSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-16 animate-pulse rounded-md bg-lightGray-dark" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-48 animate-pulse rounded-md bg-lightGray-dark" />
      ))}
    </div>
  );
}
