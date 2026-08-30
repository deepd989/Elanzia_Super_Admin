// ADM-032
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
  Select,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import {
  fetchMediaCompliance,
  fetchMediaStandards,
  saveMediaStandards,
  selectMediaStandards,
  setMediaStandardField,
} from '@/store/slices/catalogueSlice';
import { formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const BACKGROUND_OPTIONS = [
  { value: 'plain_white', label: t('catalogue.backgroundWhite') },
  { value: 'plain_grey', label: t('catalogue.backgroundGrey') },
  { value: 'any', label: t('catalogue.backgroundAny') },
];

const ANGLE_OPTIONS = ['Front', 'Reverse', 'Side profile', 'Hallmark close-up', 'Clasp detail', 'Scale reference'];

export default function MediaStandards() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { standards, compliance, compliantPercent, dirty, saveStatus, saveError, viewState, error } =
    useSelector(selectMediaStandards);

  useEffect(() => {
    dispatch(fetchMediaStandards());
  }, [dispatch]);

  // The compliance panel is measured against what is ON SCREEN, not what is
  // saved, so an admin sees how many listings a tighter standard breaks before
  // committing to it rather than afterwards.
  useEffect(() => {
    if (!standards) return;
    dispatch(
      fetchMediaCompliance({
        minImages: Number(standards.minImages),
        videoRequired: standards.videoRequired,
      }),
    );
  }, [dispatch, standards?.minImages, standards?.videoRequired]);

  // Handlers.
  const setNumber = (field) => (event) =>
    dispatch(setMediaStandardField({ field, value: Number(event.target.value) }));

  const toggleAngle = (angle) => {
    const next = standards.requiredAngles.includes(angle)
      ? standards.requiredAngles.filter((row) => row !== angle)
      : [...standards.requiredAngles, angle];
    dispatch(setMediaStandardField({ field: 'requiredAngles', value: next }));
  };

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !standards) {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchMediaStandards())} />;
  }

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.mediaTitle')}
        subtitle={t('catalogue.mediaSubtitle')}
        meta={
          compliantPercent !== null ? (
            <StatusPill tone={compliantPercent > 80 ? 'success' : 'warning'}>
              {formatPercent(compliantPercent)}
            </StatusPill>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={t('catalogue.groupIdentity')}>
            <div className="grid grid-cols-1 gap-field md:grid-cols-2">
              <Input
                id="minResolutionPx"
                type="number"
                label={t('catalogue.minResolution')}
                value={standards.minResolutionPx}
                onChange={setNumber('minResolutionPx')}
              />
              <Input
                id="maxFileSizeMb"
                type="number"
                label={t('catalogue.maxFileSize')}
                value={standards.maxFileSizeMb}
                onChange={setNumber('maxFileSizeMb')}
              />
              <Select
                id="background"
                label={t('catalogue.background')}
                value={standards.background}
                onChange={(event) =>
                  dispatch(setMediaStandardField({ field: 'background', value: event.target.value }))
                }
                options={BACKGROUND_OPTIONS}
              />
            </div>
          </Card>

          <Card title={t('catalogue.requiredAngles')}>
            <div className="grid grid-cols-1 gap-field md:grid-cols-2">
              <Input
                id="minImages"
                type="number"
                label={t('catalogue.minImages')}
                required
                error={saveError?.code === 'validation_failed' ? saveError.message : undefined}
                value={standards.minImages}
                onChange={setNumber('minImages')}
              />
              <Input
                id="maxImages"
                type="number"
                label={t('catalogue.maxImages')}
                required
                value={standards.maxImages}
                onChange={setNumber('maxImages')}
              />
            </div>

            <ul className="mt-4 flex flex-wrap gap-2">
              {ANGLE_OPTIONS.map((angle) => (
                <li key={angle}>
                  <Checkbox
                    id={`angle-${angle}`}
                    label={angle}
                    checked={standards.requiredAngles.includes(angle)}
                    onChange={() => toggleAngle(angle)}
                  />
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t('catalogue.videoRequired')}>
            <div className="grid grid-cols-1 gap-field md:grid-cols-2">
              <Checkbox
                id="videoRequired"
                label={t('catalogue.videoRequired')}
                checked={standards.videoRequired}
                onChange={(event) =>
                  dispatch(
                    setMediaStandardField({ field: 'videoRequired', value: event.target.checked }),
                  )
                }
              />
              <Input
                id="videoMaxSeconds"
                type="number"
                label={t('catalogue.videoMaxSeconds')}
                disabled={!standards.videoRequired}
                value={standards.videoMaxSeconds}
                onChange={setNumber('videoMaxSeconds')}
              />
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <CompliancePanel compliance={compliance} percent={compliantPercent} />
        </aside>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-2">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          <Button
            disabled={!dirty}
            loading={saveStatus === 'loading'}
            onClick={() => dispatch(saveMediaStandards(standards))}
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function CompliancePanel({ compliance, percent }) {
  if (!compliance) {
    return <div className="h-64 animate-pulse rounded-md bg-lightGray-dark" />;
  }

  return (
    <Card title={t('catalogue.complianceTitle')} description={t('catalogue.complianceBody')}>
      <p className="font-display text-3xl text-primary">{formatPercent(percent ?? 0)}</p>
      <p className="text-sm text-charcoal-light">
        {t('catalogue.compliantCount', {
          compliant: formatNumber(compliance.compliant),
          total: formatNumber(compliance.total),
        })}
      </p>

      <dl className="mt-4 flex flex-col gap-2 border-t border-lightGray-dark pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-charcoal-light">{t('catalogue.belowMinimum', { count: '' })}</dt>
          <dd className="text-base tabular-nums text-charcoal">
            {formatNumber(compliance.belowMinimum)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-charcoal-light">{t('catalogue.missingVideo', { count: '' })}</dt>
          <dd className="text-base tabular-nums text-charcoal">
            {formatNumber(compliance.missingVideo)}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 flex flex-col gap-1.5 border-t border-lightGray-dark pt-4">
        {compliance.byCategory.map((row) => (
          <li key={row.category} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-charcoal-light">{row.category}</span>
            <Badge tone={row.compliant === row.total ? 'accent' : 'neutral'}>
              {row.compliant}/{row.total}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
