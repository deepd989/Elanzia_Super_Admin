// ADM-088
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowUpRight, Lock, PauseCircle } from 'lucide-react';
import {
  Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState,
  PageHeader, Select, Spinner, StatusPill, Textarea,
} from '@/components/primitives';
import { MediaViewer, SplitReviewLayout } from '@/components';
import {
  clearTicketDetail, escalateTicket, fetchTicket, replyToTicket, selectTicketWorkspace,
  setEscalationDraft, setReplyDraft, updateTicketStatus,
} from '@/store/slices/supportSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatDateTime, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  new: 'info', open: 'info', awaiting_member: 'neutral', escalated: 'warning',
  resolved: 'success', closed: 'neutral', reopened: 'warning',
};

const NEXT_STATUSES = ['open', 'awaiting_member'];

export default function TicketWorkspace() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { ticketId } = useParams();

  // Data.
  const {
    ticket, member, linkedOrder, thread, mediaItems, relatedTickets, replyDraft,
    escalationDraft, escalationQueueOptions, isClosed, canReply, canEscalate, canResolve,
    canSendReply, canEscalateNow, viewState, replyStatus, replyError,
    actionStatus, actionError, error,
  } = useSelector(selectTicketWorkspace);
  const { grantedPermissions } = useSelector(selectShellSession);
  const mayRespond = grantedPermissions.includes('support.respond');
  const mayEscalate = grantedPermissions.includes('support.escalate');

  const [confirming, setConfirming] = useState(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    dispatch(fetchTicket(ticketId));
    return () => dispatch(clearTicketDetail());
  }, [dispatch, ticketId]);

  // Handlers.
  const handleReply = () => dispatch(replyToTicket({ ticketId, ...replyDraft }));

  const handleResolve = async () => {
    const result = await dispatch(updateTicketStatus({ ticketId, status: 'resolved', note: resolveNote }));
    if (!result.error) { setConfirming(null); setResolveNote(''); }
  };

  const handleEscalate = async () => {
    const result = await dispatch(escalateTicket({ ticketId, ...escalationDraft }));
    if (!result.error) setConfirming(null);
  };

  if (viewState === 'loading') return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchTicket(ticketId))} />;
  }
  if (viewState === 'empty') {
    return (
      <EmptyState
        title={t('support.notFoundTitle')} body={t('support.notFoundBody')}
        actionLabel={t('common.back')} onAction={() => navigate('/support/tickets')}
      />
    );
  }

  // Markup.
  return (
    <>
      <SplitReviewLayout
        header={
          <PageHeader
            eyebrow={t('support.eyebrow')}
            title={ticket.subject}
            subtitle={t('support.workspaceSubtitle', {
              member: ticket.memberName,
              city: ticket.memberCity,
              raised: formatRelativeTime(ticket.createdAt),
            })}
            meta={
              <>
                <StatusPill tone={STATUS_TONES[ticket.status]}>
                  {t(`support.ticketStatus.${ticket.status}`)}
                </StatusPill>
                {!ticket.clockRunning && ticket.status === 'awaiting_member' ? (
                  <StatusPill tone="neutral" size="sm">{t('support.clockStopped')}</StatusPill>
                ) : null}
              </>
            }
            actions={
              canEscalate && mayEscalate ? (
                <Button variant="secondary" iconLeft={ArrowUpRight} onClick={() => setConfirming('escalate')}>
                  {t('support.escalate')}
                </Button>
              ) : null
            }
          />
        }
        media={
          <div className="flex flex-col gap-6">
            <Card title={t('support.conversation')} padded={false}>
              <ol className="divide-y divide-lightGray">
                {thread.map((message) => <Message key={message.id} message={message} />)}
              </ol>
            </Card>
            {mediaItems.length > 0 ? <MediaViewer items={mediaItems} /> : null}
            <RelatedTickets tickets={relatedTickets} onOpen={(id) => navigate(`/support/tickets/${id}`)} />
          </div>
        }
        decisionTitle={t('support.replyTitle')}
        decision={
          <div className="flex flex-col gap-field">
            <SlaPanel ticket={ticket} />
            <MemberPanel member={member} linkedOrder={linkedOrder} />

            {canReply && mayRespond ? (
              <>
                <Textarea
                  id="reply" rows={6}
                  label={t('support.replyTitle')}
                  placeholder={t('support.replyPlaceholder')}
                  error={replyError?.message}
                  value={replyDraft.body}
                  onChange={(event) => dispatch(setReplyDraft({ body: event.target.value }))}
                />
                {/* A note never counts as a first response. Said next to the
                    box, because that is where the decision is made. */}
                <Checkbox
                  id="internal"
                  label={t('support.internalNote')}
                  help={t('support.internalNoteHelp')}
                  checked={replyDraft.internal}
                  onChange={(event) => dispatch(setReplyDraft({ internal: event.target.checked }))}
                />
                <Select
                  id="next-status" label={t('support.nextStatus')}
                  placeholder={t('support.keepStatus')}
                  disabled={replyDraft.internal}
                  value={replyDraft.nextStatus}
                  onChange={(event) => dispatch(setReplyDraft({ nextStatus: event.target.value }))}
                  options={NEXT_STATUSES.map((value) => ({ value, label: t(`support.ticketStatus.${value}`) }))}
                />
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-lightGray-dark bg-lightGray px-4 py-3">
                <Lock size={16} className="mt-0.5 shrink-0 text-charcoal-light" aria-hidden="true" />
                <p className="text-sm text-charcoal-light">{t('support.closedNoReply')}</p>
              </div>
            )}
          </div>
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
            {isClosed ? (
              <Button
                variant="secondary" loading={actionStatus === 'loading'}
                onClick={() => dispatch(updateTicketStatus({ ticketId, status: 'reopened' }))}
              >
                {t('support.reopenTicket')}
              </Button>
            ) : null}
            {canResolve && mayRespond ? (
              <Button variant="secondary" onClick={() => setConfirming('resolve')}>
                {t('support.resolveTicket')}
              </Button>
            ) : null}
            <Button disabled={!canSendReply || !mayRespond} loading={replyStatus === 'loading'} onClick={handleReply}>
              {t('support.sendReply')}
            </Button>
          </div>
        }
      />

      <ConfirmDialog
        open={confirming === 'resolve'}
        onClose={() => setConfirming(null)}
        onConfirm={handleResolve}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('support.resolveTitle')}
        body={t('support.resolveBody')}
        confirmLabel={t('support.resolveTicket')}
      >
        <Textarea
          id="resolve-note" rows={3} className="mt-4"
          label={t('support.resolveNote')} required
          value={resolveNote} error={actionError?.message}
          onChange={(event) => setResolveNote(event.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === 'escalate'}
        onClose={() => setConfirming(null)}
        onConfirm={handleEscalate}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('support.escalateTitle')}
        body={t('support.escalateBody', {
          queue: escalationDraft.queue ? t(`support.escalationQueue.${escalationDraft.queue}`) : '',
        })}
        confirmLabel={t('support.escalate')}
      >
        <div className="mt-4 flex flex-col gap-field">
          <p className="text-sm text-charcoal-light">{t('support.escalationOwnerNote')}</p>
          <Select
            id="escalate-queue" label={t('support.escalateQueue')} required
            placeholder={t('common.none')}
            value={escalationDraft.queue}
            onChange={(event) => dispatch(setEscalationDraft({ queue: event.target.value }))}
            options={escalationQueueOptions.map(({ value }) => ({
              value, label: t(`support.escalationQueue.${value}`),
            }))}
          />
          <Textarea
            id="escalate-reason" rows={3}
            label={t('support.escalateReason')} required
            value={escalationDraft.reason}
            onChange={(event) => dispatch(setEscalationDraft({ reason: event.target.value }))}
          />
          {!canEscalateNow ? <p className="text-sm text-charcoal-light">{t('validation.fixErrors')}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}

