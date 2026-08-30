// ADM-062
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditCard, Lock, Search, TrendingUp, Users } from 'lucide-react';
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
  Spinner,
  StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearSubscriptionFilters,
  closePlanEditor,
  editPlan,
  fetchMembershipPlans,
  fetchPlanSubscriptions,
  saveMembershipPlan,
  selectMembershipPlans,
  setPlanDraftField,
  setSubscriptionFilters,
  setSubscriptionPage,
  setSubscriptionPageSize,
  setSubscriptionSearch,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatINR, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const PLAN_TONES = { draft: 'neutral', live: 'success', retired: 'neutral' };
const SUBSCRIPTION_TONES = {
  active: 'success',
  past_due: 'danger',
  cancelled: 'neutral',
  trialing: 'info',
};

const STATUS_OPTIONS = ['active', 'past_due', 'cancelled', 'trialing'].map((value) => ({
  value,
  label: t(`payments.subscriptionStatus.${value}`),
}));

const MEMBER_OPTIONS = ['jeweller', 'manufacturer'].map((value) => ({
  value,
  label: t(`payments.partyType.${value}`),
}));

const COLUMN_COUNT = 6;

export default function MembershipPlans() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    plans,
    subscriptionCounts,
    mrr,
    arr,
    pastDueCount,
    viewState,
    error,
    editingId,
    draft,
    dirty,
    saveStatus,
    saveError,
    subscriptions,
    subscriptionTotal,
    subscriptionQuery,
    subscriptionState,
  } = useSelector(selectMembershipPlans);

  useEffect(() => {
    dispatch(fetchMembershipPlans());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchPlanSubscriptions());
  }, [dispatch, subscriptionQuery]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setSubscriptionFilters({ ...subscriptionQuery.filters, [field]: event.target.value }));

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchMembershipPlans())} />;
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.plansTitle')}
        subtitle={t('payments.plansSubtitle')}
        meta={
          pastDueCount > 0 ? (
            <StatusPill tone="danger" label={`${t('payments.pastDue')}: ${formatNumber(pastDueCount)}`} />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricTile label={t('payments.mrr')} value={formatINR(mrr)} icon={CreditCard} />
        <MetricTile label={t('payments.arr')} value={formatINR(arr)} icon={TrendingUp} />
        <MetricTile label={t('payments.pastDue')} value={formatNumber(pastDueCount)} icon={Users} invertTrend />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            title={plan.name}
            description={t(`payments.audience.${plan.audience}`)}
            action={<StatusPill tone={PLAN_TONES[plan.status]} label={t(`payments.planStatus.${plan.status}`)} />}
          >
            <p className="text-xl font-semibold tabular-nums text-primary">
              {plan.monthlyPrice === 0
                ? t('payments.freePlan')
                : t('payments.perMonth', { value: formatINR(plan.monthlyPrice) })}
            </p>
            {plan.annualPrice > 0 ? (
              <p className="mt-1 text-sm text-charcoal-light">
                {t('payments.perYear', { value: formatINR(plan.annualPrice) })}
              </p>
            ) : null}

            <ul className="mt-3 flex flex-col gap-1.5">
              {plan.features.map((feature) => (
                <li key={feature} className="text-sm text-charcoal">
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-lightGray-dark pt-3">
              <Badge tone="neutral">
                {t('payments.subscribers', { count: subscriptionCounts[plan.id] ?? 0 })}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => dispatch(editPlan(plan.id))}>
                {t('payments.editPlan')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('payments.searchPlaceholder')}
          value={subscriptionQuery.search}
          onChange={(event) => dispatch(setSubscriptionSearch(event.target.value))}
        />
        <Select
          id="plan"
          className="w-48"
          placeholder={t('payments.filter.plan')}
          value={subscriptionQuery.filters.planId}
          onChange={setFilter('planId')}
          options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
        />
        <Select
          id="status"
          className="w-44"
          placeholder={t('common.all')}
          value={subscriptionQuery.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="member"
          className="w-44"
          placeholder={t('payments.filter.memberType')}
          value={subscriptionQuery.filters.memberType}
          onChange={setFilter('memberType')}
          options={MEMBER_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearSubscriptionFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={subscriptionQuery.page}
            pageSize={subscriptionQuery.pageSize}
            total={subscriptionTotal}
            onPageChange={(page) => dispatch(setSubscriptionPage(page))}
            onPageSizeChange={(size) => dispatch(setSubscriptionPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('payments.column.member')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.plan')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.cycle')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.amount')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.renews')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {subscriptionState === 'populated' ? (
            subscriptions.map((row) => (
              <TableShell.Row key={row.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.memberName}</span>
                  <span className="block text-xs text-charcoal-light">
                    {t(`payments.partyType.${row.memberType}`)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>{row.planName}</TableShell.Cell>
                <TableShell.Cell>
                  {row.cycle === 'annual' ? t('payments.cycleAnnual') : t('payments.cycleMonthly')}
                </TableShell.Cell>
                {/* A free plan bills nothing, so it shows a dash rather than a
                    zero. The difference matters when this column is summed. */}
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.amount)}
                </TableShell.Cell>
                <TableShell.Cell>{formatDate(row.renewsAt)}</TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill
                    tone={SUBSCRIPTION_TONES[row.status]}
                    label={t(`payments.subscriptionStatus.${row.status}`)}
                  />
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {subscriptionState === 'loading' ? <QueueSkeleton /> : null}
              {subscriptionState === 'error' ? (
                <ErrorState onRetry={() => dispatch(fetchPlanSubscriptions())} />
              ) : null}
              {subscriptionState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearSubscriptionFilters())}
                />
              ) : null}
              {subscriptionState === 'empty' ? (
                <EmptyState icon={Users} title={t('payments.subscriptionsTitle')} body={t('payments.plansSubtitle')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <PlanEditor
        open={editingId !== null}
        draft={draft}
        dirty={dirty}
        saveStatus={saveStatus}
        saveError={saveError}
        onClose={() => dispatch(closePlanEditor())}
      />
    </div>
  );
}

// Local sub-component, same file.
function PlanEditor({ open, draft, dirty, saveStatus, saveError, onClose }) {
  const dispatch = useDispatch();
  if (!draft) return null;

  const setField = (field) => (event) =>
    dispatch(setPlanDraftField({ field, value: event.target.value }));

  const setNumber = (field) => (event) =>
    dispatch(setPlanDraftField({ field, value: event.target.value === '' ? null : Number(event.target.value) }));

  // A live plan's price cannot be changed in place: members agreed to it. The
  // server refuses it too; this is so the field reads as locked rather than
  // failing on save.
  const priceLocked = draft.status === 'live';

  const handleSave = async () => {
    const result = await dispatch(saveMembershipPlan(draft));
    if (!result.error) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payments.planEditorTitle', { name: draft.name })}
      footer={
        <>
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-field">
        <Input id="plan-name" label={t('payments.planName')} required value={draft.name} onChange={setField('name')} />

        {priceLocked ? (
          <p className="flex items-start gap-2 text-sm text-charcoal-light">
            <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t('payments.planLivePriceLocked')}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="plan-monthly"
            type="number"
            label={t('payments.planMonthly')}
            disabled={priceLocked}
            value={draft.monthlyPrice}
            onChange={setNumber('monthlyPrice')}
          />
          <Input
            id="plan-annual"
            type="number"
            label={t('payments.planAnnual')}
            disabled={priceLocked}
            value={draft.annualPrice}
            onChange={setNumber('annualPrice')}
          />
          <Input
            id="plan-listings"
            type="number"
            label={t('payments.planListingLimit')}
            help={t('payments.planUnlimited')}
            value={draft.listingLimit ?? ''}
            onChange={setNumber('listingLimit')}
          />
          <Input
            id="plan-orders"
            type="number"
            label={t('payments.planOrderLimit')}
            help={t('payments.planUnlimited')}
            value={draft.orderLimit ?? ''}
            onChange={setNumber('orderLimit')}
          />
          <Input
            id="plan-discount"
            type="number"
            step="0.05"
            label={t('payments.planDiscount')}
            value={draft.commissionDiscountPercent}
            onChange={setNumber('commissionDiscountPercent')}
          />
        </div>
      </div>
    </Modal>
  );
}

function QueueSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
