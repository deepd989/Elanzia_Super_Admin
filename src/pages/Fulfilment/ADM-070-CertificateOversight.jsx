// ADM-070
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BadgeCheck, CalendarClock, Copy, Search, TriangleAlert } from 'lucide-react';
import {
  Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal,
  PageHeader, Select, StatusPill, Tabs, Textarea,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearCertificateFilters, clearCertificateFlag, closeCertificateDetail,
  fetchCertificate, fetchCertificateCounts, fetchCertificates, flagCertificate,
  selectCertificateOversight, setCertificateFilters, setCertificatePage,
  setCertificatePageSize, setCertificateSearch,
} from '@/store/slices/trustSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatNumber, formatPurity } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = {
  valid: 'success', flagged: 'danger', missing: 'danger',
  expired: 'warning', duplicate: 'danger',
};

const FLAG_REASONS = ['purity_mismatch', 'duplicate_huid', 'expired', 'unreadable', 'not_found'];

const COLUMN_COUNT = 7;

export default function CertificateOversight() {
  const dispatch = useDispatch();

  // Data.
  const {
    certificates, total, query, counts, detail, viewState, actionStatus, actionError, error,
  } = useSelector(selectCertificateOversight);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canAudit = grantedPermissions.includes('catalogue.certificates.audit');

  const [flagging, setFlagging] = useState(null);
  const [flagForm, setFlagForm] = useState({ reason: '', note: '' });
  const [clearing, setClearing] = useState(null);
  const [clearNote, setClearNote] = useState('');

  useEffect(() => {
    dispatch(fetchCertificates());
    dispatch(fetchCertificateCounts());
  }, [dispatch, query]);

  // Handlers.
  const handleFlag = async () => {
    const result = await dispatch(flagCertificate({ id: flagging.id, ...flagForm }));
    if (!result.error) {
      setFlagging(null); setFlagForm({ reason: '', note: '' });
      dispatch(fetchCertificates()); dispatch(fetchCertificateCounts());
    }
  };

  const handleClear = async () => {
    const result = await dispatch(clearCertificateFlag({ id: clearing.id, note: clearNote }));
    if (!result.error) {
      setClearing(null); setClearNote('');
      dispatch(fetchCertificates()); dispatch(fetchCertificateCounts());
    }
  };

  const kindTabs = [
    { id: '', label: t('common.all'), count: total },
    ...Object.entries(counts?.byKind ?? {}).map(([kind, count]) => ({
      id: kind, label: t(`trust.certificateKind.${kind}`), count,
    })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('trust.eyebrow')}
        title={t('trust.certificatesTitle')}
        subtitle={t('trust.certificatesSubtitle')}
        meta={<StatusPill tone="neutral">{t('trust.certificatesScope')}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('trust.tileCritical')} value={formatNumber(counts?.criticalOpen ?? 0)} icon={TriangleAlert} invertTrend loading={!counts} />
        <MetricTile label={t('trust.tileMismatches')} value={formatNumber(counts?.mismatches ?? 0)} icon={BadgeCheck} invertTrend loading={!counts} />
        <MetricTile label={t('trust.tileDuplicates')} value={formatNumber(counts?.duplicates ?? 0)} icon={Copy} invertTrend loading={!counts} />
        <MetricTile label={t('trust.tileExpiring')} value={formatNumber(counts?.expiringSoon ?? 0)} icon={CalendarClock} invertTrend loading={!counts} />
      </div>

      <Tabs
        activeId={query.filters.kind}
        onChange={(kind) => dispatch(setCertificateFilters({ ...query.filters, kind }))}
        tabs={kindTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('logistics.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setCertificateSearch(event.target.value))}
        />
        <Select
          id="state" className="w-44" placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) => dispatch(setCertificateFilters({ ...query.filters, state: event.target.value }))}
          options={Object.keys(STATE_TONES).map((value) => ({ value, label: t(`trust.certificateState.${value}`) }))}
        />
        <Select
          id="severity" className="w-40" placeholder={t('common.all')}
          value={query.filters.severity}
          onChange={(event) => dispatch(setCertificateFilters({ ...query.filters, severity: event.target.value }))}
          options={['low', 'medium', 'critical'].map((value) => ({ value, label: value }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearCertificateFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setCertificatePage(page))}
            onPageSizeChange={(size) => dispatch(setCertificatePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('trust.columnKind')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnNumber')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnPiece')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnPurity')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('trust.columnIssued')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            certificates.map((certificate) => (
              <TableShell.Row key={certificate.id} onClick={() => dispatch(fetchCertificate(certificate.id))}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{certificate.kindLabel}</span>
                  <span className="block text-xs text-charcoal-light">{certificate.issuer}</span>
                </TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">
                  {certificate.number ?? <span className="text-danger">{t('trust.certificateState.missing')}</span>}
                </TableShell.Cell>
                <TableShell.Cell>
                  <span className="text-charcoal">{certificate.productTitle}</span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {certificate.sku} · {certificate.manufacturerName}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {certificate.certifiedPurity && certificate.certifiedPurity !== certificate.declaredPurity ? (
                    <span className="text-danger">
                      {t('trust.declaredVsCertified', {
                        declared: formatPurity(certificate.declaredPurity),
                        certified: formatPurity(certificate.certifiedPurity),
                      })}
                    </span>
                  ) : (
                    formatPurity(certificate.declaredPurity)
                  )}
                </TableShell.Cell>
                <TableShell.Cell>
                  {certificate.issuedAt ? formatDate(certificate.issuedAt) : '-'}
                  {certificate.expiresAt ? (
                    <span className="block text-xs text-charcoal-light">
                      {t('trust.columnExpires')} {formatDate(certificate.expiresAt)}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATE_TONES[certificate.state]}>
                    {t(`trust.certificateState.${certificate.state}`)}
                  </StatusPill>
                  {certificate.severity === 'critical' ? (
                    <Badge tone="danger" className="ml-1">!</Badge>
                  ) : null}
                  {certificate.flagDetail ? (
                    <span className="block max-w-sm text-xs text-charcoal-light">{certificate.flagDetail}</span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.ActionsCell>
                  {canAudit && certificate.state === 'flagged' ? (
                    <Button size="sm" variant="ghost" onClick={() => setClearing(certificate)}>
                      {t('trust.clearFlag')}
                    </Button>
                  ) : canAudit && certificate.state !== 'missing' ? (
                    <Button size="sm" variant="ghost" onClick={() => setFlagging(certificate)}>
                      {t('trust.flagCertificate')}
                    </Button>
                  ) : null}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchCertificates())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearCertificateFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <CertificateDetailModal detail={detail} onClose={() => dispatch(closeCertificateDetail())} />

      <Modal
        open={Boolean(flagging)}
        onClose={() => setFlagging(null)}
        title={t('trust.flagTitle')}
        description={t('trust.flagBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFlagging(null)}>{t('common.cancel')}</Button>
            <Button loading={actionStatus === 'loading'} onClick={handleFlag}>{t('trust.flagCertificate')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-field">
          <Select
            id="flag-reason" label={t('trust.flagReasonLabel')} required placeholder={t('common.none')}
            value={flagForm.reason}
            onChange={(event) => setFlagForm({ ...flagForm, reason: event.target.value })}
            options={FLAG_REASONS.map((value) => ({ value, label: t(`trust.flagReason.${value}`) }))}
          />
          <Textarea
            id="flag-note" rows={3} label={t('trust.flagNote')}
            value={flagForm.note}
            onChange={(event) => setFlagForm({ ...flagForm, note: event.target.value })}
          />
          {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(clearing)}
        onClose={() => setClearing(null)}
        onConfirm={handleClear}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('trust.clearFlagTitle')}
        body={t('trust.clearFlagBody')}
        confirmLabel={t('trust.clearFlag')}
      >
        <Textarea
          id="clear-note" className="mt-4" rows={3} required label={t('trust.flagNote')}
          value={clearNote} onChange={(event) => setClearNote(event.target.value)}
        />
        {actionError ? <p className="mt-2 text-sm text-danger">{actionError.message}</p> : null}
      </ConfirmDialog>
    </div>
  );
}

function CertificateDetailModal({ detail, onClose }) {
  const certificate = detail.certificate;

  return (
    <Modal
      open={detail.status !== 'idle'}
      onClose={onClose}
      size="md"
      title={certificate ? `${certificate.kindLabel} · ${certificate.sku}` : t('common.loading')}
      footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}
    >
      {detail.status === 'failed' ? (
        <ErrorState detail={detail.error?.message} />
      ) : !certificate ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col gap-2 text-sm">
            <Row label={t('trust.columnNumber')} value={certificate.number ?? '-'} />
            <Row label={t('trust.columnIssued')} value={certificate.issuedAt ? formatDate(certificate.issuedAt) : '-'} />
            <Row label={t('trust.columnExpires')} value={certificate.expiresAt ? formatDate(certificate.expiresAt) : '-'} />
            <Row label={t('trust.columnPiece')} value={certificate.productTitle} />
          </dl>

          {detail.relatedCertificates.length > 0 ? (
            <div>
              <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-lighter">
                {t('trust.relatedCertificates')}
              </p>
              <ul className="flex flex-col gap-1.5">
                {detail.relatedCertificates.map((related) => (
                  <li key={related.id} className="flex items-center gap-2 text-sm">
                    <StatusPill tone={STATE_TONES[related.state]} size="sm">
                      {t(`trust.certificateState.${related.state}`)}
                    </StatusPill>
                    <span className="text-charcoal">{related.kindLabel}</span>
                    <span className="font-mono text-xs text-charcoal-light">{related.sku}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-charcoal-light">{label}</dt>
      <dd className="text-right text-charcoal">{value}</dd>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
