// ADM-074
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { IndianRupee, MessagesSquare, QrCode, Users } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import {
  ChartCard,
  MetricTile,
  TableShell,
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartTooltipProps,
} from '@/components';
import {
  fetchExhibitionReport,
  fetchShowLeads,
  recordFollowUp,
  selectShowReport,
  setLeadFilters,
  setLeadPage,
  setShowReportId,
} from '@/store/slices/growthSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const OUTCOME_TONES = {
  scanned: 'neutral',
  connected: 'info',
  enquiry_raised: 'warning',
  ordered: 'success',
};

const FOLLOW_TONES = { pending: 'warning', contacted: 'info', converted: 'success', lost: 'danger' };

const OUTCOME_LABELS = {
  scanned: 'growth.outcomeScanned',
  connected: 'growth.outcomeConnected',
  enquiry_raised: 'growth.outcomeEnquiryRaised',
  ordered: 'growth.outcomeOrdered',
};

const FOLLOW_LABELS = {
  pending: 'growth.followPending',
  contacted: 'growth.followContacted',
  converted: 'growth.followConverted',
  lost: 'growth.followLost',
};

const OUTCOME_OPTIONS = Object.keys(OUTCOME_LABELS).map((value) => ({
  value,
  label: t(OUTCOME_LABELS[value]),
}));

const FOLLOW_OPTIONS = ['contacted', 'converted', 'lost'].map((value) => ({
  value,
  label: t(FOLLOW_LABELS[value]),
}));

const COLUMN_COUNT = 5;

