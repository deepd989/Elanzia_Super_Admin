// ADM-089
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, FileText, Lock, Search } from 'lucide-react';
import {
  Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal,
  PageHeader, Select, Spinner, StatusPill, Tabs, Textarea,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearTemplateFilters, closeTemplateEditor, fetchTemplate, fetchTemplates, previewTemplate,
  saveTemplate, selectTemplateLibrary, setEditorBody, setEditorSubject, setEditorVariant,
  setTemplateFilters, setTemplatePage, setTemplatePageSize, setTemplateSearch,
} from '@/store/slices/communicationsSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = { active: 'success', draft: 'info', archived: 'neutral' };
const APPROVAL_TONES = { approved: 'success', pending: 'warning', rejected: 'danger' };

const TAB_KINDS = ['transactional', 'marketing'];

const COLUMN_COUNT = 7;

export default function TemplateLibrary() {
  const dispatch = useDispatch();

  // Data.
  const { templates, total, query, facets, counts, viewState, editor, editorViewState, error } =
    useSelector(selectTemplateLibrary);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canManage = grantedPermissions.includes('communications.templates.manage');

  const [editingId, setEditingId] = useState(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch, query]);

  // Handlers.
  const handleOpen = (templateId) => {
    setEditingId(templateId);
    dispatch(fetchTemplate(templateId));
  };

  const handleClose = () => {
    setEditingId(null);
    dispatch(closeTemplateEditor());
  };

  const handleSave = async () => {
    const result = await dispatch(saveTemplate({
      templateId: editingId,
      variant: {
        channel: editor.channel,
        locale: editor.locale,
        subject: editor.subjectDraft,
        body: editor.bodyDraft,
      },
    }));
    if (!result.error) handleClose();
  };

  const handleArchive = async () => {
    const result = await dispatch(saveTemplate({ templateId: editingId, state: 'archived' }));
    setArchiving(false);
    if (!result.error) handleClose();
  };

  const kindTabs = [
    { id: '', label: t('common.all'), count: total },
    ...TAB_KINDS.map((kind) => ({ id: kind, label: t(`communications.kind.${kind}`) })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('communications.eyebrow')}
        title={t('communications.templatesTitle')}
        subtitle={t('communications.templatesSubtitle')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('communications.tileActive')} value={formatNumber(counts?.active ?? 0)} icon={FileText} loading={!counts} />
        <MetricTile
          label={t('communications.tileMandatory')} value={formatNumber(counts?.mandatory ?? 0)}
          caption={t('communications.mandatoryNote')} icon={Lock} loading={!counts}
        />
        <MetricTile label={t('communications.tileDrafts')} value={formatNumber(counts?.draft ?? 0)} loading={!counts} />
        <MetricTile label={t('communications.tileArchived')} value={formatNumber(counts?.archived ?? 0)} loading={!counts} />
      </div>

      <Tabs
        activeId={query.filters.kind}
        onChange={(kind) => dispatch(setTemplateFilters({ ...query.filters, kind }))}
        tabs={kindTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('communications.templateSearchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setTemplateSearch(event.target.value))}
        />
        <Select
          id="audience" className="w-48" placeholder={t('common.all')}
          value={query.filters.audience}
          onChange={(event) => dispatch(setTemplateFilters({ ...query.filters, audience: event.target.value }))}
          options={(facets?.audiences ?? []).map(({ value }) => ({ value, label: t(`communications.templateAudience.${value}`) }))}
        />
        <Select
          id="channel" className="w-40" placeholder={t('common.all')}
          value={query.filters.channel}
          onChange={(event) => dispatch(setTemplateFilters({ ...query.filters, channel: event.target.value }))}
          options={(facets?.channels ?? []).map(({ value }) => ({ value, label: t(`communications.channel.${value}`) }))}
        />
        <Select
          id="state" className="w-40" placeholder={t('common.all')}
          value={query.filters.state}
          onChange={(event) => dispatch(setTemplateFilters({ ...query.filters, state: event.target.value }))}
          options={(facets?.states ?? []).map(({ value }) => ({ value, label: t(`communications.templateState.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearTemplateFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setTemplatePage(page))}
            onPageSizeChange={(size) => dispatch(setTemplatePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('communications.columnTemplate')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnAudience')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnChannels')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnLocales')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('communications.columnVolume')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.updatedAt')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            templates.map((template) => (
              <TableShell.Row key={template.id} onClick={() => handleOpen(template.id)}>
                <TableShell.Cell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-charcoal">{template.name}</span>
                    {/* A member cannot opt out of this one, so it can never be
                        switched off. Said on the row, not only in the editor. */}
                    {template.mandatory ? (
                      <Badge tone="outline">{t('communications.mandatoryBadge')}</Badge>
                    ) : null}
                  </span>
                  <span className="block font-mono text-xs text-charcoal-light">{template.eventKey}</span>
                </TableShell.Cell>
                <TableShell.Cell>{t(`communications.templateAudience.${template.audience}`)}</TableShell.Cell>
                <TableShell.Cell className="text-xs">
                  {template.channels.map((channel) => t(`communications.channel.${channel}`)).join(', ')}
                </TableShell.Cell>
                <TableShell.Cell className="text-xs">
                  {template.locales.map((locale) => t(`communications.locale.${locale}`)).join(', ')}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatNumber(template.sentLast30Days)}
                  <span className="block text-xs text-charcoal-light">
                    {formatPercent(template.deliveryRate)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDateTime(template.updatedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(template.updatedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATE_TONES[template.state]}>
                    {t(`communications.templateState.${template.state}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchTemplates())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearTemplateFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={FileText}
                  title={t('communications.templatesEmptyTitle')}
                  body={t('communications.templatesEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <TemplateEditor
        open={Boolean(editingId)}
        editor={editor}
        viewState={editorViewState}
        canManage={canManage}
        onClose={handleClose}
        onVariant={(payload) => dispatch(setEditorVariant(payload))}
        onSubject={(value) => dispatch(setEditorSubject(value))}
        onBody={(value) => dispatch(setEditorBody(value))}
        onPreview={() => dispatch(previewTemplate({
          templateId: editingId, channel: editor.channel, locale: editor.locale,
        }))}
        onSave={handleSave}
        onArchive={() => setArchiving(true)}
      />

      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={handleArchive}
        loading={editor.saveStatus === 'loading'}
        title={t('communications.archiveTitle')}
        body={t('communications.archiveBody', { event: editor.template?.eventKey ?? '' })}
        confirmLabel={t('communications.archiveTemplate')}
      />
    </div>
  );
}

// The editor is a modal rather than a page: one variant, four fields and a
// preview is not a screen's worth of work.
function TemplateEditor({
  open, editor, viewState, canManage, onClose, onVariant, onSubject, onBody, onPreview, onSave, onArchive,
}) {
  const { template, variants, variant, preview } = editor;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={template ? t('communications.editorTitle', { name: template.name }) : t('common.loading')}
      description={template ? t('communications.editorSubtitle', {
        version: template.version, author: template.updatedByName,
      }) : null}
      footer={
        <>
          {template && editor.canArchive && canManage ? (
            <Button variant="danger" className="mr-auto" onClick={onArchive}>
              {t('communications.archiveTemplate')}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            disabled={!editor.canSave || !canManage}
            loading={editor.saveStatus === 'loading'}
            onClick={onSave}
          >
            {t('common.saveChanges')}
          </Button>
        </>
      }
    >
      {viewState === 'loading' ? <div className="flex justify-center py-12"><Spinner /></div> : null}
      {viewState === 'error' ? <ErrorState detail={editor.error?.message} /> : null}

      {viewState === 'populated' && template ? (
        <div className="flex flex-col gap-field">
          {template.mandatory ? (
            <div className="flex items-start gap-3 rounded-md border border-lightGray-dark bg-lightGray px-4 py-3">
              <Lock size={16} className="mt-0.5 shrink-0 text-charcoal-light" aria-hidden="true" />
              <p className="text-sm text-charcoal-light">{t('communications.mandatoryNote')}</p>
            </div>
          ) : null}

          <Select
            id="variant" label={t('communications.fieldVariant')}
            value={`${editor.channel}|${editor.locale}`}
            onChange={(event) => {
              const [channel, locale] = event.target.value.split('|');
              onVariant({ channel, locale });
            }}
            options={variants.map((row) => ({
              value: `${row.channel}|${row.locale}`,
              label: `${t(`communications.channel.${row.channel}`)} · ${t(`communications.locale.${row.locale}`)}`,
            }))}
          />

          {variant?.whatsappApproval ? (
            <StatusPill tone={APPROVAL_TONES[variant.whatsappApproval]} size="sm" className="self-start">
              {t(`communications.whatsappApproval.${variant.whatsappApproval}`)}
            </StatusPill>
          ) : null}

          {editor.channel === 'email' ? (
            <Input
              id="subject" label={t('communications.fieldSubject')}
              disabled={!canManage}
              value={editor.subjectDraft ?? ''}
              onChange={(event) => onSubject(event.target.value)}
            />
          ) : null}

          <Textarea
            id="template-body" rows={8}
            label={t('communications.fieldBodyLabel')}
            help={t('communications.fieldBodyHelp')}
            disabled={!canManage}
            error={editor.saveError?.message}
            value={editor.bodyDraft}
            onChange={(event) => onBody(event.target.value)}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-charcoal-light">{t('communications.variablesAvailable')}</span>
            {template.variables.map((variable) => (
              <code key={variable} className="rounded-sm bg-lightGray px-1.5 py-0.5 font-mono text-xs text-charcoal">
                {`{${variable}}`}
              </code>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-charcoal-light">
              {t('communications.characterCount', { count: editor.bodyDraft.length })}
            </span>
            <Button variant="secondary" size="sm" iconLeft={Eye} loading={editor.previewStatus === 'loading'} onClick={onPreview}>
              {t('communications.preview')}
            </Button>
          </div>

          {preview ? (
            <div className="rounded-md border border-lightGray-dark bg-lightGray p-4">
              <p className="mb-2 text-sm font-medium text-charcoal">{t('communications.previewTitle')}</p>
              {preview.subject ? (
                <p className="mb-1 text-base font-medium text-charcoal">{preview.subject}</p>
              ) : null}
              <p className="whitespace-pre-wrap text-base text-charcoal-light">{preview.body}</p>
              {preview.unresolved.length > 0 ? (
                <p className="mt-2 text-sm text-danger">
                  {t('communications.previewUnresolved', { name: preview.unresolved[0] })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
