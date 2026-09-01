// ADM-073
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, QrCode, Tent } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Tabs,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearExhibitionDraft,
  fetchExhibitions,
  fetchStalls,
  issueStallQr,
  saveExhibition,
  saveStall,
  selectExhibitionSetup,
  setActiveShow,
  setExhibitionDraftField,
  startExhibitionDraft,
} from '@/store/slices/growthSlice';
import { formatDate, formatINR, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const SHOW_TONES = { planned: 'info', live: 'success', closed: 'neutral', cancelled: 'danger' };

const STATUS_OPTIONS = ['planned', 'live', 'closed', 'cancelled'].map((value) => ({
  value,
  label: t(`growth.showStatus.${value}`),
}));

const COLUMN_COUNT = 6;

export default function ExhibitionSetup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    shows,
    activeShowId,
    activeShow,
    stalls,
    stallsState,
    stallsWithoutQr,
    draft,
    dirty,
    saveStatus,
    saveError,
    actionStatus,
    actionError,
    readOnly,
    viewState,
    error,
  } = useSelector(selectExhibitionSetup);

  const [reissuing, setReissuing] = useState(null);
  const [stallDraft, setStallDraft] = useState(null);

  useEffect(() => {
    dispatch(fetchExhibitions());
  }, [dispatch]);

  useEffect(() => {
    if (activeShowId) dispatch(fetchStalls(activeShowId));
  }, [dispatch, activeShowId]);

  // Handlers.
  const setField = (field) => (event) =>
    dispatch(setExhibitionDraftField({ field, value: event.target.value }));

  const handleSaveShow = async () => {
    const result = await dispatch(saveExhibition(draft));
    if (!result.error) dispatch(clearExhibitionDraft());
  };

  const handleSaveStall = async () => {
    const result = await dispatch(saveStall({ showId: activeShowId, stall: stallDraft }));
    if (!result.error) setStallDraft(null);
  };

  const handleReissue = async () => {
    const result = await dispatch(issueStallQr({ showId: activeShowId, stallId: reissuing.id }));
    if (!result.error) setReissuing(null);
  };

  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchExhibitions())} />;
  }

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.exhibitionsTitle')}
        subtitle={t('growth.exhibitionsSubtitle')}
        meta={
          activeShow ? (
            <StatusPill tone={SHOW_TONES[activeShow.status]}>
              {t(`growth.showStatus.${activeShow.status}`)}
            </StatusPill>
          ) : null
        }
        actions={
          <>
            {activeShow ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/growth/exhibitions/${activeShowId}/report`)}
              >
                {t('growth.showReportNavLabel')}
              </Button>
            ) : null}
            <Button iconLeft={Plus} onClick={() => dispatch(startExhibitionDraft())}>
              {t('growth.addShow')}
            </Button>
          </>
        }
      />

      {viewState === 'loading' ? <ShowSkeleton /> : null}

      {viewState === 'empty' ? (
        <Card>
          <EmptyState
            icon={Tent}
            title={t('states.emptyTitle')}
            body={t('states.emptyBody')}
            actionLabel={t('growth.addShow')}
            onAction={() => dispatch(startExhibitionDraft())}
          />
        </Card>
      ) : null}

      {viewState === 'populated' ? (
        <>
          <Tabs
            activeId={activeShowId}
            onChange={(showId) => dispatch(setActiveShow(showId))}
            tabs={shows.map((show) => ({ id: show.id, label: show.name, count: show.stallCount }))}
          />

          {activeShow ? <ShowPanel show={activeShow} onEdit={() => dispatch(startExhibitionDraft(activeShow))} readOnly={readOnly} /> : null}

          {/* A closed show is a historical record. Its numbers were reported to
              the workshops that paid for the stalls, so nothing here moves. */}
          {readOnly ? (
            <p className="rounded border border-neutral-border bg-neutral-surface px-4 py-3 text-sm text-charcoal">
              {t('growth.showClosedNotice')}
            </p>
          ) : null}

          {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

          <Card
            title={t('growth.stallsTitle')}
            description={
              stallsWithoutQr > 0 ? t('growth.stallsWithoutQr', { count: stallsWithoutQr }) : undefined
            }
            action={
              readOnly ? null : (
                <Button
                  size="sm"
                  variant="secondary"
                  iconLeft={Plus}
                  onClick={() => setStallDraft({ id: null, code: '', hallName: 'Hall 1', manufacturerId: '' })}
                >
                  {t('growth.addStall')}
                </Button>
              )
            }
            padded={false}
          >
            <TableShell maxHeight="30rem">
              <TableShell.Head>
                <TableShell.HeadCell>{t('growth.columnStall')}</TableShell.HeadCell>
                <TableShell.HeadCell>{t('growth.columnWorkshop')}</TableShell.HeadCell>
                <TableShell.HeadCell>{t('growth.columnCode')}</TableShell.HeadCell>
                <TableShell.HeadCell align="right">{t('growth.columnScans')}</TableShell.HeadCell>
                <TableShell.HeadCell align="right">{t('growth.tileConnections')}</TableShell.HeadCell>
                <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
              </TableShell.Head>

              <TableShell.Body>
                {stallsState === 'succeeded' && stalls.length > 0 ? (
                  stalls.map((stall) => (
                    <StallRow
                      key={stall.id}
                      stall={stall}
                      readOnly={readOnly}
                      busy={actionStatus === 'loading'}
                      onIssue={() => dispatch(issueStallQr({ showId: activeShowId, stallId: stall.id }))}
                      onReissue={() => setReissuing(stall)}
                    />
                  ))
                ) : (
                  <TableShell.StateRow colSpan={COLUMN_COUNT}>
                    {stallsState === 'loading' ? <StallSkeleton /> : null}
                    {stallsState === 'failed' ? (
                      <ErrorState onRetry={() => dispatch(fetchStalls(activeShowId))} />
                    ) : null}
                    {stallsState === 'succeeded' ? (
                      <EmptyState title={t('growth.stallsTitle')} body={t('states.emptyBody')} />
                    ) : null}
                  </TableShell.StateRow>
                )}
              </TableShell.Body>
            </TableShell>
          </Card>
        </>
      ) : null}

      <ShowModal
        draft={draft}
        dirty={dirty}
        saving={saveStatus === 'loading'}
        saveError={saveError}
        onField={setField}
        onClose={() => dispatch(clearExhibitionDraft())}
        onSave={handleSaveShow}
      />

      <StallModal
        draft={stallDraft}
        saving={actionStatus === 'loading'}
        actionError={actionError}
        onChange={setStallDraft}
        onClose={() => setStallDraft(null)}
        onSave={handleSaveStall}
      />

      <ConfirmDialog
        open={Boolean(reissuing)}
        onClose={() => setReissuing(null)}
        onConfirm={handleReissue}
        loading={actionStatus === 'loading'}
        title={t('growth.reissueTitle', { code: reissuing?.code ?? '' })}
        body={t('growth.reissueBody')}
        confirmLabel={t('growth.reissueQr')}
      />
    </div>
  );
}

function ShowPanel({ show, onEdit, readOnly }) {
  return (
    <Card
      title={show.name}
      description={`${show.venue} · ${show.city}`}
      action={
        readOnly ? null : (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {t('common.edit')}
          </Button>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label={t('growth.showStarts')} value={formatDate(show.startsOn)} />
        <Stat label={t('growth.showEnds')} value={formatDate(show.endsOn)} />
        <Stat label={t('growth.tileScans')} value={formatNumber(show.scanCount)} />
        <Stat label={t('growth.tileConnections')} value={formatNumber(show.connectionCount)} />
        <Stat label={t('growth.tilePipeline')} value={formatINR(show.taggedEnquiryValue)} />
      </dl>
      {show.notes ? <p className="mt-4 text-sm text-charcoal-light">{show.notes}</p> : null}
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-light">{label}</dt>
      <dd className="font-heading text-lg text-charcoal">{value}</dd>
    </div>
  );
}

function StallRow({ stall, readOnly, busy, onIssue, onReissue }) {
  return (
    <TableShell.Row>
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{stall.code}</span>
        <span className="block text-xs text-charcoal-light">{stall.hallName}</span>
      </TableShell.Cell>

      <TableShell.Cell>{stall.manufacturerName}</TableShell.Cell>

      <TableShell.Cell>
        {stall.qrToken ? (
          <>
            <span className="font-mono text-xs text-charcoal">{stall.qrToken}</span>
            <span className="block text-xs text-charcoal-light">
              {t('growth.qrVersion', { version: stall.qrVersion })}
            </span>
          </>
        ) : (
          <Badge tone="outline">{t('growth.qrNotIssued')}</Badge>
        )}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>{formatNumber(stall.scanCount)}</TableShell.Cell>
      <TableShell.Cell align="right" numeric>{formatNumber(stall.connectionCount)}</TableShell.Cell>

      <TableShell.ActionsCell>
        {readOnly ? null : stall.qrToken ? (
          <Button size="sm" variant="ghost" iconLeft={QrCode} onClick={onReissue}>
            {t('growth.reissueQr')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" iconLeft={QrCode} loading={busy} onClick={onIssue}>
            {t('growth.issueQr')}
          </Button>
        )}
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function ShowModal({ draft, dirty, saving, saveError, onField, onClose, onSave }) {
  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft?.id ? t('common.edit') : t('growth.addShow')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button disabled={!dirty} loading={saving} onClick={onSave}>{t('common.saveChanges')}</Button>
        </>
      }
    >
      {draft ? (
        <div className="flex flex-col gap-field">
          <Input id="show-name" label={t('growth.showName')} required value={draft.name} onChange={onField('name')} />
          <Input id="show-venue" label={t('growth.showVenue')} value={draft.venue} onChange={onField('venue')} />
          <Input id="show-city" label={t('growth.showCity')} value={draft.city} onChange={onField('city')} />
          <div className="grid grid-cols-2 gap-field">
            <Input id="show-starts" type="date" label={t('growth.showStarts')} required value={draft.startsOn} onChange={onField('startsOn')} />
            <Input id="show-ends" type="date" label={t('growth.showEnds')} required value={draft.endsOn} onChange={onField('endsOn')} />
          </div>
          <Select id="show-status" label={t('common.status')} value={draft.status} onChange={onField('status')} options={STATUS_OPTIONS} />
          <Textarea id="show-notes" rows={2} label={t('growth.showNotes')} value={draft.notes ?? ''} onChange={onField('notes')} />
          {saveError ? <p className="text-sm text-danger">{saveError.message}</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}

function StallModal({ draft, saving, actionError, onChange, onClose, onSave }) {
  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={t('growth.addStall')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={onSave}>{t('common.saveChanges')}</Button>
        </>
      }
    >
      {draft ? (
        <div className="flex flex-col gap-field">
          <Input
            id="stall-code"
            label={t('growth.columnCode')}
            required
            value={draft.code}
            onChange={(event) => onChange({ ...draft, code: event.target.value })}
          />
          <Input
            id="stall-hall"
            label={t('growth.columnHall')}
            value={draft.hallName}
            onChange={(event) => onChange({ ...draft, hallName: event.target.value })}
          />
          <Input
            id="stall-manufacturer"
            label={t('growth.columnWorkshop')}
            required
            value={draft.manufacturerId}
            onChange={(event) => onChange({ ...draft, manufacturerId: event.target.value })}
          />
          {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}

function ShowSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-12 animate-pulse rounded-md bg-lightGray-dark" />
      <div className="h-32 animate-pulse rounded-md bg-lightGray-dark" />
      <div className="h-64 animate-pulse rounded-md bg-lightGray-dark" />
    </div>
  );
}

function StallSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
