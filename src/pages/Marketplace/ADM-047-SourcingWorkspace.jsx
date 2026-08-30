// ADM-047
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Inbox, Send, Star } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { MediaViewer, PriceBreakup } from '@/components';
import {
  fetchSourcingRequest,
  recordSourcingOutcome,
  routeSourcingRequest,
  selectSourcingWorkspace,
  shortlistSourcingResponse,
} from '@/store/slices/marketplaceSlice';
import {
  formatDate,
  formatGrams,
  formatINR,
  formatNumber,
  formatPercent,
  formatPurity,
  formatRelativeTime,
} from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  new: 'warning',
  routed: 'info',
  responses_in: 'info',
  matched: 'success',
  no_match: 'danger',
  withdrawn: 'neutral',
  expired: 'neutral',
};

const OUTCOME_OPTIONS = [
  { value: 'matched', label: t('marketplace.outcomeMatched') },
  { value: 'no_match', label: t('marketplace.outcomeNoMatch') },
];

const OPEN_STATUSES = ['new', 'routed', 'responses_in'];

export default function SourcingWorkspace() {
  const { requestId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    request,
    responses,
    suggestions,
    jeweller,
    viewState,
    actionStatus,
    actionError,
    quotedCount,
    awaitingCount,
    matchableManufacturers,
    overBudgetCount,
  } = useSelector(selectSourcingWorkspace);

  useEffect(() => {
    dispatch(fetchSourcingRequest(requestId));
  }, [dispatch, requestId]);

  if (viewState === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState onRetry={() => dispatch(fetchSourcingRequest(requestId))} />;
  }
  if (viewState === 'empty' || !request) {
    return (
      <EmptyState
        title={t('marketplace.notFoundTitle')}
        body={t('marketplace.notFoundBody')}
        actionLabel={t('common.back')}
        onAction={() => navigate('/marketplace/sourcing')}
      />
    );
  }

  const isOpen = OPEN_STATUSES.includes(request.status);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('marketplace.workspaceTitle')}
        title={request.title}
        subtitle={
          request.originSearchTerm
            ? t('marketplace.fromSearch', { term: request.originSearchTerm })
            : `${request.id} · ${jeweller?.businessName ?? t('marketplace.aggregateDemand')}`
        }
        meta={
          <StatusPill
            tone={STATUS_TONES[request.status]}
            label={t(`marketplace.sourcingStatus.${request.status}`)}
          />
        }
        actions={
          <Button variant="secondary" iconLeft={ArrowLeft} onClick={() => navigate('/marketplace/sourcing')}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title={t('marketplace.requirement')}>
            <p className="text-base text-charcoal">{request.brief}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Fact label={t('units.purity')} value={formatPurity(request.purity)} />
              <Fact label={t('units.net')} value={formatGrams(request.targetWeightGrams)} />
              <Fact label={t('common.selected')} value={formatNumber(request.quantity)} />
              <Fact label={t('marketplace.targetBudget')} value={formatINR(request.targetUnitBudget)} />
            </dl>
          </Card>

          {request.media.length > 0 ? (
            <Card title={t('marketplace.referenceImages')} padded={false}>
              <MediaViewer items={request.media} className="border-0 shadow-none" />
            </Card>
          ) : null}

          <Responses
            responses={responses}
            request={request}
            actionStatus={actionStatus}
            overBudgetCount={overBudgetCount}
            onShortlist={(response) =>
              dispatch(
                shortlistSourcingResponse({
                  requestId: request.id,
                  responseId: response.id,
                  shortlisted: !response.shortlisted,
                }),
              )
            }
          />

          {isOpen ? (
            <RoutePanel
              request={request}
              suggestions={suggestions}
              actionStatus={actionStatus}
              actionError={actionError}
            />
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-6">
            <Card title={t('common.details')}>
              <dl className="flex flex-col gap-3">
                <Fact label={t('marketplace.column.posted')} value={formatDate(request.postedAt)} inline />
                <Fact label={t('marketplace.column.needed')} value={formatDate(request.neededBy)} inline />
                <Fact label={t('marketplace.column.owner')} value={request.ownerName ?? '-'} inline />
                <Fact
                  label={t('marketplace.indicativeValue')}
                  value={formatINR(request.indicativeUnitValue)}
                  inline
                />
                <Fact
                  label={t('marketplace.column.routed')}
                  value={formatNumber(request.routedCount)}
                  inline
                />
                <Fact label={t('marketplace.canMake')} value={formatNumber(quotedCount)} inline />
                <Fact label={t('marketplace.noResponse')} value={formatNumber(awaitingCount)} inline />
                {jeweller ? (
                  <Fact label={t('marketplace.column.jeweller')} value={jeweller.businessName} inline />
                ) : null}
              </dl>
            </Card>

            {isOpen ? (
              <CloseBrief
                request={request}
                matchable={matchableManufacturers}
                actionStatus={actionStatus}
                actionError={actionError}
              />
            ) : (
              <Card title={t('marketplace.outcome')}>
                <p className="text-base text-charcoal">
                  {request.matchedManufacturerName ?? t(`marketplace.sourcingStatus.${request.status}`)}
                </p>
                <p className="mt-2 text-sm text-charcoal-light">
                  {t('marketplace.briefClosed', { when: formatRelativeTime(request.closedAt) })}
                </p>
                {request.closeNote ? (
                  <p className="mt-2 text-sm text-charcoal">{request.closeNote}</p>
                ) : null}
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Local sub-components, same file.
function Responses({ responses, request, actionStatus, overBudgetCount, onShortlist }) {
  if (responses.length === 0) {
    return (
      <Card title={t('marketplace.responsesTitle')}>
        <EmptyState
          icon={Inbox}
          title={t('marketplace.noResponsesYet')}
          body={t('marketplace.noResponsesYetBody')}
        />
      </Card>
    );
  }

  return (
    <Card
      title={t('marketplace.responsesTitle')}
      description={t('marketplace.responsesCaption')}
      action={
        overBudgetCount > 0 ? (
          <Badge tone="warning">{t('marketplace.overBudgetCount', { count: overBudgetCount })}</Badge>
        ) : null
      }
      padded={false}
    >
      <ul className="divide-y divide-lightGray">
        {responses.map((response) => (
          <li key={response.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-medium text-charcoal">{response.manufacturerName}</p>
                <p className="text-xs text-charcoal-light">
                  {response.city}
                  {response.respondedAt ? ` · ${formatRelativeTime(response.respondedAt)}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* A quote above what the jeweller said they would pay is the
                    commonest reason a brief ends in no match. */}
                {response.canMake && response.quotedUnitPrice > request.targetUnitBudget ? (
                  <Badge tone="warning">{t('marketplace.overBudget')}</Badge>
                ) : null}
                <StatusPill
                  tone={response.canMake ? 'success' : response.status === 'declined' ? 'danger' : 'neutral'}
                  label={
                    response.canMake
                      ? t('marketplace.canMake')
                      : response.status === 'declined'
                        ? t('marketplace.declined')
                        : t('marketplace.noResponse')
                  }
                />
                {response.canMake ? (
                  <Button
                    size="sm"
                    variant={response.shortlisted ? 'secondary' : 'ghost'}
                    iconLeft={Star}
                    loading={actionStatus === 'loading'}
                    onClick={() => onShortlist(response)}
                  >
                    {response.shortlisted ? t('marketplace.removeShortlist') : t('marketplace.shortlist')}
                  </Button>
                ) : null}
              </div>
            </div>

            {response.declineReason ? (
              <p className="mt-2 text-sm text-charcoal-light">{response.declineReason}</p>
            ) : null}

            {response.canMake ? (
              <div className="mt-3">
                <p className="mb-2 text-sm text-charcoal">
                  {response.notes}
                  <span className="block text-xs text-charcoal-light">
                    {t('marketplace.thread.leadTime', { days: response.leadTimeDays })} ·{' '}
                    {formatINR(response.quotedTotal)}
                  </span>
                </p>
                <PriceBreakup breakup={response.price} dense />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RoutePanel({ request, suggestions, actionStatus, actionError }) {
  const dispatch = useDispatch();
  const [selected, setSelected] = useState([]);
  const [briefNote, setBriefNote] = useState('');

  const toggle = (id) =>
    setSelected(selected.includes(id) ? selected.filter((row) => row !== id) : [...selected, id]);

  const handleRoute = async () => {
    const result = await dispatch(
      routeSourcingRequest({ requestId: request.id, manufacturerIds: selected, briefNote }),
    );
    if (!result.error) {
      setSelected([]);
      setBriefNote('');
    }
  };

  return (
    <Card title={t('marketplace.routeTitle')} description={t('marketplace.routeDescription')}>
      {suggestions.length === 0 ? (
        <p className="text-base text-charcoal-light">{t('marketplace.noSuggestions')}</p>
      ) : (
        <div className="flex flex-col gap-field">
          <ul className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.manufacturerId}
                className="flex items-start justify-between gap-3 rounded border border-lightGray-dark p-3"
              >
                <Checkbox
                  id={`route-${suggestion.manufacturerId}`}
                  label={suggestion.manufacturerName}
                  checked={selected.includes(suggestion.manufacturerId)}
                  onChange={() => toggle(suggestion.manufacturerId)}
                />
                <div className="flex shrink-0 items-center gap-2">
                  {suggestion.purityMatch ? (
                    <Badge tone="success">
                      {t('marketplace.purityMatch', { purity: formatPurity(request.purity) })}
                    </Badge>
                  ) : null}
                  <Badge tone="neutral">
                    {t('marketplace.onTimeDispatch', {
                      value: formatPercent(suggestion.onTimeDispatchPercent ?? 0),
                    })}
                  </Badge>
                  <Badge tone="accent">{t('marketplace.matchScore', { score: suggestion.matchScore })}</Badge>
                </div>
              </li>
            ))}
          </ul>

          <Textarea
            id="brief-note"
            rows={3}
            label={t('marketplace.routeTitle')}
            value={briefNote}
            onChange={(event) => setBriefNote(event.target.value)}
          />

          <div className="flex items-center justify-end gap-2">
            {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
            <Button
              iconLeft={Send}
              disabled={selected.length === 0}
              loading={actionStatus === 'loading'}
              onClick={handleRoute}
            >
              {t('marketplace.routeSelected', { count: selected.length })}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CloseBrief({ request, matchable, actionStatus, actionError }) {
  const dispatch = useDispatch();
  const [outcome, setOutcome] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [note, setNote] = useState('');

  // A match must name a workshop that actually quoted, and a no_match must say
  // what was tried - the next brief for the same thing is worked from it.
  const canSubmit =
    (outcome === 'matched' && manufacturerId !== '') || (outcome === 'no_match' && note.trim().length > 0);

  return (
    <Card title={t('marketplace.closeBrief')}>
      <div className="flex flex-col gap-field">
        <Select
          id="outcome"
          label={t('marketplace.outcome')}
          required
          placeholder={t('marketplace.decision.choose')}
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
          options={OUTCOME_OPTIONS}
        />

        {outcome === 'matched' ? (
          <Select
            id="matched-manufacturer"
            label={t('marketplace.matchedTo')}
            required
            placeholder={t('marketplace.decision.choose')}
            value={manufacturerId}
            onChange={(event) => setManufacturerId(event.target.value)}
            options={matchable}
          />
        ) : null}

        <Textarea
          id="close-note"
          rows={4}
          label={t('marketplace.closeNote')}
          required={outcome === 'no_match'}
          help={t('marketplace.closeNoteHelp')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

        <Button
          disabled={!canSubmit}
          loading={actionStatus === 'loading'}
          onClick={() =>
            dispatch(
              recordSourcingOutcome({
                requestId: request.id,
                outcome,
                manufacturerId: outcome === 'matched' ? manufacturerId : null,
                note,
              }),
            )
          }
        >
          {t('marketplace.recordOutcome')}
        </Button>
      </div>
    </Card>
  );
}

function Fact({ label, value, inline = false }) {
  if (inline) {
    return (
      <div className="flex items-baseline justify-between gap-4">
        <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
        <dd className="text-right text-base text-charcoal">{value}</dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-charcoal-light">{label}</dt>
      <dd className="mt-0.5 text-base text-charcoal">{value}</dd>
    </div>
  );
}
