// ADM-067
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Scale } from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, EmptyState, ErrorState, Input,
  PageHeader, Select, Spinner, StatusPill, Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearResolutionDraft, fetchDispute, fetchOutcomes, fetchResolutions,
  previewResolution, recordResolution, selectResolutionForm, setResolutionField,
} from '@/store/slices/trustSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatINR } from '@/utils/format';
import { t } from '@/i18n/en';

const LIABLE_TONES = {
  manufacturer: 'warning', jeweller: 'info', carrier: 'accent', elanzia: 'danger',
};

export default function ResolutionRecording() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { disputeId } = useParams();

  // Data.
  const {
    dispute, outcomeOptions, selectedOutcome, draft, preview, previewStatus,
    previewError, recorded, history, historyViewState, needsAmount, canRecord,
    viewState, saveStatus, saveError,
  } = useSelector(selectResolutionForm);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canResolve = grantedPermissions.includes('returns.dispute.resolve');

  useEffect(() => {
    dispatch(fetchOutcomes());
    dispatch(fetchResolutions());
    dispatch(fetchDispute(disputeId));
    return () => dispatch(clearResolutionDraft());
  }, [dispatch, disputeId]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setResolutionField({ field, value: event.target.value }));

  const handleRecord = async () => {
    const result = await dispatch(recordResolution({
      id: disputeId,
      outcome: draft.outcome,
      refundAmount: draft.refundAmount,
      creditAmount: draft.creditAmount,
      note: draft.note,
      notifyParties: draft.notifyParties,
    }));
    if (!result.error) navigate(`/trust/disputes/${disputeId}`);
  };

  // Markup.
  if (viewState === 'loading') {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('trust.eyebrow')}
        title={t('trust.resolutionTitle')}
        subtitle={t('trust.resolutionSubtitle')}
        meta={dispute ? <StatusPill tone="neutral">{dispute.id} · {formatINR(dispute.claimValue)}</StatusPill> : null}
      />

      {recorded ? (
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success-surface px-4 py-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-body text-base font-semibold text-success">{t('trust.resolutionSaved')}</p>
            <p className="text-sm text-charcoal-light">
              {t('trust.resolvedBody', {
                outcome: recorded.outcomeLabel,
                liable: t(`trust.party.${recorded.liableParty}`),
              })}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={t('trust.outcomeCard')}>
            <div className="flex flex-col gap-field">
              <Select
                id="outcome" label={t('trust.outcome')} required
                placeholder={t('common.none')}
                disabled={!canResolve}
                value={draft.outcome} onChange={setField('outcome')}
                options={outcomeOptions}
              />

              {selectedOutcome ? (
                <div className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3">
                  <p className="text-sm text-charcoal-light">{selectedOutcome.description}</p>
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-charcoal-light">{t('trust.liableParty')}</span>
                    <StatusPill tone={LIABLE_TONES[selectedOutcome.liableParty]} size="sm">
                      {t(`trust.party.${selectedOutcome.liableParty}`)}
                    </StatusPill>
                  </p>
                  {selectedOutcome.opensInsuranceClaim ? (
                    <p className="text-sm text-info">{t('trust.opensClaim')}</p>
                  ) : null}
                  {selectedOutcome.issuesReplacement ? (
                    <p className="text-sm text-info">{t('trust.issuesReplacement')}</p>
                  ) : null}
                </div>
              ) : null}

              {needsAmount ? (
                <div className="grid grid-cols-1 gap-field sm:grid-cols-2">
                  <Input
                    id="refund" type="number" label={t('trust.refundAmountLabel')}
                    disabled={!canResolve || !selectedOutcome?.refundsJeweller}
                    value={draft.refundAmount} onChange={setField('refundAmount')}
                  />
                  <Input
                    id="credit" type="number" label={t('trust.creditAmountLabel')}
                    disabled={!canResolve || !selectedOutcome?.issuesCredit}
                    value={draft.creditAmount} onChange={setField('creditAmount')}
                  />
                </div>
              ) : null}

              <Textarea
                id="note" rows={4} required
                label={t('trust.resolutionNote')}
                help={t('trust.resolutionNoteHelp')}
                disabled={!canResolve}
                value={draft.note} onChange={setField('note')}
              />

              <Checkbox
                id="notify" label={t('trust.notifyParties')}
                checked={draft.notifyParties}
                disabled={!canResolve}
                onChange={(event) => dispatch(setResolutionField({ field: 'notifyParties', value: event.target.checked }))}
              />

              {saveError ? <p className="text-sm text-danger">{saveError.message}</p> : null}
            </div>
          </Card>

          <ResolutionHistory history={history} viewState={historyViewState} />
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PreviewPanel
            preview={preview}
            status={previewStatus}
            error={previewError}
            canPreview={Boolean(draft.outcome)}
            onPreview={() => dispatch(previewResolution({
              id: disputeId,
              outcome: draft.outcome,
              refundAmount: draft.refundAmount,
              creditAmount: draft.creditAmount,
            }))}
          />
        </aside>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-3">
          {needsAmount && !canRecord ? (
            <p className="mr-auto text-sm text-charcoal-light">{t('trust.amountRequired')}</p>
          ) : null}
          <Button variant="secondary" onClick={() => navigate(`/trust/disputes/${disputeId}`)}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!canResolve || !canRecord}
            loading={saveStatus === 'loading'}
            onClick={handleRecord}
          >
            {t('trust.saveResolution')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Where the money lands. The figures always balance: refund plus credit
// equals what the manufacturer repays plus what the platform carries.
function PreviewPanel({ preview, status, error, canPreview, onPreview }) {
  return (
    <Card
      title={t('trust.previewCard')}
      action={
        <Button size="sm" variant="secondary" disabled={!canPreview} loading={status === 'loading'} onClick={onPreview}>
          {t('trust.runPreview')}
        </Button>
      }
    >
      {error ? (
        <ErrorState detail={error.message} onRetry={onPreview} />
      ) : !preview ? (
        <EmptyState icon={Scale} title={t('trust.previewCard')} body={t('trust.previewEmpty')} />
      ) : (
        <dl className="flex flex-col gap-2.5">
          <Line label={t('trust.previewRefund')} value={preview.refundAmount} />
          <Line label={t('trust.previewCredit')} value={preview.creditAmount} />
          <Line label={t('trust.previewCommission')} value={preview.commissionReversed} muted />
          <div className="my-1 border-t border-lightGray" />
          <Line label={t('trust.previewRecovery')} value={preview.manufacturerRecovery} />
          <Line label={t('trust.previewAbsorbs')} value={preview.elanziaAbsorbs} emphasis />

          <p className="mt-2 text-xs text-charcoal-light">{preview.settlementImpact}</p>
          <p className="text-xs text-charcoal-lighter">{t('trust.previewBalances')}</p>
        </dl>
      )}
    </Card>
  );
}

function Line({ label, value, muted = false, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={`text-sm ${muted ? 'text-charcoal-lighter' : 'text-charcoal-light'}`}>{label}</dt>
      <dd className={`num text-base ${emphasis ? 'font-semibold text-primary' : 'text-charcoal'}`}>
        {formatINR(value)}
      </dd>
    </div>
  );
}

function ResolutionHistory({ history, viewState }) {
  return (
    <Card title={t('trust.historyCard')} description={t('trust.historyHelp')} padded={false}>
      {viewState === 'loading' ? (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      ) : history.length === 0 ? (
        <EmptyState />
      ) : (
        <TableShell className="rounded-none border-0 shadow-none" maxHeight="20rem">
          <TableShell.Head>
            <TableShell.HeadCell>{t('trust.columnOutcome')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('trust.columnLiable')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('trust.previewRefund')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('trust.previewAbsorbs')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('trust.columnRecorded')}</TableShell.HeadCell>
          </TableShell.Head>
          <TableShell.Body>
            {history.map((row) => (
              <TableShell.Row key={row.id}>
                <TableShell.Cell>
                  <span className="text-charcoal">{row.outcomeLabel}</span>
                  <span className="block font-mono text-xs text-charcoal-light">{row.disputeId}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <Badge tone="outline">{t(`trust.party.${row.liableParty}`)}</Badge>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatINR(row.refundAmount)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatINR(row.elanziaAbsorbs)}</TableShell.Cell>
                <TableShell.Cell>{formatDate(row.recordedAt)}</TableShell.Cell>
              </TableShell.Row>
            ))}
          </TableShell.Body>
        </TableShell>
      )}
    </Card>
  );
}
