// ADM-058
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Lock } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  fetchCommissionAudit,
  fetchCommissionConfig,
  resetCommissionDraft,
  saveCommissionConfig,
  selectCommissionConfig,
  setAuditPage,
  setCategoryCommission,
  setCommissionDraftField,
  setVolumeSlab,
} from '@/store/slices/paymentsSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatINR, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const AUDIT_COLUMN_COUNT = 6;

export default function CommissionConfiguration() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    draft,
    dirty,
    overrides,
    noticeDays,
    effectiveFrom,
    ordersAffected,
    viewState,
    error,
    saveStatus,
    saveError,
    audit,
    auditTotal,
    auditQuery,
    retainedValue,
    auditState,
  } = useSelector(selectCommissionConfig);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canEdit = grantedPermissions.includes('manufacturers.commission.edit');

  useEffect(() => {
    dispatch(fetchCommissionConfig());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCommissionAudit());
  }, [dispatch, auditQuery]);

  // Handlers.
  const handleSave = () => dispatch(saveCommissionConfig(draft));

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchCommissionConfig())} />;
  }

  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.commissionTitle')}
        subtitle={t('payments.commissionSubtitle')}
        meta={<StatusPill tone="info" label={t('payments.commissionNotice', { days: noticeDays })} />}
      />

      {/* The permanence rule, said out loud on the screen that would otherwise
          look like it could reprice history. ordersAffected is always zero and
          it is shown rather than hidden. */}
      <div className="flex items-start gap-3 rounded-md border border-info/40 bg-info-surface px-4 py-3">
        <Lock size={18} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
        <p className="text-base text-charcoal">
          {t('payments.commissionForward', {
            date: effectiveFrom ? formatDate(effectiveFrom) : '-',
            count: ordersAffected ?? 0,
          })}
        </p>
      </div>

      <Card title={t('payments.defaultRate')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-3">
          <Input
            id="default-percent"
            type="number"
            step="0.05"
            label={t('payments.defaultRate')}
            disabled={!canEdit}
            value={draft.defaultPercent}
            onChange={(event) =>
              dispatch(setCommissionDraftField({ field: 'defaultPercent', value: Number(event.target.value) }))
            }
          />
        </div>
      </Card>

      <Card title={t('payments.categoryRates')} description={t('payments.categoryRatesCaption')}>
        <div className="grid grid-cols-1 gap-field sm:grid-cols-2 lg:grid-cols-3">
          {draft.categoryRules.map((rule) => (
            <Input
              key={rule.category}
              id={`cat-${rule.category}`}
              type="number"
              step="0.05"
              label={rule.category}
              disabled={!canEdit}
              value={rule.percent}
              onChange={(event) =>
                dispatch(setCategoryCommission({ category: rule.category, percent: Number(event.target.value) }))
              }
            />
          ))}
        </div>
      </Card>

      <Card title={t('payments.volumeSlabs')} description={t('payments.volumeSlabsCaption')}>
        <div className="flex flex-col gap-field">
          {draft.volumeSlabs.map((slab, index) => (
            <div key={index} className="grid grid-cols-1 gap-field sm:grid-cols-2">
              <Input
                id={`slab-from-${index}`}
                type="number"
                label={t('payments.slabFrom')}
                disabled={!canEdit}
                value={slab.fromValue}
                onChange={(event) =>
                  dispatch(setVolumeSlab({ index, field: 'fromValue', value: Number(event.target.value) }))
                }
              />
              <Input
                id={`slab-discount-${index}`}
                type="number"
                step="0.05"
                label={t('payments.slabDiscount')}
                disabled={!canEdit}
                value={slab.discountPercent}
                onChange={(event) =>
                  dispatch(setVolumeSlab({ index, field: 'discountPercent', value: Number(event.target.value) }))
                }
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('payments.overridesTitle')} description={t('payments.overridesCaption')} padded={false}>
        <ul className="divide-y divide-lightGray">
          {overrides.map((row) => (
            <li key={row.manufacturerId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span className="min-w-0">
                <span className="text-base text-charcoal">{row.manufacturerName}</span>
                <span className="block text-xs text-charcoal-light">{row.reason}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-charcoal-light">{formatINR(row.settledValue)}</span>
                <span className="text-base font-medium tabular-nums text-primary">
                  {formatPercent(row.percent, { decimals: 2 })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={t('payments.auditTitle')}
        description={t('payments.auditCaption')}
        action={
          <span className="text-sm text-charcoal-light">
            {t('payments.retainedValue')}: {formatINR(retainedValue)}
          </span>
        }
        padded={false}
      >
        <TableShell
          footer={
            <TableShell.Pagination
              page={auditQuery.page}
              pageSize={auditQuery.pageSize}
              total={auditTotal}
              onPageChange={(page) => dispatch(setAuditPage(page))}
              onPageSizeChange={() => {}}
            />
          }
        >
          <TableShell.Head>
            <TableShell.HeadCell>{t('payments.column.order')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('payments.column.manufacturer')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('payments.column.goods')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('payments.appliedPercent')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('payments.column.commission')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('payments.column.confirmed')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {auditState === 'populated' ? (
              audit.map((row) => (
                <TableShell.Row key={row.id}>
                  <TableShell.Cell>
                    <span className="font-medium text-charcoal">{row.orderId}</span>
                    <span className="block text-xs text-charcoal-light">{row.settlementLineId}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>{row.manufacturerName}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.goodsValue)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatPercent(row.appliedPercent, { decimals: 2 })}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.commission)}
                  </TableShell.Cell>
                  <TableShell.Cell>{row.confirmedAt ? formatDate(row.confirmedAt) : '-'}</TableShell.Cell>
                </TableShell.Row>
              ))
            ) : (
              <TableShell.StateRow colSpan={AUDIT_COLUMN_COUNT}>
                {auditState === 'loading' ? <AuditSkeleton /> : null}
                {auditState === 'error' ? <ErrorState onRetry={() => dispatch(fetchCommissionAudit())} /> : null}
                {auditState === 'empty' || auditState === 'empty-filtered' ? (
                  <EmptyState title={t('payments.auditTitle')} body={t('payments.auditCaption')} />
                ) : null}
              </TableShell.StateRow>
            )}
          </TableShell.Body>
        </TableShell>
      </Card>

      {/* Sticky footer. Cancel on the left of the primary, always in this
          order, so muscle memory works across all 99 screens. */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          {saveStatus === 'succeeded' && !dirty && !saveError ? (
            <p className="mr-auto text-sm text-success">
              {t('payments.savedOk', { date: effectiveFrom ? formatDate(effectiveFrom) : '-' })}
            </p>
          ) : null}
          <Button variant="secondary" disabled={!dirty} onClick={() => dispatch(resetCommissionDraft())}>
            {t('common.reset')}
          </Button>
          <Button disabled={!canEdit || !dirty} loading={saveStatus === 'loading'} onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function AuditSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
