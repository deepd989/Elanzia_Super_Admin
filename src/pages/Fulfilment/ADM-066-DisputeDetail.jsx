// ADM-066
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bot, Lock, Scale } from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, ConfirmDialog, ErrorState, PageHeader,
  Spinner, StatusPill, Textarea,
} from '@/components/primitives';
import { MediaViewer, SplitReviewLayout } from '@/components';
import {
  addDisputeNote, clearDisputeDetail, fetchDispute, reopenDispute,
  selectDisputeDetail, setNoteDraft,
} from '@/store/slices/trustSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SEVERITY_TONES = { medium: 'info', high: 'warning', critical: 'danger' };
const STATUS_TONES = {
  open: 'danger', awaiting_evidence: 'warning', under_review: 'info',
  resolved: 'success', closed: 'neutral',
};

export default function DisputeDetail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { disputeId } = useParams();

  // Data.
  const {
    dispute, order, parties, mediaItems, messages, internalNotes, timeline,
    linkedReturn, noteDraft, isResolved, viewState, noteStatus, noteError, error,
  } = useSelector(selectDisputeDetail);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canResolve = grantedPermissions.includes('returns.dispute.resolve');

  const [reopening, setReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    dispatch(fetchDispute(disputeId));
    return () => dispatch(clearDisputeDetail());
  }, [dispatch, disputeId]);

  // Markup.
  if (viewState === 'loading') {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }
  if (viewState === 'error' || !dispute) {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchDispute(disputeId))} />;
  }

  return (
    <>
      <SplitReviewLayout
        header={
          <PageHeader
            eyebrow={t('trust.eyebrow')}
            title={dispute.subject}
            subtitle={t('trust.detailSubtitle', {
              type: t(`trust.disputeType.${dispute.type}`),
              order: dispute.orderId,
              when: formatRelativeTime(dispute.raisedAt),
            })}
            meta={
              <>
                <StatusPill tone={STATUS_TONES[dispute.status]}>
                  {t(`trust.disputeStatus.${dispute.status}`)}
                </StatusPill>
                <StatusPill tone={SEVERITY_TONES[dispute.severity]} size="sm">
                  {t(`logistics.severity.${dispute.severity}`)}
                </StatusPill>
                {dispute.autoRaised ? (
                  <Badge tone="outline">{t('trust.autoRaised')}</Badge>
                ) : null}
              </>
            }
            actions={
              isResolved ? (
                canResolve ? (
                  <Button variant="secondary" onClick={() => setReopening(true)}>
                    {t('trust.reopenDispute')}
                  </Button>
                ) : null
              ) : canResolve ? (
                <Button onClick={() => navigate(`/trust/disputes/${dispute.id}/resolution`)}>
                  {t('trust.recordResolution')}
                </Button>
              ) : null
            }
          />
        }
        // Packing video, unboxing video, photos and documents together. A
        // reviewer deciding who pays should not be opening four tabs to do it.
        media={
          <div className="flex flex-col gap-6">
            <MediaViewer items={mediaItems} onDownload={() => {}} />
            <MessageHistory
              messages={messages}
              internalNotes={internalNotes}
              jewellerName={dispute.jewellerName}
            />
          </div>
        }
        decisionTitle={t('trust.partiesCard')}
        decision={
          <div className="flex flex-col gap-field">
            {linkedReturn ? (
              <Link
                to="/returns"
                className="flex items-start gap-2 rounded border border-info/30 bg-info-surface px-3 py-2.5 text-sm text-info"
              >
                <Scale size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {t('trust.linkedReturnLabel', { id: linkedReturn })}
              </Link>
            ) : null}

            <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
              <MetaRow label={t('trust.raisedBy')} value={dispute.raisedByName} />
              <MetaRow label={t('trust.against')} value={t(`trust.party.${dispute.againstParty}`)} />
              <MetaRow label={t('trust.columnValue')} value={formatINR(dispute.claimValue)} />
              <MetaRow label={t('trust.dueIn', { when: '' }).trim()} value={formatDateTime(dispute.slaDueAt)} />
              <MetaRow label={t('trust.columnOwner')} value={dispute.assigneeName ?? t('logistics.unassigned')} />
            </dl>

            <Card title={t('trust.orderCard')} className="shadow-none">
              <dl className="flex flex-col gap-2 text-sm">
                <MetaRow label={t('trust.party.jeweller')} value={parties?.jeweller?.businessName} />
                <MetaRow label={t('trust.party.manufacturer')} value={parties?.manufacturer?.businessName} />
                <MetaRow label={t('common.createdAt')} value={formatDateTime(order?.placedAt)} />
                <MetaRow label={t('price.total')} value={formatINR(order?.total)} />
              </dl>
            </Card>

            <Timeline events={timeline} />

            {!isResolved ? (
              <NoteComposer
                draft={noteDraft}
                status={noteStatus}
                error={noteError}
                onChange={(patch) => dispatch(setNoteDraft(patch))}
                onPost={() => dispatch(addDisputeNote({
                  id: dispute.id, note: noteDraft.note, internal: noteDraft.internal,
                }))}
              />
            ) : null}
          </div>
        }
        footer={
          isResolved ? (
            <p className="text-sm text-success">{t('trust.resolvedTitle')}</p>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/trust/disputes')}>
                {t('common.back')}
              </Button>
              {canResolve ? (
                <Button onClick={() => navigate(`/trust/disputes/${dispute.id}/resolution`)}>
                  {t('trust.recordResolution')}
                </Button>
              ) : null}
            </div>
          )
        }
      />

      <ConfirmDialog
        open={reopening}
        onClose={() => setReopening(false)}
        onConfirm={async () => {
          await dispatch(reopenDispute({ id: dispute.id, reason: reopenReason }));
          setReopening(false);
        }}
        tone="primary"
        title={t('trust.reopenTitle')}
        body={t('trust.reopenBody')}
        confirmLabel={t('trust.reopenDispute')}
      >
        <Textarea
          id="reopen-reason" className="mt-4" rows={3} required
          label={t('trust.reopenReason')}
          value={reopenReason} onChange={(event) => setReopenReason(event.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-charcoal-light">{label}</dt>
      <dd className="text-right text-charcoal">{value ?? t('common.notAvailable')}</dd>
    </div>
  );
}

// Both parties see these, except the internal notes, which are separated here
// rather than mixed in and styled differently - a reviewer skim-reading must
// not mistake an internal note for something the member has already been told.
function MessageHistory({ messages, internalNotes, jewellerName }) {
  return (
    <Card title={t('trust.messagesCard')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {messages.map((message) => (
          <li key={message.id} className="flex flex-col gap-1 px-5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-body text-base font-medium text-charcoal">
                {message.authorName}
                <Badge tone="outline" className="ml-2">
                  {t(`trust.party.${message.authorParty}`)}
                </Badge>
              </span>
              <span className="text-xs text-charcoal-light">{formatDateTime(message.at)}</span>
            </div>
            <p className="text-base text-charcoal-light">{message.body}</p>
          </li>
        ))}
      </ul>

      {internalNotes.length > 0 ? (
        <div className="border-t border-lightGray-dark bg-lightGray px-5 py-3">
          <p className="mb-2 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-light">
            <Lock size={12} aria-hidden="true" />
            {t('trust.internalNotesCard')}
          </p>
          <ul className="flex flex-col gap-2">
            {internalNotes.map((note) => (
              <li key={note.id} className="text-sm text-charcoal">
                <span className="text-charcoal-light">{note.authorName} · {formatDateTime(note.at)}</span>
                <span className="block">{note.body}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function Timeline({ events }) {
  return (
    <div>
      <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-lighter">
        {t('common.history')}
      </p>
      <ol className="flex flex-col gap-2">
        {events.filter((event) => event.at).map((event) => (
          <li key={`${event.at}-${event.label}`} className="flex items-baseline gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-charcoal">{event.label}</span>
            <span className="ml-auto shrink-0 text-xs text-charcoal-light">
              {formatRelativeTime(event.at)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function NoteComposer({ draft, status, error, onChange, onPost }) {
  return (
    <div className="flex flex-col gap-2 border-t border-lightGray-dark pt-4">
      <Textarea
        id="note" rows={3}
        label={t('trust.addNote')}
        placeholder={t('trust.notePlaceholder')}
        value={draft.note}
        error={error?.message}
        onChange={(event) => onChange({ note: event.target.value })}
      />
      <Checkbox
        id="internal"
        label={t('trust.internalOnly')}
        help={t('trust.internalNoteHelp')}
        checked={draft.internal}
        onChange={(event) => onChange({ internal: event.target.checked })}
      />
      <Button
        size="sm" className="self-end"
        disabled={!draft.note.trim()}
        loading={status === 'loading'}
        onClick={onPost}
      >
        {t('trust.postNote')}
      </Button>
    </div>
  );
}
