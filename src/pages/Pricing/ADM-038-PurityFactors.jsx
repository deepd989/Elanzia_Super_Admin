// ADM-038
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Info } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import {
  fetchPurityFactors,
  resetFactorDraft,
  savePurityFactors,
  selectPurityFactors,
  setFactorDraftValue,
} from '@/store/slices/pricingSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

export default function PurityFactors() {
  const dispatch = useDispatch();

  // Data.
  const {
    factors,
    referenceRates,
    dirty,
    customCount,
    viewState,
    saveStatus,
    saveError,
    error,
  } = useSelector(selectPurityFactors);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canEdit = grantedPermissions.includes('pricing.rates.edit');

  useEffect(() => {
    dispatch(fetchPurityFactors());
  }, [dispatch]);

  // Handlers.
  const handleSave = () =>
    dispatch(
      savePurityFactors({
        factors: factors.map(({ metal, purity, factor }) => ({
          metal,
          purity,
          factor: Number(factor),
        })),
      }),
    );

  // Markup.
  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchPurityFactors())} />;
  }

  const byMetal = factors.reduce((groups, row) => {
    (groups[row.metal] ??= []).push(row);
    return groups;
  }, {});

  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.factorsTitle')}
        subtitle={t('pricing.factorsSubtitle')}
        meta={
          customCount > 0 ? (
            <StatusPill tone="warning">{t('pricing.customCount', { count: customCount })}</StatusPill>
          ) : null
        }
      />

      <div className="flex items-start gap-3 rounded-md border border-info/30 bg-info-surface px-4 py-3">
        <Info size={17} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
        <div>
          <p className="font-body text-base font-semibold text-info">
            {t('pricing.factorsExplainerTitle')}
          </p>
          <p className="mt-0.5 text-sm text-charcoal-light">{t('pricing.factorsExplainerBody')}</p>
        </div>
      </div>

      {referenceRates.map((reference) => (
        <Card
          key={reference.id}
          title={`${reference.metalLabel} ${reference.purityLabel}`}
          description={t('pricing.referenceRow')}
        >
          <p className="font-display text-2xl text-primary num">
            {formatINR(reference.ratePerGram, { paise: reference.metal === 'silver' })}
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {(byMetal[reference.metal] ?? []).map((row) => (
              <FactorRow
                key={`${row.metal}-${row.purity}`}
                row={row}
                readOnly={!canEdit}
                onChange={(factor) =>
                  dispatch(setFactorDraftValue({ metal: row.metal, purity: row.purity, factor }))
                }
              />
            ))}
          </div>
        </Card>
      ))}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          {saveStatus === 'succeeded' && !dirty && !saveError ? (
            <p className="mr-auto text-sm text-success">{t('pricing.factorsSaved')}</p>
          ) : null}
          <Button variant="secondary" disabled={!dirty} onClick={() => dispatch(resetFactorDraft())}>
            {t('pricing.resetFactors')}
          </Button>
          <Button disabled={!canEdit || !dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function FactorRow({ row, readOnly, onChange }) {
  const factor = Number(row.factor);
  const deviation = Number((((factor - row.nominalFactor) / row.nominalFactor) * 100).toFixed(3));
  const isCustom = factor.toFixed(6) !== Number(row.nominalFactor).toFixed(6);

  return (
    <div className="flex flex-wrap items-end gap-4 border-t border-lightGray pt-3">
      <span className="flex min-w-[10rem] flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-body text-base font-medium text-charcoal">{row.purityLabel}</span>
          <Badge tone={row.quoted ? 'outline' : 'accent'}>
            {row.quoted ? t('pricing.quotedBadge') : t('pricing.derivedBadge')}
          </Badge>
          {isCustom ? <Badge tone="neutral">{t('pricing.customBadge')}</Badge> : null}
        </span>
        {/* The distinction that decides whether editing this does anything. */}
        <span className={`text-xs ${row.quoted ? 'text-charcoal-light' : 'text-accent-dark'}`}>
          {row.quoted ? t('pricing.auditOnly') : t('pricing.movesRealPrice')}
        </span>
      </span>

      <Input
        id={`factor-${row.metal}-${row.purity}`}
        className="w-40"
        type="number"
        step="0.000001"
        label={t('pricing.columnFactor')}
        disabled={readOnly}
        value={row.factor}
        help={t('pricing.nominalHelp', { value: Number(row.nominalFactor).toFixed(6) })}
        onChange={(event) => onChange(event.target.value)}
      />

      <span className="flex flex-col gap-1">
        <span className="text-xs text-charcoal-light">{t('pricing.columnDeviation')}</span>
        <span
          className={`text-base num ${Math.abs(deviation) > 0.25 ? 'text-warning' : 'text-charcoal'}`}
        >
          {deviation >= 0 ? '+' : ''}
          {formatPercent(deviation, { decimals: 3 })}
        </span>
      </span>

      <span className="flex flex-col gap-1">
        <span className="text-xs text-charcoal-light">{t('pricing.columnResulting')}</span>
        <span className="text-base text-charcoal num">
          {formatINR(row.resultingRatePerGram, { paise: row.metal === 'silver' })}
        </span>
      </span>

      {row.updatedAt ? (
        <span className="ml-auto text-xs text-charcoal-light">
          {t('common.updatedAt')} {formatDateTime(row.updatedAt)}
        </span>
      ) : null}
    </div>
  );
}
