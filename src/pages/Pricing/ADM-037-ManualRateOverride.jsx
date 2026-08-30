// ADM-037
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, ShieldAlert } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
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
import { MAX_OVERRIDE_DEVIATION_PERCENT } from '@/data/pricingFixtures';
import {
  clearOverrideFilters,
  createOverride,
  endOverride,
  fetchMetalRates,
  fetchOverrides,
  resetOverrideDraft,
  selectRateOverrides,
  setOverrideDraftField,
  setOverrideFilters,
  setOverridePage,
  setOverridePageSize,
  setOverrideSearch,
} from '@/store/slices/pricingSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = { active: 'warning', expired: 'neutral', ended: 'neutral' };

const STATE_OPTIONS = [
  { value: 'active', label: t('pricing.state.active') },
  { value: 'expired', label: t('pricing.state.expired') },
  { value: 'ended', label: t('pricing.state.ended') },
];

const EXPIRY_OPTIONS = [2, 4, 6, 12, 24].map((hours) => ({
  value: hours,
  label: t('pricing.hours', { count: hours }),
}));

const COLUMN_COUNT = 7;

export default function ManualRateOverride() {
  const dispatch = useDispatch();

  // Data.
  const {
    overrides,
    total,
    query,
    draft,
    active,
    currentRate,
    rateOptions,
    viewState,
    saveStatus,
    saveError,
    error,
  } = useSelector(selectRateOverrides);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canOverride = grantedPermissions.includes('pricing.rates.edit');

  const [createOpen, setCreateOpen] = useState(false);
  const [ending, setEnding] = useState(null);
  const [endNote, setEndNote] = useState('');

  useEffect(() => {
    dispatch(fetchMetalRates());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchOverrides());
  }, [dispatch, query]);

  // Handlers.
  const handleCreate = async () => {
    const result = await dispatch(createOverride(draft));
    if (!result.error) {
      setCreateOpen(false);
      dispatch(fetchOverrides());
      // The board is now showing a hand-set number for that purity.
      dispatch(fetchMetalRates());
    }
  };

  const handleEnd = async () => {
    const result = await dispatch(endOverride({ overrideId: ending.id, note: endNote }));
    setEnding(null);
    setEndNote('');
    if (!result.error) {
      dispatch(fetchOverrides());
      dispatch(fetchMetalRates());
    }
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.overridesTitle')}
        subtitle={t('pricing.overridesSubtitle')}
        actions={
          canOverride ? (
            <Button
              iconLeft={Plus}
              onClick={() => {
                dispatch(resetOverrideDraft());
                setCreateOpen(true);
              }}
            >
              {t('pricing.newOverride')}
            </Button>
          ) : null
        }
      />

      <ActiveOverrideBanners
        active={active}
        canOverride={canOverride}
        onEnd={setEnding}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-80"
          iconLeft={Search}
          placeholder={t('common.search')}
          value={query.search}
          onChange={(event) => dispatch(setOverrideSearch(event.target.value))}
        />
        <Select
          id="state"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) =>
            dispatch(setOverrideFilters({ ...query.filters, state: event.target.value }))
          }
          options={STATE_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearOverrideFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setOverridePage(page))}
            onPageSizeChange={(size) => dispatch(setOverridePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('pricing.columnPurity')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('pricing.columnOverrideRate')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('pricing.columnFeedRate')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('pricing.columnReason')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('pricing.columnSetBy')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('pricing.columnApplies')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            overrides.map((override) => (
              <TableShell.Row key={override.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">
                    {override.metal} {override.purity}
                  </span>
                  <span className="block font-mono text-xs text-charcoal-light">{override.id}</span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(override.ratePerGram, { paise: override.metal === 'silver' })}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(override.feedRateAtOverride, { paise: override.metal === 'silver' })}
                  <span
                    className={`block text-xs ${
                      Math.abs(override.deviationPercent) > 2 ? 'text-warning' : 'text-charcoal-light'
                    }`}
                  >
                    {override.deviationPercent >= 0 ? '+' : ''}
                    {formatPercent(override.deviationPercent, { decimals: 2 })}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell className="max-w-md text-charcoal-light">
                  {override.reason}
                </TableShell.Cell>
                <TableShell.Cell>
                  {override.createdByName}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(override.createdAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDateTime(override.effectiveFrom)}
                  <span className="block text-xs text-charcoal-light">
                    {t('common.to')} {formatDateTime(override.endedAt ?? override.expiresAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATE_TONES[override.state]}>
                    {t(`pricing.state.${override.state}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <OverrideSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchOverrides())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearOverrideFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  title={t('pricing.overridesEmptyTitle')}
                  body={t('pricing.overridesEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <CreateOverrideModal
        open={createOpen}
        draft={draft}
        currentRate={currentRate}
        rateOptions={rateOptions}
        saving={saveStatus === 'loading'}
        error={saveError}
        onField={(field, value) => dispatch(setOverrideDraftField({ field, value }))}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={Boolean(ending)}
        onClose={() => setEnding(null)}
        onConfirm={handleEnd}
        loading={saveStatus === 'loading'}
        tone="primary"
        title={t('pricing.endOverrideTitle')}
        body={t('pricing.endOverrideBody')}
        confirmLabel={t('pricing.endOverride')}
      >
        <Textarea
          id="end-note"
          className="mt-4"
          rows={2}
          label={t('pricing.endNote')}
          value={endNote}
          onChange={(event) => setEndNote(event.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

// The board is showing a hand-set number while any of these are in force, so
// the banner stays until somebody hands the purity back to the feed.
function ActiveOverrideBanners({ active, canOverride, onEnd }) {
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {active.map((override) => (
        <div
          key={override.id}
          className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning-surface px-4 py-3"
        >
          <ShieldAlert size={17} className="shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-body text-base font-semibold text-warning">
              {t('pricing.activeTitle', { count: active.length })}
            </p>
            <p className="text-sm text-charcoal-light">
              {t('pricing.activeBody', {
                metal: override.metal,
                purity: override.purity,
                rate: formatINR(override.ratePerGram),
                when: formatRelativeTime(override.expiresAt),
                reason: override.reason,
              })}
            </p>
          </div>
          {canOverride ? (
            <Button size="sm" variant="secondary" onClick={() => onEnd(override)}>
              {t('pricing.endOverride')}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CreateOverrideModal({
  open,
  draft,
  currentRate,
  rateOptions,
  saving,
  error,
  onField,
  onClose,
  onSubmit,
}) {
  const feedRate = currentRate?.ratePerGram ?? null;
  const typed = Number(draft.ratePerGram);
  // Shown live so the desk sees the deviation before submitting, rather than
  // discovering the limit through a rejection.
  const deviation =
    feedRate && Number.isFinite(typed) && typed > 0
      ? Number((((typed - feedRate) / feedRate) * 100).toFixed(2))
      : null;
  const tooFar = deviation !== null && Math.abs(deviation) > MAX_OVERRIDE_DEVIATION_PERCENT;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pricing.newOverrideTitle')}
      description={t('pricing.newOverrideDescription')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button loading={saving} disabled={tooFar} onClick={onSubmit}>
            {t('pricing.createOverride')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <Select
          id="target"
          label={t('pricing.overrideTarget')}
          value={`${draft.metal}:${draft.purity}`}
          onChange={(event) => {
            const [metal, purity] = event.target.value.split(':');
            onField('metal', metal);
            onField('purity', Number(purity));
          }}
          options={rateOptions}
        />

        {feedRate ? (
          <p className="text-sm text-charcoal-light">
            {t('pricing.currentFeedRate')}{' '}
            <span className="font-medium text-charcoal num">{formatINR(feedRate)}</span>
          </p>
        ) : null}

        <Input
          id="rate"
          type="number"
          label={t('pricing.overrideRate')}
          required
          value={draft.ratePerGram}
          error={tooFar ? t('pricing.deviationLimit', { percent: `${MAX_OVERRIDE_DEVIATION_PERCENT}%` }) : undefined}
          help={
            deviation !== null && !tooFar
              ? t('pricing.deviationFromFeed', {
                  percent: `${deviation >= 0 ? '+' : ''}${deviation}%`,
                })
              : t('pricing.deviationLimit', { percent: `${MAX_OVERRIDE_DEVIATION_PERCENT}%` })
          }
          onChange={(event) => onField('ratePerGram', event.target.value)}
        />

        <Textarea
          id="reason"
          rows={3}
          required
          label={t('pricing.overrideReason')}
          help={t('pricing.overrideReasonHelp')}
          value={draft.reason}
          onChange={(event) => onField('reason', event.target.value)}
        />

        <Select
          id="expiry"
          label={t('pricing.overrideExpiry')}
          required
          help={t('pricing.overrideExpiryHelp')}
          value={draft.expiresInHours}
          onChange={(event) => onField('expiresInHours', Number(event.target.value))}
          options={EXPIRY_OPTIONS}
        />

        {error ? <p className="text-sm text-danger">{error.message}</p> : null}
      </div>
    </Modal>
  );
}

function OverrideSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
