// ADM-043
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BellRing, CheckCircle2, Search } from 'lucide-react';
import {
  Button,
  Checkbox,
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
import {
  clearStalledFilters,
  fetchStalled,
  nudgeEnquiries,
  selectStalledConversations,
  setStalledFilters,
  setStalledPage,
  setStalledPageSize,
  setStalledSearch,
  setStalledSelection,
  setStalledSort,
  toggleStalledSelection,
} from '@/store/slices/marketplaceSlice';
import { formatDate, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  awaiting_manufacturer: 'danger',
  quoted: 'warning',
  negotiating: 'warning',
};

const REASON_OPTIONS = ['no_first_response', 'manufacturer_silent', 'jeweller_silent'].map((value) => ({
  value,
  label: t(`marketplace.reason.${value}`),
}));

// The desk works to one of these three thresholds. A free number field would
// let somebody type 0 and turn the queue into every open conversation.
const THRESHOLD_OPTIONS = [3, 5, 7, 14].map((days) => ({
  value: String(days),
  label: t('marketplace.thresholdDays', { count: days }),
}));

const CHANNEL_OPTIONS = [
  { value: 'email', label: t('marketplace.nudge.channelEmail') },
  { value: 'whatsapp', label: t('marketplace.nudge.channelWhatsapp') },
  { value: 'call', label: t('marketplace.nudge.channelCall') },
];

const COLUMN_COUNT = 9;

export default function StalledConversations() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [nudgeOpen, setNudgeOpen] = useState(false);

  // Data. ONE selector - this is the seam.
  const {
    conversations,
    total,
    thresholdDays,
    facets,
    query,
    viewState,
    selectedIds,
    allSelected,
    someSelected,
    selectedValue,
    actionStatus,
    actionError,
  } = useSelector(selectStalledConversations);

  useEffect(() => {
    dispatch(fetchStalled());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setStalledFilters({ ...query.filters, [field]: event.target.value }));

  const handleSelectAll = () =>
    dispatch(setStalledSelection(allSelected ? [] : conversations.map((row) => row.id)));

  const handleNudged = () => {
    setNudgeOpen(false);
    dispatch(fetchStalled());
  };

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('marketplace.eyebrow')}
        title={t('marketplace.stalledTitle')}
        subtitle={t('marketplace.stalledSubtitle')}
        meta={<StatusPill tone="warning" label={t('marketplace.stalledCount', { count: total })} />}
        actions={
          <Button variant="secondary" onClick={() => navigate('/marketplace/enquiries')}>
            {t('marketplace.enquiriesNavLabel')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('marketplace.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setStalledSearch(event.target.value))}
        />
        <Select
          id="threshold"
          className="w-48"
          label={t('marketplace.filter.threshold')}
          value={query.filters.thresholdDays}
          onChange={setFilter('thresholdDays')}
          options={THRESHOLD_OPTIONS}
        />
        <Select
          id="reason"
          className="w-52"
          placeholder={t('common.all')}
          value={query.filters.stalledReason}
          onChange={setFilter('stalledReason')}
          options={REASON_OPTIONS}
        />
        <Select
          id="manufacturer"
          className="w-52"
          placeholder={t('marketplace.filter.manufacturer')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearStalledFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-accent bg-accent-light/20 px-4 py-2.5">
          <span className="text-base font-medium text-primary">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          {/* Ten silent conversations worth eighty lakh is a different decision
              from ten worth two, so the value comes with the count. */}
          <span className="text-sm text-charcoal-light">
            {t('marketplace.nudge.selectedValue', { value: formatINR(selectedValue) })}
          </span>
          <Button size="sm" variant="secondary" iconLeft={BellRing} onClick={() => setNudgeOpen(true)}>
            {t('marketplace.bulkNudge')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => dispatch(setStalledSelection([]))}>
            {t('common.cancel')}
          </Button>
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setStalledPage(page))}
            onPageSizeChange={(size) => dispatch(setStalledPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('marketplace.column.enquiry')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.jeweller')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.manufacturer')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'idleDays' ? query.sortDir : null}
            onSort={() =>
              dispatch(
                setStalledSort({ sortBy: 'idleDays', sortDir: query.sortDir === 'desc' ? 'asc' : 'desc' }),
              )
            }
          >
            {t('marketplace.column.idle')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('marketplace.column.reason')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('marketplace.column.quotedValue')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.nudges')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            conversations.map((conversation) => (
              <TableShell.Row
                key={conversation.id}
                selected={selectedIds.includes(conversation.id)}
                onClick={() => dispatch(toggleStalledSelection(conversation.id))}
              >
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${conversation.id}`}
                    checked={selectedIds.includes(conversation.id)}
                    onChange={() => dispatch(toggleStalledSelection(conversation.id))}
                  />
                </TableShell.SelectCell>

                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{conversation.subject}</span>
                  <span className="block text-xs text-charcoal-light">
                    {conversation.id} · {formatDate(conversation.openedAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>{conversation.jewellerName}</TableShell.Cell>
                <TableShell.Cell>{conversation.manufacturerName}</TableShell.Cell>

                <TableShell.Cell>
                  {t('marketplace.idleFor', { count: conversation.idleDays })}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>{t(`marketplace.reason.${conversation.stalledReason}`)}</TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatINR(conversation.latestQuotedValue)}
                </TableShell.Cell>

                <TableShell.Cell>
                  {conversation.nudgeCount === 0
                    ? t('marketplace.neverNudged')
                    : t('marketplace.nudgedAlready', { when: formatRelativeTime(conversation.nudgedAt) })}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={STATUS_TONES[conversation.status] ?? 'neutral'}
                    label={t(`marketplace.status.${conversation.status}`)}
                  />
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchStalled())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearStalledFilters())}
                />
              ) : null}
              {/* Nothing stalled is the all clear, not an empty collection
                  waiting to be filled. It reads as good news. */}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={CheckCircle2}
                  title={t('marketplace.stalledEmptyTitle')}
                  body={t('marketplace.stalledEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <NudgeModal
        open={nudgeOpen}
        count={selectedIds.length}
        selectedIds={selectedIds}
        thresholdDays={thresholdDays}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setNudgeOpen(false)}
        onSent={handleNudged}
      />
    </div>
  );
}

// Local sub-component, same file.
function NudgeModal({ open, count, selectedIds, thresholdDays, actionStatus, actionError, onClose, onSent }) {
  const dispatch = useDispatch();
  const [channel, setChannel] = useState('email');
  const [note, setNote] = useState('');

  // The only record of what was said on a phone call is what the caller writes
  // down, so a call nudge cannot be sent empty. The server enforces this too.
  const noteRequired = channel === 'call';
  const canSend = count > 0 && (!noteRequired || note.trim().length > 0);

  const handleSend = async () => {
    const result = await dispatch(nudgeEnquiries({ enquiryIds: selectedIds, channel, note }));
    if (!result.error) {
      setNote('');
      onSent();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('marketplace.nudge.title')}
      description={t('marketplace.nudge.description')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!canSend} loading={actionStatus === 'loading'} onClick={handleSend}>
            {t('marketplace.nudge.send')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <p className="text-base text-charcoal">
          {t('common.selectedCount', { count })} · {t('marketplace.idleFor', { count: thresholdDays })}
        </p>
        <Select
          id="nudge-channel"
          label={t('marketplace.nudge.channel')}
          required
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          options={CHANNEL_OPTIONS}
        />
        <Textarea
          id="nudge-note"
          rows={4}
          label={t('marketplace.nudge.note')}
          required={noteRequired}
          help={t('marketplace.nudge.noteHelp')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
