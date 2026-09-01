// ADM-039
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  fetchChargeRules,
  fetchViolations,
  resetChargeDraft,
  saveChargeRules,
  selectChargeRules,
  setCategoryDraftField,
  setDefaultsDraftField,
} from '@/store/slices/pricingSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatINR, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const FIELD_LABELS = {
  wastagePercent: t('pricing.fieldWastage'),
  makingChargesPerGram: t('pricing.fieldMaking'),
};

export default function ChargeAndCommissionRules() {
  const dispatch = useDispatch();

  // Data.
  const {
    defaults,
    categories,
    dirty,
    violations,
    violationsTotal,
    violationsViewState,
    viewState,
    saveStatus,
    saveError,
    error,
  } = useSelector(selectChargeRules);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canEdit = grantedPermissions.includes('pricing.making.edit');

  useEffect(() => {
    dispatch(fetchChargeRules());
    dispatch(fetchViolations({}));
  }, [dispatch]);

  // Handlers.
  const handleSave = async () => {
    const result = await dispatch(saveChargeRules({ defaults, categories }));
    // Tightening a band can strand listings, so the panel is re-read against
    // the rules that were actually saved rather than the ones on screen.
    if (!result.error) dispatch(fetchViolations({}));
  };

  // Markup.
  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !defaults) {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchChargeRules())} />;
  }

  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.rulesTitle')}
        subtitle={t('pricing.rulesSubtitle')}
        meta={
          violationsTotal > 0 ? (
            <StatusPill tone="warning">
              {t('pricing.violationsTitle')} · {formatNumber(violationsTotal)}
            </StatusPill>
          ) : null
        }
      />

      <Card title={t('pricing.defaultsCard')} description={t('pricing.defaultsHelp')}>
        <div className="grid grid-cols-1 gap-field sm:grid-cols-2 xl:grid-cols-3">
          <BandInputs
            idPrefix="default"
            row={defaults}
            readOnly={!canEdit}
            onChange={(field, value) => dispatch(setDefaultsDraftField({ field, value }))}
          />
          <Input
            id="default-commission"
            type="number"
            step="0.1"
            label={t('pricing.commission')}
            disabled={!canEdit}
            value={defaults.commissionPercent}
            onChange={(event) =>
              dispatch(setDefaultsDraftField({ field: 'commissionPercent', value: event.target.value }))
            }
          />
          {/* Statutory. Shown because it is part of the price, disabled
              because it is not Elanzia's to set. */}
          <Input
            id="default-gst"
            label={t('pricing.gstLabel')}
            help={t('pricing.gstHelp')}
            disabled
            value={formatPercent(defaults.gstPercent, { decimals: 0 })}
          />
        </div>
      </Card>

      <Card title={t('pricing.categoriesCard')} padded={false}>
        <TableShell className="rounded-none border-0 shadow-none" maxHeight="34rem">
          <TableShell.Head>
            <TableShell.HeadCell>{t('pricing.columnCategory')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.columnListings')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.wastageBand')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.makingBand')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.commission')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {categories.map((rule) => (
              <TableShell.Row key={rule.category}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{rule.category}</span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatNumber(rule.listingCount)}
                </TableShell.Cell>
                <TableShell.Cell>
                  <RangePair
                    idPrefix={`${rule.category}-wastage`}
                    readOnly={!canEdit}
                    minValue={rule.wastageMinPercent}
                    maxValue={rule.wastageMaxPercent}
                    onMin={(value) =>
                      dispatch(setCategoryDraftField({ category: rule.category, field: 'wastageMinPercent', value }))
                    }
                    onMax={(value) =>
                      dispatch(setCategoryDraftField({ category: rule.category, field: 'wastageMaxPercent', value }))
                    }
                  />
                </TableShell.Cell>
                <TableShell.Cell>
                  <RangePair
                    idPrefix={`${rule.category}-making`}
                    readOnly={!canEdit}
                    minValue={rule.makingMinPerGram}
                    maxValue={rule.makingMaxPerGram}
                    onMin={(value) =>
                      dispatch(setCategoryDraftField({ category: rule.category, field: 'makingMinPerGram', value }))
                    }
                    onMax={(value) =>
                      dispatch(setCategoryDraftField({ category: rule.category, field: 'makingMaxPerGram', value }))
                    }
                  />
                </TableShell.Cell>
                <TableShell.Cell align="right">
                  <Input
                    id={`${rule.category}-commission`}
                    className="w-24"
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    value={rule.commissionPercent}
                    onChange={(event) =>
                      dispatch(setCategoryDraftField({
                        category: rule.category,
                        field: 'commissionPercent',
                        value: event.target.value,
                      }))
                    }
                  />
                </TableShell.Cell>
              </TableShell.Row>
            ))}
          </TableShell.Body>
        </TableShell>
      </Card>

      <ViolationsPanel
        violations={violations}
        total={violationsTotal}
        viewState={violationsViewState}
        onRetry={() => dispatch(fetchViolations({}))}
      />

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3">
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          {saveStatus === 'succeeded' && !dirty && !saveError ? (
            <p className="mr-auto text-sm text-success">{t('pricing.rulesSaved')}</p>
          ) : null}
          <Button variant="secondary" disabled={!dirty} onClick={() => dispatch(resetChargeDraft())}>
            {t('common.reset')}
          </Button>
          <Button disabled={!canEdit || !dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function BandInputs({ idPrefix, row, readOnly, onChange }) {
  return (
    <>
      <div className="flex items-end gap-2">
        <Input
          id={`${idPrefix}-wastage-min`}
          type="number"
          step="0.1"
          label={t('pricing.wastageBand')}
          disabled={readOnly}
          value={row.wastageMinPercent}
          onChange={(event) => onChange('wastageMinPercent', event.target.value)}
        />
        <span className="pb-2.5 text-charcoal-light">{t('common.to')}</span>
        <Input
          id={`${idPrefix}-wastage-max`}
          type="number"
          step="0.1"
          disabled={readOnly}
          value={row.wastageMaxPercent}
          onChange={(event) => onChange('wastageMaxPercent', event.target.value)}
        />
      </div>

      <div className="flex items-end gap-2">
        <Input
          id={`${idPrefix}-making-min`}
          type="number"
          label={t('pricing.makingBand')}
          disabled={readOnly}
          value={row.makingMinPerGram}
          onChange={(event) => onChange('makingMinPerGram', event.target.value)}
        />
        <span className="pb-2.5 text-charcoal-light">{t('common.to')}</span>
        <Input
          id={`${idPrefix}-making-max`}
          type="number"
          disabled={readOnly}
          value={row.makingMaxPerGram}
          onChange={(event) => onChange('makingMaxPerGram', event.target.value)}
        />
      </div>
    </>
  );
}

function RangePair({ idPrefix, readOnly, minValue, maxValue, onMin, onMax }) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        id={`${idPrefix}-min`}
        className="w-20"
        type="number"
        step="0.1"
        disabled={readOnly}
        value={minValue}
        onChange={(event) => onMin(event.target.value)}
      />
      <span className="text-xs text-charcoal-light">{t('common.to')}</span>
      <Input
        id={`${idPrefix}-max`}
        className="w-20"
        type="number"
        step="0.1"
        disabled={readOnly}
        value={maxValue}
        onChange={(event) => onMax(event.target.value)}
      />
    </div>
  );
}