export default function ShowReporting() {
  const { showId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    report,
    exhibition,
    funnel,
    scansByDay,
    leaderboard,
    leads,
    leadsTotal,
    leadQuery,
    leadsState,
    viewState,
    error,
    actionStatus,
    actionError,
  } = useSelector(selectShowReport);

  const [following, setFollowing] = useState(null);
  const [outcome, setOutcome] = useState('contacted');
  const [note, setNote] = useState('');

  useEffect(() => {
    dispatch(setShowReportId(showId));
    dispatch(fetchExhibitionReport(showId));
  }, [dispatch, showId]);

  useEffect(() => {
    if (showId) dispatch(fetchShowLeads());
  }, [dispatch, showId, leadQuery]);

  // Handlers.
  const handleFollowUp = async () => {
    const result = await dispatch(
      recordFollowUp({ leadId: following.id, followUpState: outcome, note }),
    );
    if (result.error) return;
    setFollowing(null);
    setNote('');
    dispatch(fetchExhibitionReport(showId));
  };

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchExhibitionReport(showId))} />;
  }
  if (!report || !exhibition) {
    return (
      <EmptyState
        title={t('states.emptyTitle')}
        body={t('states.emptyBody')}
        actionLabel={t('common.back')}
        onAction={() => navigate('/growth/exhibitions')}
      />
    );
  }

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={exhibition.name}
        subtitle={`${exhibition.venue} · ${exhibition.city} · ${formatDate(exhibition.startsOn)}`}
        meta={
          report.followUpsOverdue > 0 ? (
            <StatusPill tone="danger" dot>
              {t('growth.followUpsOverdue', { count: report.followUpsOverdue })}
            </StatusPill>
          ) : null
        }
        actions={
          <Button variant="secondary" onClick={() => navigate('/growth/exhibitions')}>
            {t('common.back')}
          </Button>
        }
      />

      {/* The funnel narrows by definition - every connection was a scan first.
          Counting them independently would let the middle exceed the top. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('growth.tileScans')} value={formatNumber(funnel.scans)} icon={QrCode} />
        <MetricTile label={t('growth.tileConnections')} value={formatNumber(funnel.connections)} icon={Users} />
        <MetricTile
          label={t('growth.tileEnquiries')}
          value={formatNumber(funnel.enquiries)}
          caption={`${report.conversionPercent}%`}
          icon={MessagesSquare}
        />
        <MetricTile
          label={t('growth.tilePipeline')}
          value={formatINRCompact(report.taggedEnquiryValue)}
          icon={IndianRupee}
        />
      </div>

      <ChartCard
        title={t('growth.funnelTitle')}
        description={t('growth.funnelDescription')}
        status="succeeded"
        legend={[
          { label: t('growth.tileScans'), color: chartColors[0] },
          { label: t('growth.tileConnections'), color: chartColors[1] },
        ]}
      >
        <LineChart data={scansByDay}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="date" {...chartAxisProps} />
          <YAxis {...chartAxisProps} width={40} allowDecimals={false} />
          <Tooltip {...chartTooltipProps} />
          <Line type="monotone" dataKey="scans" stroke={chartColors[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="connections" stroke={chartColors[1]} strokeWidth={2} dot={false} />
        </LineChart>
      </ChartCard>

      <ChartCard
        title={t('growth.leaderboardTitle')}
        status="succeeded"
        legend={[{ label: t('growth.tileScans'), color: chartColors[0] }]}
      >
        <BarChart data={leaderboard}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="stallCode" {...chartAxisProps} />
          <YAxis {...chartAxisProps} width={40} allowDecimals={false} />
          <Tooltip {...chartTooltipProps} />
          <Bar dataKey="scans" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          id="outcome"
          className="w-52"
          placeholder={t('common.all')}
          value={leadQuery.filters.outcome}
          onChange={(event) =>
            dispatch(setLeadFilters({ ...leadQuery.filters, outcome: event.target.value }))
          }
          options={OUTCOME_OPTIONS}
        />
        <Select
          id="followUpState"
          className="w-48"
          placeholder={t('common.all')}
          value={leadQuery.filters.followUpState}
          onChange={(event) =>
            dispatch(setLeadFilters({ ...leadQuery.filters, followUpState: event.target.value }))
          }
          options={[{ value: 'pending', label: t('growth.followPending') }, ...FOLLOW_OPTIONS]}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => dispatch(setLeadFilters({ stallId: '', outcome: '', followUpState: '' }))}
        >
          {t('common.clearFilters')}
        </Button>
      </div>

      {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={leadQuery.page}
            pageSize={leadQuery.pageSize}
            total={leadsTotal}
            onPageChange={(page) => dispatch(setLeadPage(page))}
            onPageSizeChange={() => {}}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('growth.columnLead')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('growth.columnStall')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('growth.columnScanned')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('growth.columnOutcome')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('growth.columnFollowUp')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {leadsState === 'succeeded' && leads.length > 0 ? (
            leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onFollowUp={() => {
                  setFollowing(lead);
                  setOutcome('contacted');
                }}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {leadsState === 'loading' ? <LeadSkeleton /> : null}
              {leadsState === 'failed' ? (
                <ErrorState onRetry={() => dispatch(fetchShowLeads())} />
              ) : null}
              {leadsState === 'succeeded' ? (
                <EmptyState
                  icon={QrCode}
                  title={t('growth.leadsEmptyTitle')}
                  body={t('growth.leadsEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={Boolean(following)}
        onClose={() => setFollowing(null)}
        onConfirm={handleFollowUp}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('growth.followUpTitle', { name: following?.jewellerName ?? '' })}
        body={t('growth.leadsTitle')}
        confirmLabel={t('growth.recordFollowUp')}
      >
        <div className="mt-4 flex flex-col gap-field">
          <Select
            id="follow-outcome"
            label={t('growth.followUpOutcome')}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            options={FOLLOW_OPTIONS}
          />
          {/* A lead marked lost needs a note. The next show has to know why the
              last one did not convert. */}
          <Textarea
            id="follow-note"
            rows={3}
            label={t('growth.followUpNote')}
            required={outcome === 'lost'}
            help={t('growth.followUpNoteHelp')}
            error={actionError?.code === 'note_required' ? actionError.message : undefined}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function LeadRow({ lead, onFollowUp }) {
  return (
    <TableShell.Row>
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{lead.jewellerName}</span>
        <span className="block text-xs text-charcoal-light">{lead.jewellerCity}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        {lead.stallCode}
        <span className="block text-xs text-charcoal-light">{lead.manufacturerName}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        {formatDate(lead.scannedAt)}
        <span className="block text-xs text-charcoal-light">{formatRelativeTime(lead.scannedAt)}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={OUTCOME_TONES[lead.outcome]}>{t(OUTCOME_LABELS[lead.outcome])}</StatusPill>
        {lead.enquiryId ? (
          <span className="block text-xs text-charcoal-light">
            {lead.enquiryId} · {formatINR(lead.enquiryValue)}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        <StatusPill size="sm" tone={FOLLOW_TONES[lead.followUpState]}>
          {t(FOLLOW_LABELS[lead.followUpState])}
        </StatusPill>
        {lead.followUpState === 'pending' ? (
          <Button size="sm" variant="ghost" onClick={onFollowUp}>
            {t('growth.recordFollowUp')}
          </Button>
        ) : null}
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function LeadSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
