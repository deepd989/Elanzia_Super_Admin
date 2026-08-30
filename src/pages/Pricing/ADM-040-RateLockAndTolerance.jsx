// ADM-040
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Info, Play } from 'lucide-react';
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
import { MetricTile, TableShell } from '@/components';
import {
  fetchTreasuryPolicy,
  resetPolicyDraft,
  runSimulation,
  saveTreasuryPolicy,
  selectTreasuryPolicy,
  setMovePercent,
  setPolicyDraftField,
} from '@/store/slices/pricingSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatINR, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

export default function RateLockAndTolerance() {
  const dispatch = useDispatch();

  // Data.
  const {
    policy,
    dirty,
    movePercent,
    simulation,
    simulationStatus,
    simulationError,
    viewState,
    saveStatus,
    saveError,
    error,
  } = useSelector(selectTreasuryPolicy);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canEdit = grantedPermissions.includes('pricing.rates.edit');

  useEffect(() => {
    dispatch(fetchTreasuryPolicy());
  }, [dispatch]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setPolicyDraftField({ field, value: Number(event.target.value) }));

  // Markup.
  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !policy) {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchTreasuryPolicy())} />;
  }

  return (
    <div className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.policyTitle')}
        subtitle={t('pricing.policySubtitle')}
        meta={
          <StatusPill tone="info">
            {formatPercent(policy.toleranceBandPercent)} {t('pricing.toleranceBand').toLowerCase()}
          </StatusPill>
        }
      />

      <Card title={t('pricing.locksCard')} description={t('pricing.locksHelp')}>
        <div className="grid grid-cols-1 gap-field sm:grid-cols-3">
          <Input
            id="quotation-lock"
            type="number"
            label={t('pricing.quotationLock')}
            help={t('pricing.unitMinutes')}
            disabled={!canEdit}
            value={policy.quotationLockMinutes}
            onChange={setField('quotationLockMinutes')}
          />
          <Input
            id="cart-lock"
            type="number"
            label={t('pricing.cartLock')}
            help={t('pricing.unitMinutes')}
            disabled={!canEdit}
            value={policy.cartLockMinutes}
            onChange={setField('cartLockMinutes')}
          />
          <Input
            id="confirmation-lock"
            type="number"
            label={t('pricing.confirmationLock')}
            help={t('pricing.unitMinutes')}
            disabled={!canEdit}
            value={policy.orderConfirmationLockMinutes}
            onChange={setField('orderConfirmationLockMinutes')}
          />
        </div>
      </Card>

      <Card title={t('pricing.toleranceCard')} description={t('pricing.toleranceHelp')}>
        <div className="grid grid-cols-1 gap-field sm:grid-cols-3">
          <Input
            id="tolerance"
            type="number"
            step="0.05"
            label={t('pricing.toleranceBand')}
            help={t('pricing.unitPercent')}
            disabled={!canEdit}
            value={policy.toleranceBandPercent}
            onChange={setField('toleranceBandPercent')}
          />
        </div>
      </Card>

      <Card title={t('pricing.breachCard')}>
        <div className="flex items-start gap-3 rounded border border-info/30 bg-info-surface px-4 py-3">
          <Info size={17} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
          <div>
            <p className="font-body text-base font-semibold text-info">
              {t('pricing.breachHoldLabel')}
            </p>
            <p className="mt-0.5 text-sm text-charcoal-light">{t('pricing.breachExplainer')}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-field sm:grid-cols-3">
          <Input
            id="reconfirm-window"
            type="number"
            label={t('pricing.reconfirmationWindow')}
            help={t('pricing.unitHours')}
            disabled={!canEdit}
            value={policy.reconfirmationWindowHours}
            onChange={setField('reconfirmationWindowHours')}
          />
          <Input
            id="auto-cancel"
            type="number"
            label={t('pricing.autoCancelAfter')}
            help={t('pricing.unitHours')}
            disabled={!canEdit}
            value={policy.autoCancelAfterHours}
            onChange={setField('autoCancelAfterHours')}
          />
          <Input
            id="override-permission"
            label={t('pricing.whoCanRelease')}
            disabled
            value={policy.overridePermission}
          />
        </div>
      </Card>

      <SimulationPanel
        movePercent={movePercent}
        simulation={simulation}
        status={simulationStatus}
        error={simulationError}
        onMoveChange={(value) => dispatch(setMovePercent(value))}
        onRun={() => dispatch(runSimulation({ movePercent: Number(movePercent) }))}
      />

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          {saveStatus === 'succeeded' && !dirty && !saveError ? (
            <p className="mr-auto text-sm text-success">{t('pricing.policySaved')}</p>
          ) : null}
          <Button variant="secondary" disabled={!dirty} onClick={() => dispatch(resetPolicyDraft())}>
            {t('common.reset')}
          </Button>
          <Button
            disabled={!canEdit || !dirty}
            loading={saveStatus === 'loading'}
            onClick={() => dispatch(saveTreasuryPolicy(policy))}
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Read-only. Grades the orders currently inside a lock against a hypothetical
// move, so the desk can see what a band change would have cost before
// committing to it. Nothing is written and no order is touched.
function SimulationPanel({ movePercent, simulation, status, error, onMoveChange, onRun }) {
  return (
    <Card
      title={t('pricing.simulateCard')}
      description={t('pricing.simulateHelp')}
      action={
        <div className="flex items-end gap-2">
          <Input
            id="move"
            className="w-32"
            type="number"
            step="0.1"
            label={t('pricing.simulateMove')}
            value={movePercent}
            onChange={(event) => onMoveChange(event.target.value)}
          />
          <Button variant="secondary" iconLeft={Play} loading={status === 'loading'} onClick={onRun}>
            {t('pricing.runSimulation')}
          </Button>
        </div>
      }
    >
      {error ? (
        <ErrorState detail={error.message} onRetry={onRun} />
      ) : !simulation ? (
        <EmptyState title={t('pricing.simulateEmpty')} body="" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label={t('pricing.ordersInWindow')}
              value={formatNumber(simulation.ordersInWindow)}
            />
            <MetricTile
              label={t('pricing.withinBandCount')}
              value={formatNumber(simulation.withinBand)}
            />
            <MetricTile
              label={t('pricing.breachedCount')}
              value={formatNumber(simulation.breached)}
            />
            <MetricTile
              label={t('pricing.breachedValue')}
              value={formatINR(simulation.breachedValue)}
            />
          </div>

          <TableShell maxHeight="20rem">
            <TableShell.Head>
              <TableShell.HeadCell>{t('pricing.columnOrder')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('pricing.columnLockedRate')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('pricing.columnNewRate')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('pricing.columnDelta')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
            </TableShell.Head>

            <TableShell.Body>
              {simulation.examples.map((row) => (
                <TableShell.Row key={row.orderId}>
                  <TableShell.Cell className="font-mono text-xs">{row.orderId}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.lockedRatePerGram)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatINR(row.newRatePerGram)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    <span className={row.delta >= 0 ? 'text-charcoal' : 'text-danger'}>
                      {row.delta >= 0 ? '+' : ''}
                      {formatINR(row.delta)}
                    </span>
                  </TableShell.Cell>
                  <TableShell.Cell>
                    <StatusPill tone={row.withinBand ? 'success' : 'warning'}>
                      {row.withinBand ? t('pricing.withinBandCount') : t('pricing.breachedCount')}
                    </StatusPill>
                  </TableShell.Cell>
                </TableShell.Row>
              ))}
            </TableShell.Body>
          </TableShell>
        </div>
      )}
    </Card>
  );
}
