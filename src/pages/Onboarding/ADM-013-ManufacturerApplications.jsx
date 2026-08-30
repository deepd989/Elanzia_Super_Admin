// ADM-013
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearManufacturerFilters,
  fetchManufacturerApplications,
  fetchManufacturerCounts,
  selectManufacturerApplicationQueue,
  setManufacturerFilters,
  setManufacturerPage,
  setManufacturerPageSize,
  setManufacturerSearch,
  setManufacturerSort,
} from '@/store/slices/onboardingSlice';
import { VERIFICATION_SLA_HOURS } from '@/data/onboardingFixtures';
import { formatDate, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  applied: 'info',
  under_review: 'info',
  info_requested: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
};

const STATUS_OPTIONS = [
  'applied',
  'under_review',
  'info_requested',
  'approved',
  'rejected',
  'suspended',
].map((value) => ({ value, label: t(`onboarding.status.${value}`) }));

// The manufacturing centres in src/data/core. A free text city box on a queue
// this size invites typos that silently return nothing.
const CITY_OPTIONS = [
  'Rajkot',
  'Coimbatore',
  'Jaipur',
  'Surat',
  'Kolkata',
  'Mumbai',
  'Hyderabad',
].map((value) => ({ value, label: value }));

const COLUMN_COUNT = 7;

export default function ManufacturerApplications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { applications, total, query, counts, viewState, error } = useSelector(
    selectManufacturerApplicationQueue,
  );

  useEffect(() => {
    dispatch(fetchManufacturerApplications());
    dispatch(fetchManufacturerCounts());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setManufacturerFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setManufacturerSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'asc' ? 'desc' : 'asc',
      }),
    );

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('onboarding.eyebrow')}
        title={t('onboarding.manufacturersTitle')}
        subtitle={t('onboarding.manufacturersSubtitle')}
        meta={
          counts ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={counts.pending > 0 ? 'warning' : 'success'}>
                {t('onboarding.pendingCount', { count: counts.pending })}
              </StatusPill>
              {counts.slaBreached > 0 ? (
                <StatusPill tone="danger">
                  {t('onboarding.breachedCount', {
                    count: counts.slaBreached,
                    hours: VERIFICATION_SLA_HOURS,
                  })}
                </StatusPill>
              ) : null}
            </span>
          ) : null
        }
      />

      <Tabs
        activeId={query.filters.queue}
        onChange={(queue) => dispatch(setManufacturerFilters({ ...query.filters, queue }))}
        tabs={[
          { id: 'pending', label: t('onboarding.tabPending'), count: counts?.pending },
          { id: 'breached', label: t('onboarding.tabBreached'), count: counts?.slaBreached },
          { id: 'all', label: t('onboarding.tabAll'), count: counts?.total },
        ]}
      />

      {/* Filter row. Search first and widest, then the narrow selects, then the
          clear action pushed right. Same order on every queue. */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('onboarding.searchManufacturers')}
          value={query.search}
          onChange={(event) => dispatch(setManufacturerSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="city"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.city}
          onChange={setFilter('city')}
          options={CITY_OPTIONS}
        />
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={() => dispatch(clearManufacturerFilters())}
        >
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setManufacturerPage(page))}
            onPageSizeChange={(size) => dispatch(setManufacturerPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('onboarding.columnBusiness')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('onboarding.columnCity')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('onboarding.columnGstin')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'submittedAt' ? query.sortDir : null}
            onSort={() => handleSort('submittedAt')}
          >
            {t('onboarding.columnSubmitted')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('onboarding.columnChecks')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('onboarding.columnReviewer')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            applications.map((application) => (
              <ApplicationRow
                key={application.id}
                application={application}
                onOpen={() => navigate(`/onboarding/applications/${application.id}`)}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState
                  detail={error?.message}
                  onRetry={() => dispatch(fetchManufacturerApplications())}
                />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearManufacturerFilters())}
                />
              ) : null}
              {/* Not "nothing here yet". An empty verification queue means every
                  applicant has an answer, and that is worth saying. */}
              {viewState === 'empty' ? <EmptyQueue queue={query.filters.queue} /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function ApplicationRow({ application, onOpen }) {
  return (
    <TableShell.Row onClick={onOpen}>
      {/* Two-line cell: the identifier, then the thing that disambiguates it. */}
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{application.businessName}</span>
        <span className="block text-xs text-charcoal-light">
          {application.contactName} · {application.id}
        </span>
      </TableShell.Cell>

      <TableShell.Cell>
        {application.city}
        <span className="block text-xs text-charcoal-light">{application.state}</span>
      </TableShell.Cell>

      <TableShell.Cell className="font-mono text-xs">{application.gstin}</TableShell.Cell>

      {/* Absolute date on top, relative underneath - an ageing queue item has
          to be obvious without doing arithmetic. */}
      <TableShell.Cell>
        {formatDate(application.submittedAt)}
        <span className="block text-xs text-charcoal-light">
          {formatRelativeTime(application.submittedAt)}
        </span>
      </TableShell.Cell>

      <TableShell.Cell>
        <CheckSummary application={application} />
      </TableShell.Cell>

      <TableShell.Cell>
        {application.reviewerName ?? (
          <span className="text-xs text-charcoal-lighter">{t('onboarding.unassigned')}</span>
        )}
      </TableShell.Cell>

      <TableShell.Cell>
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={STATUS_TONES[application.status]}>
            {t(`onboarding.status.${application.status}`)}
          </StatusPill>
          {application.slaBreached ? (
            <StatusPill tone="danger" size="sm">
              {t('onboarding.pastSla')}
            </StatusPill>
          ) : null}
        </span>
      </TableShell.Cell>
    </TableShell.Row>
  );
}

// A blocking failure is the only thing that stops an approval, so it is the
// only thing that gets the danger tone. Everything else is information.
function CheckSummary({ application }) {
  if (application.blockedCheckCount > 0) {
    return (
      <StatusPill tone="danger" size="sm">
        {t('onboarding.checksBlocked', { count: application.blockedCheckCount })}
      </StatusPill>
    );
  }
  if (application.failedCheckCount > 0) {
    return (
      <StatusPill tone="warning" size="sm">
        {t('onboarding.checksFailed', { count: application.failedCheckCount })}
      </StatusPill>
    );
  }
  if (application.pendingCheckCount > 0) {
    return (
      <StatusPill tone="info" size="sm">
        {t('onboarding.checksPending', { count: application.pendingCheckCount })}
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="success" size="sm">
      {t('onboarding.checksClear')}
    </StatusPill>
  );
}

function EmptyQueue({ queue }) {
  if (queue === 'breached') {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t('onboarding.noBreachTitle')}
        body={t('onboarding.noBreachBody', { hours: VERIFICATION_SLA_HOURS })}
      />
    );
  }
  return (
    <EmptyState
      icon={CheckCircle2}
      title={t('onboarding.allClearTitle')}
      body={t('onboarding.allClearBody')}
    />
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