// Local sub-components. They repeat enough within this screen to be worth
// naming, and not enough across screens to be worth sharing.

function Message({ message }) {
  return (
    <li className={`px-5 py-4 ${message.internal ? 'bg-warning-surface' : ''}`}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-charcoal">
          {message.authorName}
          <span className="ml-2 text-xs font-normal text-charcoal-light">
            {t(`support.authorType.${message.authorType}`)}
          </span>
        </span>
        <span className="shrink-0 text-xs text-charcoal-light">{formatDateTime(message.at)}</span>
      </div>
      {message.internal ? (
        <p className="mt-1 text-xs font-medium text-warning">{t('support.internalNotesLabel')}</p>
      ) : null}
      <p className="mt-1.5 whitespace-pre-wrap text-base text-charcoal">{message.body}</p>
    </li>
  );
}

function SlaPanel({ ticket }) {
  return (
    <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
      <MetaRow
        label={t('support.slaFirstResponse')}
        value={ticket.firstResponseAt ? formatDateTime(ticket.firstResponseAt) : t('common.none')}
        tone={ticket.firstResponseBreached ? 'danger' : null}
      />
      <MetaRow
        label={t('support.slaResolution')}
        value={t('support.slaTarget', { target: `${ticket.slaResolutionHours}h` })}
        tone={ticket.clockRunning && ticket.resolutionBreached ? 'danger' : null}
      />
      {ticket.awaitingMemberMins > 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-charcoal-light">
          <PauseCircle size={12} aria-hidden="true" />
          {t('support.slaClockStopped', { time: `${Math.round(ticket.awaitingMemberMins / 60)}h` })}
        </div>
      ) : null}
    </dl>
  );
}

function MemberPanel({ member, linkedOrder }) {
  return (
    <dl className="flex flex-col gap-2 rounded border border-lightGray-dark p-3 text-sm">
      <MetaRow label={t('support.memberPanel')} value={member.businessName} />
      <MetaRow label={t('support.memberSince')} value={formatDate(member.memberSince)} />
      <MetaRow label={t('support.openTicketsCount')} value={member.openTickets} />
      {linkedOrder ? (
        <>
          <MetaRow label={t('support.linkedOrder')} value={linkedOrder.id} mono />
          <MetaRow label={t('common.summary')} value={formatINR(linkedOrder.total)} />
          {/* A refund never reads as processed before the goods came back.
              Support reads this state and has no way to set it. */}
          {linkedOrder.returnStatus && !linkedOrder.refundShown ? (
            <div className="text-xs text-warning">
              <p className="font-medium">{t('support.refundPending')}</p>
              <p className="text-charcoal-light">{t('support.refundPendingHelp')}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-charcoal-light">{t('support.noLinkedOrder')}</p>
      )}
    </dl>
  );
}

function RelatedTickets({ tickets, onOpen }) {
  if (tickets.length === 0) return null;

  return (
    <Card title={t('support.relatedTickets')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onOpen(ticket.id)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-lightGray"
            >
              <span className="min-w-0 flex-1 text-base text-charcoal">{ticket.subject}</span>
              <StatusPill tone={STATUS_TONES[ticket.status]} size="sm">
                {t(`support.ticketStatus.${ticket.status}`)}
              </StatusPill>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MetaRow({ label, value, mono = false, tone = null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd className={`text-right text-base ${tone === 'danger' ? 'text-danger' : 'text-charcoal'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
