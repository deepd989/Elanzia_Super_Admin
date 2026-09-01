// ADM-086
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Lock, Send, Users } from 'lucide-react';
import {
  Button, Card, Checkbox, ConfirmDialog, ErrorState, Input,
  PageHeader, Select, Spinner, StatusPill, Textarea,
} from '@/components/primitives';
import {
  clearComposer, estimateAudience, fetchAudiences, fetchBroadcast, saveBroadcastDraft,
  scheduleBroadcast, selectBroadcastComposer, setComposerAudience, setComposerField,
  toggleComposerChannel,
} from '@/store/slices/communicationsSlice';
import { formatDateTime, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const CHANNELS = ['in_app', 'email', 'sms', 'whatsapp'];
const CATEGORIES = ['policy', 'rate_change', 'outage', 'festive', 'feature', 'compliance'];

export default function BroadcastComposer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { broadcastId } = useParams();

  // Data.
  const {
    draft, isImmutable, segmentOptions, cityOptions, categoryOptions,
    estimate, estimateStatus, estimateError, canEstimate, canSave, canSchedule,
    viewState, saveStatus, saveError, error,
  } = useSelector(selectBroadcastComposer);

  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    dispatch(fetchAudiences());
    if (broadcastId) dispatch(fetchBroadcast(broadcastId));
    return () => dispatch(clearComposer());
  }, [dispatch, broadcastId]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setComposerField({ field, value: event.target.value }));

  const handleSaveDraft = async () => {
    const result = await dispatch(saveBroadcastDraft(bodyFromDraft(draft)));
    if (!result.error) navigate('/communications/broadcasts');
  };

  const handleSend = async () => {
    const saved = await dispatch(saveBroadcastDraft(bodyFromDraft(draft)));
    if (saved.error) { setConfirming(null); return; }
    const result = await dispatch(scheduleBroadcast({
      broadcastId: saved.payload.id,
      scheduledFor: draft.scheduledFor || null,
    }));
    setConfirming(null);
    if (!result.error) navigate('/communications/broadcasts');
  };

  if (viewState === 'loading') return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (viewState === 'error') return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAudiences())} />;

  const segment = draft.audience.segment;

  // Markup.
  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('communications.eyebrow')}
        title={broadcastId ? t('communications.editTitle') : t('communications.composeTitle')}
        subtitle={broadcastId ? t('communications.editSubtitle') : t('communications.composeSubtitle')}
        meta={isImmutable ? <StatusPill tone="warning">{t('communications.alreadySent')}</StatusPill> : null}
      />

      {/* An announcement that has started going out is settled history. The form
          stays on screen read-only rather than pretending an edit will land. */}
      {isImmutable ? (
        <div className="flex items-start gap-3 rounded-md border border-warning bg-warning-surface px-4 py-3">
          <Lock size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-base text-charcoal">{t('communications.alreadySentHelp')}</p>
        </div>
      ) : null}

      <Card title={t('communications.groupMessage')} description={t('communications.groupMessageHelp')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="title" label={t('communications.fieldTitle')} required
            help={t('communications.fieldTitleHelp')}
            disabled={isImmutable}
            value={draft.title} onChange={setField('title')}
          />
          <Select
            id="category" label={t('communications.fieldCategory')} required
            disabled={isImmutable}
            placeholder={t('common.all')}
            value={draft.category} onChange={setField('category')}
            options={CATEGORIES.map((value) => ({ value, label: t(`communications.category.${value}`) }))}
          />
          <Textarea
            id="body" className="md:col-span-2" rows={7}
            label={t('communications.fieldBody')} required
            disabled={isImmutable}
            value={draft.body} onChange={setField('body')}
          />
          <Checkbox
            id="requires-ack" className="md:col-span-2"
            label={t('communications.fieldRequiresAck')}
            help={t('communications.fieldRequiresAckHelp')}
            disabled={isImmutable}
            checked={draft.requiresAcknowledgement}
            onChange={(event) => dispatch(setComposerField({ field: 'requiresAcknowledgement', value: event.target.checked }))}
          />
        </div>
      </Card>

      <Card title={t('communications.groupAudience')} description={t('communications.groupAudienceHelp')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Select
            id="segment" label={t('communications.fieldSegment')} required
            disabled={isImmutable}
            placeholder={t('common.none')}
            value={segment}
            onChange={(event) => dispatch(setComposerAudience({ segment: event.target.value }))}
            options={segmentOptions.map((option) => ({
              value: option.segment,
              label: t(`communications.segment.${option.segment}`),
            }))}
          />
          {segment === 'city' ? (
            <Select
              id="audience-city" label={t('communications.fieldCity')} required
              disabled={isImmutable}
              placeholder={t('common.none')}
              value={draft.audience.city}
              onChange={(event) => dispatch(setComposerAudience({ city: event.target.value }))}
              options={cityOptions.map(({ value, label, memberCount }) => ({
                value,
                label: `${label} (${formatNumber(memberCount)})`,
              }))}
            />
          ) : null}
          {segment === 'category' ? (
            <Select
              id="audience-category" label={t('communications.fieldMemberCategory')} required
              disabled={isImmutable}
              placeholder={t('common.none')}
              value={draft.audience.memberCategory}
              onChange={(event) => dispatch(setComposerAudience({ memberCategory: event.target.value }))}
              options={categoryOptions.map(({ value, label, memberCount }) => ({
                value,
                label: `${label} (${formatNumber(memberCount)})`,
              }))}
            />
          ) : null}
        </div>
      </Card>

      <Card title={t('communications.groupChannels')} description={t('communications.groupChannelsHelp')}>
        <div className="grid grid-cols-2 gap-field md:grid-cols-4">
          {CHANNELS.map((channel) => (
            <Checkbox
              key={channel}
              id={`channel-${channel}`}
              label={t(`communications.channel.${channel}`)}
              disabled={isImmutable}
              checked={draft.channels.includes(channel)}
              onChange={() => dispatch(toggleComposerChannel(channel))}
            />
          ))}
        </div>
      </Card>

      <ReachPanel
        estimate={estimate}
        status={estimateStatus}
        error={estimateError}
        canEstimate={canEstimate && !isImmutable}
        channelCount={draft.channels.length}
        onEstimate={() => dispatch(estimateAudience({ audience: draft.audience, channels: draft.channels }))}
      />

      <Card title={t('communications.groupSchedule')}>
        <Input
          id="scheduled-for" type="datetime-local" className="max-w-xs"
          label={t('communications.fieldScheduledFor')}
          help={t('communications.fieldScheduledForHelp')}
          disabled={isImmutable}
          value={draft.scheduledFor ? draft.scheduledFor.slice(0, 16) : ''}
          onChange={setField('scheduledFor')}
        />
      </Card>

      {/* Sticky footer. Cancel on the left of the primary, always in this
          order, so muscle memory works across all 99 screens. */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3">
        <div className="flex items-center justify-end gap-2">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          <Button variant="secondary" onClick={() => navigate('/communications/broadcasts')}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="secondary" disabled={!canSave || isImmutable}
            loading={saveStatus === 'loading'} onClick={handleSaveDraft}
          >
            {t('communications.saveDraft')}
          </Button>
          <Button
            iconLeft={Send}
            disabled={!canSave || !canSchedule || isImmutable}
            onClick={() => setConfirming(draft.scheduledFor ? 'schedule' : 'send')}
          >
            {draft.scheduledFor ? t('communications.schedule') : t('communications.sendNow')}
          </Button>
        </div>
      </footer>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={handleSend}
        loading={saveStatus === 'loading'}
        tone="primary"
        title={confirming === 'schedule'
          ? t('communications.confirmScheduleTitle', { count: formatNumber(estimate?.recipientCount ?? 0) })
          : t('communications.confirmSendTitle', { count: formatNumber(estimate?.recipientCount ?? 0) })}
        body={confirming === 'schedule'
          ? t('communications.confirmScheduleBody', { date: formatDateTime(draft.scheduledFor) })
          : t('communications.confirmSendBody', {
            channels: draft.channels.map((channel) => t(`communications.channel.${channel}`)).join(', '),
          })}
        confirmLabel={confirming === 'schedule' ? t('communications.schedule') : t('communications.sendNow')}
      />
    </div>
  );
}

// The reach is checked before anything is sent, because a composer that says
// "3,000 members" and then reaches 2,400 has misled the person who pressed send.
function ReachPanel({ estimate, status, error, canEstimate, channelCount, onEstimate }) {
  return (
    <Card
      title={t('communications.reachTitle')}
      description={t('communications.reachHelp')}
      action={
        <Button variant="secondary" iconLeft={Users} disabled={!canEstimate} loading={status === 'loading'} onClick={onEstimate}>
          {t('communications.checkReach')}
        </Button>
      }
    >
      {!canEstimate && !estimate ? (
        <p className="text-base text-charcoal-light">{t('communications.reachBlocked')}</p>
      ) : null}
      {error ? <p className="text-sm text-danger">{error.message}</p> : null}
      {estimate ? (
        <dl className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-charcoal-light">{t('communications.reachTitle')}</dt>
            <dd className="text-right font-heading text-2xl text-charcoal">
              {t('communications.reachMembers', { count: formatNumber(estimate.recipientCount) })}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-charcoal-light">{t('communications.columnChannels')}</dt>
            <dd className="text-right text-base text-charcoal">
              {t('communications.reachMessages', {
                count: formatNumber(estimate.messageCount),
                channels: channelCount,
              })}
            </dd>
          </div>
          {estimate.suppressedCount > 0 ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-charcoal-light">
                {t('communications.reachSuppressed', { count: formatNumber(estimate.suppressedCount) })}
              </dt>
              <dd className="text-right text-sm text-charcoal-light">
                {estimate.suppressionReasons
                  .map((row) => t(`communications.suppressionReason.${row.reason}`))
                  .join(', ')}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Card>
  );
}

// The composer holds a form-shaped draft; the endpoint takes the audience with
// only the keys its segment uses. Trimming happens here so the API never has to
// guess whether an empty city means "all cities" or "not chosen yet".
function bodyFromDraft(draft) {
  const { segment, city, memberCategory, memberIds } = draft.audience;

  return {
    id: draft.id,
    title: draft.title,
    body: draft.body,
    category: draft.category,
    channels: draft.channels,
    requiresAcknowledgement: draft.requiresAcknowledgement,
    audience: {
      segment,
      city: segment === 'city' ? city : null,
      memberCategory: segment === 'category' ? memberCategory : null,
      memberIds: segment === 'custom' ? memberIds : undefined,
    },
  };
}
