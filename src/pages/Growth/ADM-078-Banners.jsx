// ADM-078
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, GalleryHorizontalEnd, Plus, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import {
  clearBannerDraft,
  fetchBanners,
  fetchMedia,
  reorderBanner,
  saveBanner,
  selectBannerMerchandising,
  setBannerDraftField,
  startBannerDraft,
} from '@/store/slices/growthSlice';
import { formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = { draft: 'neutral', live: 'success', scheduled: 'info', expired: 'neutral' };

const STATUS_OPTIONS = ['draft', 'live', 'scheduled', 'expired'].map((value) => ({
  value,
  label: t(`growth.bannerStatus.${value}`),
}));

export default function Banners() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    bySlot,
    slots,
    draft,
    dirty,
    blocked,
    liveWithBlocked,
    saveStatus,
    saveError,
    actionStatus,
    actionError,
    assetOptions,
    viewState,
    error,
  } = useSelector(selectBannerMerchandising);

  useEffect(() => {
    dispatch(fetchBanners());
    dispatch(fetchMedia());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setBannerDraftField({ field, value: event.target.value }));

  const handleSave = async () => {
    const result = await dispatch(saveBanner(draft));
    if (!result.error) dispatch(clearBannerDraft());
  };

  const slotOptions = slots.map((slot) => ({ value: slot.id, label: slot.label }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.bannersTitle')}
        subtitle={t('growth.bannersSubtitle')}
        meta={
          liveWithBlocked > 0 ? (
            <StatusPill tone="danger" dot>
              {t('growth.blockedCount', { count: liveWithBlocked })}
            </StatusPill>
          ) : null
        }
        actions={
          <Button iconLeft={Plus} onClick={() => dispatch(startBannerDraft())}>
            {t('growth.addBanner')}
          </Button>
        }
      />

      {viewState === 'loading' ? <SlotSkeleton /> : null}
      {viewState === 'error' ? (
        <ErrorState detail={error?.message} onRetry={() => dispatch(fetchBanners())} />
      ) : null}
      {viewState === 'empty' ? (
        <Card>
          <EmptyState
            icon={GalleryHorizontalEnd}
            title={t('growth.bannersEmptyTitle')}
            body={t('growth.bannersEmptyBody')}
            actionLabel={t('growth.addBanner')}
            onAction={() => dispatch(startBannerDraft())}
          />
        </Card>
      ) : null}

      {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

      {viewState === 'populated'
        ? bySlot.map((slot) => (
            <Card
              key={slot.id}
              title={slot.label}
              description={t('growth.slotCapacity', { live: slot.liveCount, max: slot.maxLive })}
              action={
                slot.full ? <StatusPill tone="warning">{t('growth.slotFull')}</StatusPill> : null
              }
              padded={false}
            >
              {slot.banners.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title={t('growth.bannersEmptyTitle')}
                    body={t('growth.bannersEmptyBody')}
                  />
                </div>
              ) : (
                <ul className="divide-y divide-lightGray">
                  {slot.banners.map((banner, index) => (
                    <BannerRow
                      key={banner.id}
                      banner={banner}
                      first={index === 0}
                      last={index === slot.banners.length - 1}
                      busy={actionStatus === 'loading'}
                      onEdit={() => dispatch(startBannerDraft(banner))}
                      onMove={(direction) => dispatch(reorderBanner({ bannerId: banner.id, direction }))}
                    />
                  ))}
                </ul>
              )}
            </Card>
          ))
        : null}

      <Modal
        open={Boolean(draft)}
        onClose={() => dispatch(clearBannerDraft())}
        title={draft?.id ? t('common.edit') : t('growth.addBanner')}
        footer={
          <>
            <Button variant="secondary" onClick={() => dispatch(clearBannerDraft())}>
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
            {/* A banner pointing at a protected piece is refused for the same
                reason a collection containing one is. The link is a public
                surface. */}
            {blocked.length > 0 ? (
              <div className="rounded border border-danger bg-danger-surface px-3 py-2">
                {blocked.map((row) => (
                  <p key={row.productId} className="flex items-start gap-2 text-xs text-charcoal">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                    {row.reason}
                  </p>
                ))}
              </div>
            ) : null}

            <Input id="title" label={t('growth.bannerTitleField')} required value={draft.title} onChange={setField('title')} />
            <Input id="subtitle" label={t('growth.bannerSubtitle')} value={draft.subtitle ?? ''} onChange={setField('subtitle')} />
            <Select
              id="slot"
              label={t('growth.slotLabel')}
              value={draft.slot}
              error={saveError?.code === 'slot_full' ? saveError.message : undefined}
              onChange={setField('slot')}
              options={slotOptions}
            />
            <Select
              id="asset"
              label={t('growth.bannerAsset')}
              placeholder={t('common.none')}
              value={draft.assetId ?? ''}
              onChange={setField('assetId')}
              options={assetOptions}
            />
            <div className="grid grid-cols-2 gap-field">
              <Input id="ctaLabel" label={t('growth.bannerCtaLabel')} value={draft.ctaLabel ?? ''} onChange={setField('ctaLabel')} />
              <Input id="ctaPath" label={t('growth.bannerCtaPath')} value={draft.ctaPath ?? ''} onChange={setField('ctaPath')} />
            </div>
            <Input
              id="linkedProductId"
              label={t('growth.bannerLinkedProduct')}
              value={draft.linkedProductId ?? ''}
              error={saveError?.code === 'protected_piece_linked' ? saveError.message : undefined}
              onChange={setField('linkedProductId')}
            />
            <Select id="status" label={t('common.status')} value={draft.status} onChange={setField('status')} options={STATUS_OPTIONS} />

            {saveError && !['slot_full', 'protected_piece_linked'].includes(saveError.code) ? (
              <p className="text-sm text-danger">{saveError.message}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function BannerRow({ banner, first, last, busy, onEdit, onMove }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      {/* Two buttons rather than drag and drop. There is no dnd anywhere in
          this portal, and these work from a keyboard. */}
      <span className="flex shrink-0 flex-col">
        <Button size="sm" variant="ghost" disabled={first || busy} onClick={() => onMove('up')} aria-label={t('growth.moveUp')}>
          <ChevronUp size={14} aria-hidden="true" />
        </Button>
        <Button size="sm" variant="ghost" disabled={last || busy} onClick={() => onMove('down')} aria-label={t('growth.moveDown')}>
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-base text-charcoal">
          {banner.title}
          {banner.blocked.length > 0 ? (
            <Badge tone="danger">{t(`growth.blockCode.${banner.blocked[0].code}`)}</Badge>
          ) : null}
        </p>
        <p className="text-xs text-charcoal-light">
          {banner.subtitle ?? banner.assetLabel ?? banner.ctaPath}
        </p>
        {banner.linkedProductTitle ? (
          <p className="text-xs text-charcoal-lighter">{banner.linkedProductTitle}</p>
        ) : null}
      </div>

      <span className="shrink-0 text-right">
        <span className="block text-sm tabular-nums text-charcoal">
          {formatNumber(banner.impressions)}
        </span>
        <span className="block text-xs text-charcoal-light">
          {formatPercent(banner.clickThroughRate, { decimals: 2 })}
        </span>
      </span>

      <StatusPill size="sm" tone={STATUS_TONES[banner.status]}>
        {t(`growth.bannerStatus.${banner.status}`)}
      </StatusPill>

      <Button size="sm" variant="ghost" onClick={onEdit}>
        {t('common.edit')}
      </Button>
    </li>
  );
}

function SlotSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-md bg-lightGray-dark" />
      ))}
    </div>
  );
}
