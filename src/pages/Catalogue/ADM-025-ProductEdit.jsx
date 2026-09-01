// ADM-025
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Card,
  Checkbox,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { PriceBreakup } from '@/components';
import {
  clearProductDraft,
  fetchProductDraft,
  saveProduct,
  selectProductEditor,
  setProductDraftField,
} from '@/store/slices/catalogueSlice';
import { formatGrams, formatINR } from '@/utils/format';
import { t } from '@/i18n/en';

const PURITY_OPTIONS = [24, 22, 18, 14].map((value) => ({ value, label: `${value}K` }));

const VISIBILITY_OPTIONS = [
  { value: 'public', label: t('catalogue.visibility.public') },
  { value: 'private', label: t('catalogue.visibility.private') },
];

export default function ProductEdit() {
  const { productId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    draft,
    dirty,
    derivedNetWeight,
    weightsValid,
    lockedByOrder,
    saveStatus,
    saveError,
    error,
    viewState,
  } = useSelector(selectProductEditor);

  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchProductDraft(productId));
    return () => dispatch(clearProductDraft());
  }, [dispatch, productId]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setProductDraftField({ field, value: event.target.value }));

  const setNumber = (field) => (event) =>
    dispatch(setProductDraftField({ field, value: Number(event.target.value) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(
      saveProduct({
        productId,
        reason,
        patch: {
          title: draft.title,
          category: draft.category,
          speciality: draft.speciality,
          purity: Number(draft.purity),
          grossWeight: Number(draft.grossWeight),
          stoneWeight: Number(draft.stoneWeight),
          hallmarked: draft.hallmarked,
          huid: draft.huid,
          hsn: draft.hsn,
          visibility: draft.visibility,
          stockQuantity: Number(draft.stockQuantity),
          minOrderQuantity: Number(draft.minOrderQuantity),
          leadTimeDays: Number(draft.leadTimeDays),
        },
      }),
    );
    if (!result.error) navigate(`/catalogue/products/${productId}`);
  };

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !draft) {
    return (
      <ErrorState detail={error?.message} onRetry={() => dispatch(fetchProductDraft(productId))} />
    );
  }

  const canSave = dirty && weightsValid && reason.trim().length > 0 && !lockedByOrder;

  // Markup.
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.editTitle')}
        subtitle={t('catalogue.editSubtitle')}
        meta={<StatusPill tone="info">{draft.sku}</StatusPill>}
      />

      {lockedByOrder ? (
        <p className="rounded border border-warning bg-warning-surface px-4 py-3 text-sm text-charcoal">
          {t('catalogue.lockedByOrderHelp')}
        </p>
      ) : null}

      <Card title={t('catalogue.groupIdentity')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="title"
            className="md:col-span-2"
            label={t('catalogue.fieldTitle')}
            required
            disabled={lockedByOrder}
            value={draft.title}
            onChange={setField('title')}
          />
          <Input
            id="category"
            label={t('catalogue.fieldCategory')}
            disabled={lockedByOrder}
            value={draft.category}
            onChange={setField('category')}
          />
          <Input
            id="speciality"
            label={t('catalogue.fieldSpeciality')}
            disabled={lockedByOrder}
            value={draft.speciality}
            onChange={setField('speciality')}
          />
        </div>
      </Card>

      <Card title={t('catalogue.groupWeights')} description={t('catalogue.repriceWarning')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-3">
          <Select
            id="purity"
            label={t('catalogue.fieldPurity')}
            required
            disabled={lockedByOrder}
            value={draft.purity}
            onChange={setNumber('purity')}
            options={PURITY_OPTIONS}
          />
          <Input
            id="grossWeight"
            type="number"
            step="0.001"
            label={t('catalogue.fieldGross')}
            required
            disabled={lockedByOrder}
            value={draft.grossWeight}
            onChange={setNumber('grossWeight')}
          />
          <Input
            id="stoneWeight"
            type="number"
            step="0.001"
            label={t('catalogue.fieldStone')}
            required
            disabled={lockedByOrder}
            error={weightsValid ? undefined : t('catalogue.weightsInvalid')}
            value={draft.stoneWeight}
            onChange={setNumber('stoneWeight')}
          />
        </div>

        {/* Net weight is arithmetic, not an opinion. It is shown and never
            typed, so the number the jeweller pays metal on cannot drift away
            from the two numbers it comes from. */}
        <dl className="mt-4 flex items-baseline justify-between gap-4 rounded border border-lightGray-dark bg-lightGray px-4 py-3">
          <dt className="text-sm text-charcoal-light">
            {t('catalogue.fieldNet')}
            <span className="block text-xs text-charcoal-lighter">
              {t('catalogue.netDerivedHelp')}
            </span>
          </dt>
          <dd className="shrink-0 font-heading text-xl text-charcoal">
            {weightsValid ? formatGrams(derivedNetWeight) : '-'}
          </dd>
        </dl>
      </Card>

      <Card title={t('catalogue.groupCompliance')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Checkbox
            id="hallmarked"
            label={t('catalogue.fieldHallmarked')}
            disabled={lockedByOrder}
            checked={Boolean(draft.hallmarked)}
            onChange={(event) =>
              dispatch(setProductDraftField({ field: 'hallmarked', value: event.target.checked }))
            }
          />
          <Input
            id="huid"
            label={t('catalogue.fieldHuid')}
            help={t('catalogue.huidHelp')}
            disabled={lockedByOrder || !draft.hallmarked}
            value={draft.hallmarked ? (draft.huid ?? '') : ''}
            onChange={setField('huid')}
          />
          <Input
            id="hsn"
            label={t('catalogue.fieldHsn')}
            disabled={lockedByOrder}
            value={draft.hsn ?? ''}
            onChange={setField('hsn')}
          />
          <Select
            id="visibility"
            label={t('catalogue.fieldVisibility')}
            disabled={lockedByOrder}
            value={draft.visibility}
            onChange={setField('visibility')}
            options={VISIBILITY_OPTIONS}
          />
        </div>
      </Card>

      <Card title={t('catalogue.groupTrade')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-3">
          <Input
            id="stockQuantity"
            type="number"
            label={t('catalogue.fieldStock')}
            disabled={lockedByOrder}
            value={draft.stockQuantity}
            onChange={setNumber('stockQuantity')}
          />
          <Input
            id="minOrderQuantity"
            type="number"
            label={t('catalogue.fieldMoq')}
            disabled={lockedByOrder}
            value={draft.minOrderQuantity}
            onChange={setNumber('minOrderQuantity')}
          />
          <Input
            id="leadTimeDays"
            type="number"
            label={t('catalogue.fieldLeadTime')}
            disabled={lockedByOrder}
            value={draft.leadTimeDays}
            onChange={setNumber('leadTimeDays')}
          />
        </div>
      </Card>

      <Card title={t('price.breakupTitle')} description={t('catalogue.repriceWarning')} padded={false}>
        <div className="p-5">
          <PriceBreakup breakup={draft.price} />
          <p className="mt-3 text-xs text-charcoal-light">
            {t('price.total')}: {formatINR(draft.price?.total)}
          </p>
        </div>
      </Card>

      <Card title={t('catalogue.editReason')}>
        <Textarea
          id="edit-reason"
          rows={3}
          required
          label={t('catalogue.editReason')}
          help={t('catalogue.editReasonHelp')}
          disabled={lockedByOrder}
          error={saveError?.code === 'edit_reason_required' ? saveError.message : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Card>

      {/* Sticky footer. Cancel to the left of the primary, always in this
          order, so muscle memory works across all 99 screens. */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3">
        <div className="flex items-center justify-end gap-2">
          {saveError && saveError.code !== 'edit_reason_required' ? (
            <p className="mr-auto text-sm text-danger">{saveError.message}</p>
          ) : null}
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(`/catalogue/products/${productId}`)}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!canSave} loading={saveStatus === 'loading'}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </form>
  );
}
