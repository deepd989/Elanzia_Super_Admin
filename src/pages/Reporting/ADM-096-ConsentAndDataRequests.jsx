// ADM-096
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, CheckCircle2, Clock, Inbox, Search } from 'lucide-react';
import {
  Button, Checkbox, EmptyState, ErrorState, Input, Modal, PageHeader,
  Select, StatusPill, Tabs, Textarea,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearConsentFilters,
  clearDataRequestFilters,
  fetchConsents,
  fetchDataRequestSummary,
  fetchDataRequests,
  openDataRequest,
  selectDataRequestQueue,
  setConsentFilters,
  setConsentPage,
  setConsentPageSize,
  setConsentSearch,
  setDataRequestFilters,
  setDataRequestPage,
  setDataRequestPageSize,
  setDataRequestSearch,
  setDecisionDraft,
  submitDataRequestDecision,
} from '@/store/slices/reportingSlice';
import { formatDate, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SLA_TONES = { on_track: 'success', due_soon: 'warning', breached: 'danger', closed: 'neutral' };
const REQUEST_STATUS_TONES = {
  received: 'info',
  identity_pending: 'warning',
  in_progress: 'info',
  fulfilled: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
};
const CONSENT_TONES = { granted: 'success', withdrawn: 'danger', never_given: 'neutral' };

const DECISION_OPTIONS = [
  { value: 'fulfil', label: t('platform.outcome.fulfil') },
  { value: 'reject', label: t('platform.outcome.reject') },
  { value: 'request_identity', label: t('platform.outcome.request_identity') },
];

const REQUEST_COLUMNS = 6;
const CONSENT_COLUMNS = 6;

export default function ConsentAndDataRequests() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('requests');

  // Data. ONE selector - this is the seam.
  const {
    requests, total, query, facets, responseDays, summary, viewState, error,
    openRequest, decisionDraft, canDecide, actionStatus, actionError,
    consents, consentTotal, consentQuery, consentFacets, consentViewState, consentError,
  } = useSelector(selectDataRequestQueue);

  useEffect(() => {
    dispatch(fetchDataRequests());
    dispatch(fetchDataRequestSummary());
  }, [dispatch, query]);

  useEffect(() => {
    dispatch(fetchConsents());
  }, [dispatch, consentQuery]);

  // Handlers.
  const handleDecision = () =>
    dispatch(submitDataRequestDecision({ requestId: openRequest.id, ...decisionDraft }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('platform.eyebrow')}
        title={t('platform.privacyTitle')}
        subtitle={t('platform.privacySubtitle')}
        meta={
          summary?.breached > 0 ? (
            <StatusPill tone="danger">
              {t('platform.breachedCount')} {formatNumber(summary.breached)}
            </StatusPill>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('platform.openCount')} value={formatNumber(summary?.open)} icon={Inbox} loading={!summary} />
        <MetricTile label={t('platform.dueSoonCount')} value={formatNumber(summary?.dueSoon)} icon={Clock} loading={!summary} />
        {/* Up is unambiguously bad here, and the tile cannot guess that. */}
        <MetricTile
          label={t('platform.breachedCount')}
          value={formatNumber(summary?.breached)}
          icon={AlertTriangle}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('platform.medianResponseDays')}
          value={
            summary?.medianDaysToRespond === null
              ? t('common.notAvailable')
              : t('platform.daysShort', { days: formatNumber(summary?.medianDaysToRespond) })
          }
          icon={CheckCircle2}
          loading={!summary}
        />
      </div>

      {responseDays ? (
        <p className="text-sm text-charcoal-light">
          {t('platform.responseWindow', { days: formatNumber(responseDays) })}
        </p>
      ) : null}

      <Tabs
        activeId={tab}
        onChange={setTab}
        tabs={[
          { id: 'requests', label: t('platform.tabRequests'), count: total },
          { id: 'consents', label: t('platform.tabConsents'), count: consentTotal },
        ]}
      />

      {tab === 'requests' ? (
        <RequestsTab
          requests={requests}
          total={total}
          query={query}
          facets={facets}
          viewState={viewState}
          error={error}
          dispatch={dispatch}
        />
      ) : (
        <ConsentsTab
          consents={consents}
          total={consentTotal}
          query={consentQuery}
          facets={consentFacets}
          viewState={consentViewState}
          error={consentError}
          dispatch={dispatch}
        />
      )}

      <Modal
        open={Boolean(openRequest)}
        onClose={() => dispatch(openDataRequest(null))}
        title={t('platform.decisionTitle')}
        description={openRequest ? openRequest.subjectName : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => dispatch(openDataRequest(null))}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!canDecide} loading={actionStatus === 'loading'} onClick={handleDecision}>
              {t('common.submit')}
            </Button>
          </>
        }
      >
        {openRequest ? (
          <DecisionForm
            request={openRequest}
            draft={decisionDraft}
            error={actionError}
            onChange={(patch) => dispatch(setDecisionDraft(patch))}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function RequestsTab({ requests, total, query, facets, viewState, error, dispatch }) {
  const handleFilter = (field) => (event) =>
    dispatch(setDataRequestFilters({ ...query.filters, [field]: event.target.value }));

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="request-search"
          className="w-80"
          iconLeft={Search}
          placeholder={t('platform.privacySearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setDataRequestSearch(event.target.value))}
        />
        <Select
          id="request-type" className="w-44" placeholder={t('common.all')}
          value={query.filters.type} onChange={handleFilter('type')}
          options={(facets?.type ?? []).map(({ value }) => ({ value, label: t(`platform.requestType.${value}`) }))}
        />
        <Select
          id="request-status" className="w-48" placeholder={t('common.all')}
          value={query.filters.status} onChange={handleFilter('status')}
          options={(facets?.status ?? []).map(({ value }) => ({ value, label: t(`platform.requestStatus.${value}`) }))}
        />
        <Select
          id="request-sla" className="w-44" placeholder={t('common.all')}
          value={query.filters.slaState} onChange={handleFilter('slaState')}
          options={(facets?.slaState ?? []).map(({ value }) => ({ value, label: t(`platform.slaState.${value}`) }))}
        />
        <Select
          id="request-subject" className="w-44" placeholder={t('common.all')}
          value={query.filters.subjectType} onChange={handleFilter('subjectType')}
          options={(facets?.subjectType ?? []).map(({ value }) => ({ value, label: t(`platform.subjectType.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearDataRequestFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        className="mt-4"
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setDataRequestPage(page))}
            onPageSizeChange={(size) => dispatch(setDataRequestPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('platform.column.subject')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.requestType.label')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.raised')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.due')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.slaState.label')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            requests.map((request) => (
              <TableShell.Row key={request.id} onClick={() => dispatch(openDataRequest(request.id))}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{request.subjectName}</span>
                  <span className="block text-xs text-charcoal-light">
                    {t(`platform.subjectType.${request.subjectType}`)} · {request.subjectId}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>{t(`platform.requestType.${request.type}`)}</TableShell.Cell>
                <TableShell.Cell>
                  {formatDate(request.raisedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(request.raisedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDate(request.dueAt)}
                  {request.daysRemaining !== null ? (
                    <span className="block text-xs text-charcoal-light">
                      {request.daysRemaining < 0
                        ? t('platform.overdueBy', { days: formatNumber(Math.abs(request.daysRemaining)) })
                        : t('platform.dueIn', { days: formatNumber(request.daysRemaining) })}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={REQUEST_STATUS_TONES[request.status]}>
                    {t(`platform.requestStatus.${request.status}`)}
                  </StatusPill>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={SLA_TONES[request.slaState]} size="sm">
                    {t(`platform.slaState.${request.slaState}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={REQUEST_COLUMNS}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchDataRequests())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearDataRequestFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState title={t('platform.requestsEmptyTitle')} body={t('platform.requestsEmptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </>
  );
}

function ConsentsTab({ consents, total, query, facets, viewState, error, dispatch }) {
  const handleFilter = (field) => (event) =>
    dispatch(setConsentFilters({ ...query.filters, [field]: event.target.value }));

  return (
    <>
      {/* There is no delete affordance on this table and no endpoint behind
          one. Proving when a member withdrew is the entire point of a ledger,
          and a ledger you can erase from proves nothing. */}
      <p className="text-sm text-charcoal-light">{t('platform.consentLedgerNote')}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Input
          id="consent-search" className="w-80" iconLeft={Search}
          placeholder={t('platform.privacySearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setConsentSearch(event.target.value))}
        />
        <Select
          id="consent-purpose" className="w-52" placeholder={t('common.all')}
          value={query.filters.purpose} onChange={handleFilter('purpose')}
          options={(facets?.purpose ?? []).map(({ value }) => ({ value, label: t(`platform.consentPurpose.${value}`) }))}
        />
        <Select
          id="consent-state" className="w-44" placeholder={t('common.all')}
          value={query.filters.state} onChange={handleFilter('state')}
          options={(facets?.state ?? []).map(({ value }) => ({ value, label: t(`platform.consentState.${value}`) }))}
        />
        <Select
          id="consent-subject" className="w-44" placeholder={t('common.all')}
          value={query.filters.subjectType} onChange={handleFilter('subjectType')}
          options={(facets?.subjectType ?? []).map(({ value }) => ({ value, label: t(`platform.subjectType.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearConsentFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        className="mt-4"
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setConsentPage(page))}
            onPageSizeChange={(size) => dispatch(setConsentPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('platform.column.subject')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.consentPurpose.label')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.consentState.label')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.captured')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.withdrawn')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.source')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            consents.map((record) => (
              <TableShell.Row key={record.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{record.subjectName}</span>
                  <span className="block text-xs text-charcoal-light">
                    {t(`platform.subjectType.${record.subjectType}`)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>{t(`platform.consentPurpose.${record.purpose}`)}</TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={CONSENT_TONES[record.state]}>
                    {t(`platform.consentState.${record.state}`)}
                  </StatusPill>
                </TableShell.Cell>
                <TableShell.Cell>{formatDate(record.capturedAt)}</TableShell.Cell>
                <TableShell.Cell>{formatDate(record.withdrawnAt)}</TableShell.Cell>
                <TableShell.Cell>
                  {t(`platform.consentSource.${record.source}`)}
                  <span className="block font-mono text-xs text-charcoal-light">
                    {record.policyVersion}
                  </span>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={CONSENT_COLUMNS}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchConsents())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearConsentFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState title={t('platform.consentsEmptyTitle')} body={t('platform.consentsEmptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </>
  );
}

function DecisionForm({ request, draft, error, onChange }) {
  const noteRequired = draft.outcome !== '' && draft.outcome !== 'fulfil';

  return (
    <div className="flex flex-col gap-field">
      <dl className="grid grid-cols-2 gap-3 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
        <MetaRow label={t('platform.requestType.label')} value={t(`platform.requestType.${request.type}`)} />
        <MetaRow label={t('platform.column.raised')} value={formatDate(request.raisedAt)} />
        <MetaRow label={t('platform.column.due')} value={formatDate(request.dueAt)} />
        <MetaRow label={t('platform.slaState.label')} value={t(`platform.slaState.${request.slaState}`)} />
      </dl>

      {/* An erasure never removes a confirmed order, a tax invoice or a
          settlement record. Listing what stays and why is what makes the
          refusal something a member can be told rather than just given. */}
      {request.retainedRecords.length > 0 ? (
        <div>
          <h4 className="font-display text-base text-primary">{t('platform.retainedTitle')}</h4>
          <p className="mb-2 text-xs text-charcoal-light">{t('platform.retainedHelp')}</p>
          <ul className="flex flex-col gap-1">
            {request.retainedRecords.map((record) => (
              <li key={record.kind} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-charcoal">{t(`platform.retainedKind.${record.kind}`)}</span>
                <span className="text-charcoal-light">
                  {t(`platform.retainedReason.${record.reason}`)} · {formatNumber(record.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Select
        id="decision"
        label={t('platform.decision')}
        required
        placeholder={t('platform.chooseDecision')}
        value={draft.outcome}
        onChange={(event) => onChange({ outcome: event.target.value })}
        options={DECISION_OPTIONS}
      />

      <Textarea
        id="decision-note"
        rows={4}
        label={t('platform.decisionNote')}
        required={noteRequired}
        help={t('platform.decisionNoteHelp')}
        value={draft.note}
        onChange={(event) => onChange({ note: event.target.value })}
      />

      <Checkbox
        id="identity"
        label={t('platform.identityVerified')}
        help={t('platform.identityHelp')}
        checked={draft.identityVerified}
        onChange={(event) => onChange({ identityVerified: event.target.checked })}
      />

      {error ? <p className="text-sm text-danger">{t(`platform.decisionError.${error.code}`)}</p> : null}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-light">{label}</dt>
      <dd className="text-sm text-charcoal">{value}</dd>
    </div>
  );
}

function RowSkeleton({ rows = 10 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