// Tightening a rule does not retire a listing. These are the ones somebody has
// to work through afterwards, which is why the count sits next to the title
// rather than being discovered later.
function ViolationsPanel({ violations, total, viewState, onRetry }) {
  return (
    <Card
      title={t('pricing.violationsTitle')}
      description={t('pricing.violationsSubtitle')}
      action={total > 0 ? <Badge tone="danger">{formatNumber(total)}</Badge> : null}
      padded={false}
    >
      {viewState === 'error' ? (
        <ErrorState onRetry={onRetry} />
      ) : viewState === 'loading' ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : violations.length === 0 ? (
        <EmptyState icon={TriangleAlert} title={t('pricing.violationsClear')} body="" />
      ) : (
        <TableShell className="rounded-none border-0 shadow-none" maxHeight="22rem">
          <TableShell.Head>
            <TableShell.HeadCell>{t('pricing.columnListing')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.columnCategory')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.columnField')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.columnValue')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.columnAllowed')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {violations.map((violation) => (
              <TableShell.Row key={`${violation.productId}-${violation.field}`}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{violation.title}</span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {violation.sku} · {violation.manufacturerName}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>{violation.category}</TableShell.Cell>
                <TableShell.Cell>{FIELD_LABELS[violation.field] ?? violation.field}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  <span className="text-danger">
                    {violation.field === 'wastagePercent'
                      ? formatPercent(violation.value)
                      : formatINR(violation.value)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {violation.field === 'wastagePercent'
                    ? `${formatPercent(violation.min)} - ${formatPercent(violation.max)}`
                    : `${formatINR(violation.min)} - ${formatINR(violation.max)}`}
                </TableShell.Cell>
              </TableShell.Row>
            ))}
          </TableShell.Body>
        </TableShell>
      )}
    </Card>
  );
}
