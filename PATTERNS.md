# Screen patterns

Copy-paste markup blocks. Every screen follows one of these.

**Screens copy these blocks. They do not import them.** If two screens end up
with near-identical markup, that is correct and expected - it is what lets
screen 62 diverge from screen 61 without a prop being added to something
shared. Read the component policy in `CLAUDE.md` before you reach for
abstraction.

Everything below uses only tokens, the 16 primitives and the 6 shared
components. No hex, no font name, no spacing literal, no user-facing string.

Standard imports at the top of a screen:

```jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Plus, Search } from 'lucide-react';
import { Button, Input, PageHeader, Select, StatusPill } from '@/components/primitives';
import { TableShell } from '@/components';
import { formatDate, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';
```

---

## 1. Queue and list page

**When:** any screen whose job is "here are the rows, filter them, open one".
Applications, orders, products, settlement runs, tickets.

Structure is always the same four bands: page header, filter row, table,
pagination footer. The pagination footer belongs to `TableShell`, so it is
passed as a prop rather than written as a fourth block.

```jsx
export default function ManufacturerApplications() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { applications, total, query, viewState } = useSelector(selectApplicationQueue);

  useEffect(() => {
    dispatch(fetchList());
  }, [dispatch, query]);

  // Handlers.
  const handleSearch = (event) => dispatch(setSearch(event.target.value));
  const handleStatus = (event) =>
    dispatch(setFilters({ ...query.filters, status: event.target.value }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('onboarding.eyebrow')}
        title={t('onboarding.applicationsTitle')}
        subtitle={t('onboarding.applicationsSubtitle')}
        meta={<StatusPill tone="warning" label={t('onboarding.pendingCount', { count: total })} />}
        actions={
          <>
            <Button variant="secondary" iconLeft={Download}>{t('common.export')}</Button>
            <Button iconLeft={Plus}>{t('onboarding.invite')}</Button>
          </>
        }
      />

      {/* Filter row. Search first and widest, then the narrow selects, then
          the clear action pushed right. Same order on every queue. */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('onboarding.searchPlaceholder')}
          value={query.search}
          onChange={handleSearch}
        />
        <Select
          id="status"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={handleStatus}
          options={STATUS_OPTIONS}
        />
        <Select
          id="city"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.city}
          onChange={handleCity}
          options={CITY_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setPage(page))}
            onPageSizeChange={(size) => dispatch(setPageSize(size))}
          />
        }
      >
        {/* head and body: see pattern 2, states: see pattern 7 */}
      </TableShell>
    </div>
  );
}
```

Filter options are a module-level constant above the component, built from
`t()`:

```jsx
const STATUS_OPTIONS = [
  { value: 'applied', label: t('onboarding.status.applied') },
  { value: 'under_review', label: t('onboarding.status.underReview') },
  { value: 'approved', label: t('onboarding.status.approved') },
  { value: 'rejected', label: t('onboarding.status.rejected') },
];
```

---

## 2. Table internals

**When:** inside every `TableShell`.

`TableShell` gives you sticky header, fixed row height, hover, borders and the
pagination footer. It has no columns config and no sorting logic, and it never
will. You write the rows.

```jsx
const COLUMN_COUNT = 8; // keep in step with the header - StateRow spans it

<TableShell footer={/* ... */}>
  <TableShell.Head>
    {/* Bulk-select column is always first and always this narrow. */}
    <TableShell.SelectCell header>
      <Checkbox
        id="select-all"
        checked={allSelected}
        indeterminate={someSelected}
        onChange={handleSelectAll}
      />
    </TableShell.SelectCell>

    <TableShell.HeadCell>{t('onboarding.column.business')}</TableShell.HeadCell>
    <TableShell.HeadCell>{t('onboarding.column.city')}</TableShell.HeadCell>
    <TableShell.HeadCell>{t('onboarding.column.gstin')}</TableShell.HeadCell>

    {/* The screen owns sort state. This renders the affordance only. */}
    <TableShell.SortableHeadCell
      direction={query.sortBy === 'appliedAt' ? query.sortDir : null}
      onSort={() => handleSort('appliedAt')}
    >
      {t('onboarding.column.applied')}
    </TableShell.SortableHeadCell>

    {/* Money and weight columns are right aligned, always. */}
    <TableShell.HeadCell align="right">{t('onboarding.column.gmv')}</TableShell.HeadCell>
    <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
    <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
  </TableShell.Head>

  <TableShell.Body>
    {applications.map((application) => (
      <TableShell.Row
        key={application.id}
        selected={selectedIds.includes(application.id)}
        onClick={() => navigate(`/onboarding/applications/${application.id}`)}
      >
        <TableShell.SelectCell>
          <Checkbox
            id={`select-${application.id}`}
            checked={selectedIds.includes(application.id)}
            onChange={() => handleToggle(application.id)}
          />
        </TableShell.SelectCell>

        {/* Two-line cell: the identifier, then the thing that disambiguates it. */}
        <TableShell.Cell>
          <span className="font-medium text-charcoal">{application.businessName}</span>
          <span className="block text-xs text-charcoal-light">{application.contactName}</span>
        </TableShell.Cell>

        <TableShell.Cell>{application.city}</TableShell.Cell>
        <TableShell.Cell className="font-mono text-xs">{application.gstin}</TableShell.Cell>

        {/* Absolute date on top, relative underneath - an ageing queue item
            has to be obvious without doing arithmetic. */}
        <TableShell.Cell>
          {formatDate(application.appliedAt)}
          <span className="block text-xs text-charcoal-light">
            {formatRelativeTime(application.appliedAt)}
          </span>
        </TableShell.Cell>

        {/* numeric adds tabular figures so the column aligns on the decimal. */}
        <TableShell.Cell align="right" numeric>
          {formatINR(application.lifetimeGmv)}
        </TableShell.Cell>

        <TableShell.Cell>
          <StatusPill tone={STATUS_TONES[application.status]} label={application.status} />
        </TableShell.Cell>

        {/* ActionsCell stops click propagation, so row-click and button-click
            do not fight. Two buttons maximum; a third goes in the detail page. */}
        <TableShell.ActionsCell>
          <Button size="sm" variant="ghost">{t('common.view')}</Button>
        </TableShell.ActionsCell>
      </TableShell.Row>
    ))}
  </TableShell.Body>
</TableShell>
```

Status vocabulary maps onto a tone at the top of the file, never inline:

```jsx
const STATUS_TONES = {
  applied: 'info',
  under_review: 'info',
  info_requested: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
};
```

The bulk action bar sits between the filter row and the table, and only when
something is selected:

```jsx
{selectedIds.length > 0 ? (
  <div className="flex items-center gap-3 rounded-md border border-accent bg-accent-light/20 px-4 py-2.5">
    <span className="text-base font-medium text-primary">
      {t('common.selectedCount', { count: selectedIds.length })}
    </span>
    <Button size="sm" variant="secondary" onClick={handleBulkApprove}>
      {t('common.approve')}
    </Button>
    <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
      {t('common.cancel')}
    </Button>
  </div>
) : null}
```

---

## 3. Detail page

**When:** one record, opened from a queue. Two columns: the record on the
left, the facts that never change on the right.

The right panel is `lg:sticky` so the identifiers stay on screen while the
left column scrolls. Tabs go above both columns, not inside the left one.

```jsx
export default function ManufacturerDetail() {
  const { manufacturerId } = useParams();
  const [tab, setTab] = useState('overview');
  const { manufacturer, viewState } = useSelector(selectManufacturerDetail);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('manufacturers.eyebrow')}
        title={manufacturer.businessName}
        subtitle={`${manufacturer.city} · ${t('manufacturers.appliedOn', {
          date: formatDate(manufacturer.appliedAt),
        })}`}
        meta={<StatusPill tone={STATUS_TONES[manufacturer.status]} label={manufacturer.status} />}
        actions={
          <>
            <Button variant="secondary">{t('common.edit')}</Button>
            <Button variant="danger">{t('manufacturers.suspend')}</Button>
          </>
        }
      />

      <Tabs
        activeId={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: t('common.overview') },
          { id: 'catalogue', label: t('manufacturers.catalogue'), count: manufacturer.productCount },
          { id: 'orders', label: t('manufacturers.orders'), count: manufacturer.orderCount },
          { id: 'history', label: t('common.history') },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Left: the tab body. Cards stacked, never side by side - the right
            panel already owns the horizontal space. */}
        <div className="flex min-w-0 flex-col gap-6">
          {tab === 'overview' ? <OverviewTab manufacturer={manufacturer} /> : null}
          {tab === 'catalogue' ? <CatalogueTab manufacturer={manufacturer} /> : null}
        </div>

        {/* Right: the meta panel. Identifiers and dates only. Nothing that
            changes as you move between tabs. */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card title={t('common.details')}>
            <dl className="flex flex-col gap-3">
              <MetaRow label={t('manufacturers.gstin')} value={manufacturer.gstin} mono />
              <MetaRow label={t('manufacturers.pan')} value={manufacturer.pan} mono />
              <MetaRow label={t('manufacturers.contact')} value={manufacturer.contactName} />
              <MetaRow label={t('manufacturers.phone')} value={formatPhone(manufacturer.phone)} />
              <MetaRow label={t('common.createdAt')} value={formatDate(manufacturer.appliedAt)} />
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// Local sub-component, same file. Meta rows repeat enough within one screen
// to be worth naming, and not enough across screens to be worth sharing.
function MetaRow({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd className={cn('text-right text-base text-charcoal', mono && 'font-mono text-xs')}>
        {value}
      </dd>
    </div>
  );
}
```

---

## 4. Split review

**When:** a reviewer looks at evidence and makes a decision. Verification
workspaces, product moderation, return inspection, dispute review.

`SplitReviewLayout` is layout only. It pins the decision form so the approve
and reject buttons never scroll off while the reviewer reads page 6 of a PDF.

```jsx
export default function VerificationWorkspace() {
  const [decision, setDecision] = useState('');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  // Rejecting without a written reason produces an applicant who cannot fix
  // anything, so the note is required for everything except a clean approve.
  const noteRequired = decision !== '' && decision !== 'approve';
  const canSubmit = decision !== '' && acknowledged && (!noteRequired || note.trim().length > 0);

  return (
    <SplitReviewLayout
      header={
        <PageHeader
          eyebrow={t('onboarding.eyebrow')}
          title={application.businessName}
          subtitle={`${application.city} · ${formatRelativeTime(application.appliedAt)}`}
          meta={<StatusPill tone="info" label={application.status} />}
        />
      }
      media={<MediaViewer items={application.documents} onDownload={handleDownload} />}
      decisionTitle={t('onboarding.decisionTitle')}
      decision={
        <div className="flex flex-col gap-field">
          {/* The facts the reviewer checks the documents against, right next
              to the documents. */}
          <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
            <MetaRow label={t('manufacturers.gstin')} value={application.gstin} mono />
            <MetaRow label={t('manufacturers.bisLicence')} value={application.bisLicence} mono />
          </dl>

          <Select
            id="decision"
            label={t('onboarding.decision')}
            required
            placeholder={t('onboarding.chooseDecision')}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            options={DECISION_OPTIONS}
          />

          <Textarea
            id="note"
            rows={5}
            label={t('onboarding.reviewerNote')}
            required={noteRequired}
            help={t('onboarding.reviewerNoteHelp')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <Checkbox
            id="acknowledge"
            label={t('onboarding.acknowledge')}
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
        </div>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>{t('common.cancel')}</Button>
          <Button disabled={!canSubmit} loading={saveStatus === 'loading'} onClick={handleSubmit}>
            {t('common.submit')}
          </Button>
        </div>
      }
    />
  );
}
```

---

## 5. Form page

**When:** creating or editing a record. Settings, role editor, rate cards,
invite forms.

Field groups are `Card`s. Labels, help text and validation come from the
primitives, so a form never styles a label itself. The footer is sticky at the
bottom of the page, not the bottom of the last card.

```jsx
export default function EditRateCard() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const setField = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) dispatch(saveRateCard(form));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.editRateCard')}
        subtitle={t('pricing.editRateCardSubtitle')}
      />

      {/* One Card per field group. Two columns on desktop, one on mobile.
          A field that needs the full width gets md:col-span-2. */}
      <Card title={t('pricing.groupIdentity')} description={t('pricing.groupIdentityHelp')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="name"
            label={t('pricing.name')}
            required
            value={form.name}
            error={errors.name}
            onChange={setField('name')}
          />
          <Select
            id="purity"
            label={t('units.purity')}
            required
            value={form.purity}
            error={errors.purity}
            onChange={setField('purity')}
            options={PURITY_OPTIONS}
          />
          <Textarea
            id="description"
            className="md:col-span-2"
            label={t('common.notes')}
            help={t('pricing.descriptionHelp')}
            value={form.description}
            onChange={setField('description')}
          />
        </div>
      </Card>

      <Card title={t('pricing.groupCharges')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="wastagePercent"
            type="number"
            label={t('price.wastage')}
            required
            help={t('pricing.wastageHelp')}
            value={form.wastagePercent}
            error={errors.wastagePercent}
            onChange={setField('wastagePercent')}
          />
        </div>
      </Card>

      {/* Sticky footer. Cancel on the left of the primary, always in this
          order, so muscle memory works across all 99 screens. */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-2">
          {Object.keys(errors).length > 0 ? (
            <p className="mr-auto text-sm text-danger">{t('validation.fixErrors')}</p>
          ) : null}
          <Button variant="secondary" type="button" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saveStatus === 'loading'}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </form>
  );
}
```

Validation is a plain function above the component, returning a field-keyed
map. No validation library, no schema config.

```jsx
function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = t('validation.requiredField');
  if (!form.purity) errors.purity = t('validation.requiredField');
  if (Number(form.wastagePercent) < 0) errors.wastagePercent = t('validation.mustBePositive');
  return errors;
}
```

---

## 6. Dashboard

**When:** the landing screen of a feature area. Metrics across the top, charts
below, recent activity last.

```jsx
export default function OperationsDashboard() {
  const { metrics, gmvSeries, activity, viewState } = useSelector(selectOperationsDashboard);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.subtitle')} />

      {/* Four tiles on desktop, two on tablet, one on mobile. Never five -
          a fifth metric belongs on a second row or is not a headline metric. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('dashboard.gmv')}
          value={formatINRCompact(metrics.gmv)}
          icon={IndianRupee}
          trend={{ direction: 'up', value: metrics.gmvChange, label: t('dashboard.vsLastMonth') }}
          onClick={() => navigate('/orders')}
        />
        <MetricTile
          label={t('dashboard.activeJewellers')}
          value={formatNumber(metrics.activeJewellers)}
          icon={Users}
          trend={{ direction: 'down', value: metrics.jewellerChange, label: t('dashboard.vsLastMonth') }}
        />
        {/* invertTrend where up is bad. The tile cannot guess this. */}
        <MetricTile
          label={t('dashboard.returnRate')}
          value={formatPercent(metrics.returnRate)}
          icon={Package}
          invertTrend
          trend={{ direction: 'up', value: metrics.returnChange, label: t('dashboard.vsLastMonth') }}
        />
        <MetricTile
          label={t('dashboard.pendingSettlement')}
          value={formatINRCompact(metrics.pendingSettlement)}
          icon={Banknote}
        />
      </div>

      {/* Charts. Colours come from chartColors, axis styling from the spread
          props - a screen never writes a hex or an axis style. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('dashboard.gmvByMonth')}
          description={t('dashboard.confirmedOnly')}
          status={viewState === 'populated' ? 'succeeded' : viewState}
          onRetry={() => dispatch(fetchDashboard())}
          legend={[{ label: t('dashboard.gmv'), color: chartColors[0] }]}
        >
          <BarChart data={gmvSeries}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="month" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Bar dataKey="gmv" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title={t('dashboard.ordersByMonth')} status="succeeded">
          <LineChart data={gmvSeries}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="month" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={40} />
            <Tooltip {...chartTooltipProps} />
            <Line type="monotone" dataKey="orders" stroke={chartColors[1]} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
      </div>

      {/* Activity list. Not a table - there is nothing to sort or paginate. */}
      <Card
        title={t('dashboard.recentActivity')}
        action={<Button variant="link">{t('common.viewAll')}</Button>}
        padded={false}
      >
        <ul className="divide-y divide-lightGray">
          {activity.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-base text-charcoal">{entry.summary}</p>
                <p className="text-xs text-charcoal-light">{entry.actor}</p>
              </div>
              <span className="shrink-0 text-xs text-charcoal-light">
                {formatRelativeTime(entry.at)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
```

---

## 7. The four states

**When:** every list and every detail screen. No exceptions.

The screen does not re-derive the state. `listViewState()` in
`src/store/createListSlice.js` returns one of
`'loading' | 'empty' | 'empty-filtered' | 'error' | 'populated'`, and the
selector hands it over as `viewState`.

**Empty and empty-filtered are different states and the distinction matters.**
An empty collection invites the user to create the first record. A collection
filtered down to nothing invites them to widen the filters. Showing "nothing
here yet" to someone who just typed a search is a bug.

### Inside a table

```jsx
<TableShell.Body>
  {viewState === 'populated' ? (
    applications.map((application) => (
      <TableShell.Row key={application.id}>{/* pattern 2 */}</TableShell.Row>
    ))
  ) : (
    <TableShell.StateRow colSpan={COLUMN_COUNT}>
      {viewState === 'loading' ? <QueueSkeleton /> : null}
      {viewState === 'error' ? (
        <ErrorState onRetry={() => dispatch(fetchList())} />
      ) : null}
      {viewState === 'empty-filtered' ? (
        <EmptyState
          icon={Filter}
          title={t('states.emptyFilteredTitle')}
          body={t('states.emptyFilteredBody')}
          actionLabel={t('common.clearFilters')}
          onAction={() => dispatch(clearFilters())}
        />
      ) : null}
      {viewState === 'empty' ? (
        <EmptyState
          title={t('onboarding.emptyTitle')}
          body={t('onboarding.emptyBody')}
          actionLabel={t('onboarding.invite')}
          onAction={handleInvite}
        />
      ) : null}
    </TableShell.StateRow>
  )}
</TableShell.Body>
```

### The loading skeleton

Bars at the row height the real rows will occupy, so the table does not jump
when data lands. Local sub-component, same file, sized to that screen's
columns. There is no shared Skeleton component and there should not be - the
column widths are different on every screen.

```jsx
function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
```

### On a detail page

The whole page switches, because there is no header to render before the
record has loaded.

```jsx
if (viewState === 'loading') return <DetailSkeleton />;
if (viewState === 'error') {
  return <ErrorState onRetry={() => dispatch(fetchDetail(manufacturerId))} />;
}
if (viewState === 'empty') {
  return (
    <EmptyState
      title={t('manufacturers.notFoundTitle')}
      body={t('manufacturers.notFoundBody')}
      actionLabel={t('common.back')}
      onAction={() => navigate('/manufacturers')}
    />
  );
}
```

### Saving is not loading

A form mid-save keeps its fields on screen and puts the spinner in the button.
Never swap a form for a page spinner - the user loses what they typed from
view and cannot tell whether it was sent.

```jsx
<Button type="submit" loading={saveStatus === 'loading'}>{t('common.saveChanges')}</Button>
```

---

## 8. Modal and confirm dialog

**When:** `Modal` for a short focused task that would be a wasteful page
(invite, request information, quick edit). `ConfirmDialog` for anything
destructive or irreversible.

Anything longer than about six fields is a page, not a modal.

```jsx
const [inviteOpen, setInviteOpen] = useState(false);

<Modal
  open={inviteOpen}
  onClose={() => setInviteOpen(false)}
  title={t('access.inviteTitle')}
  description={t('access.inviteDescription')}
  footer={
    <>
      <Button variant="secondary" onClick={() => setInviteOpen(false)}>
        {t('common.cancel')}
      </Button>
      <Button loading={actionStatus === 'loading'} onClick={handleInvite}>
        {t('access.sendInvite')}
      </Button>
    </>
  }
>
  <div className="flex flex-col gap-field">
    <Input id="invite-name" label={t('access.fullName')} required value={form.name} onChange={setField('name')} />
    <Input id="invite-email" label={t('access.email')} required type="email" value={form.email} onChange={setField('email')} />
    <Select id="invite-role" label={t('access.role')} required options={ROLE_OPTIONS} value={form.roleId} onChange={setField('roleId')} />
  </div>
</Modal>
```

`ConfirmDialog` states the consequence, not the action. "This hides their 34
live listings immediately" is useful; "Are you sure?" is not.

```jsx
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleSuspend}
  loading={actionStatus === 'loading'}
  title={t('manufacturers.suspendTitle')}
  body={t('manufacturers.suspendBody', { count: manufacturer.productCount })}
  confirmLabel={t('manufacturers.suspend')}
/>
```

Confirmation is required before: suspending or deactivating an account,
rejecting an application, cancelling an order, processing a refund, deleting a
role, starting an impersonation session, and publishing anything to a public
surface.

---

## 9. Money, weight and date formatting

**When:** always. Never call `toLocaleString` in a screen, never write a
currency symbol, never hand-roll a date.

```jsx
import {
  formatINR, formatINRCompact, formatAmount,
  formatGrams, formatPurity, formatPercent, formatNumber,
  formatDate, formatDateTime, formatRelativeTime, daysSince,
  formatPhone, formatId,
} from '@/utils/format';
```

| Situation | Call | Renders |
| --- | --- | --- |
| Money in a table or detail row | `formatINR(150000)` | `₹1,50,000` |
| Money on an invoice line | `formatINR(150000, { paise: true })` | `₹1,50,000.00` |
| Money on a dashboard tile | `formatINRCompact(24500000)` | `₹2.45 Cr` |
| Money in a column with a unit header | `formatAmount(150000)` | `1,50,000` |
| Weight, anywhere | `formatGrams(12.4)` | `12.400 g` |
| Weight without the unit | `formatGrams(12.4, { unit: false })` | `12.400` |
| Purity | `formatPurity(22)` | `22K` |
| A date | `formatDate(iso)` | `14 Mar 2026` |
| A date and time | `formatDateTime(iso)` | `14 Mar 2026, 4:32 pm` |
| Queue ageing | `formatRelativeTime(iso)` | `3 days ago` |
| An SLA badge | `daysSince(iso)` | `3` |

Rules that are not negotiable:

- **Indian digit grouping.** `1,50,000`, never `150,000`. `formatINR` and
  `formatAmount` already do this. A raw number in JSX does not.
- **Weight always to 3 decimals.** A jeweller who reads `12.4g` where the
  record says `12.400g` assumes the portal is rounding their gold away.
- **Money and weight columns are right aligned and use `numeric`**, which
  turns on tabular figures so the digits line up down the column.
- **Absolute date plus relative underneath** in queue tables. Absolute alone
  in detail panels, where precision matters more than ageing.
- **A null renders as `-`,** which every formatter already returns. Do not
  write `value ?? '-'` in a screen.

```jsx
{/* Right, in a table */}
<TableShell.Cell align="right" numeric>{formatINR(order.total)}</TableShell.Cell>
<TableShell.Cell align="right" numeric>{formatGrams(order.totalNetWeight)}</TableShell.Cell>

{/* Wrong */}
<TableShell.Cell>₹{order.total.toLocaleString()}</TableShell.Cell>
<TableShell.Cell>{order.totalNetWeight} g</TableShell.Cell>
```

The full price composition is never assembled by a screen. `PriceBreakup` is
shared precisely because that arithmetic is a domain rule:

```jsx
<PriceBreakup breakup={product.price} />
```

---

# The design system

The authority is `elanzia-trade-design-system-v3.html` at the repo root. This
section records the rules that a screen can get wrong, not the whole file.

## Two token layers, and never cross them

`src/theme/tokens.js` holds both, and `npm run theme` turns it into
`src/theme/tokens.generated.css`. Do not edit the generated file.

- **The ramps** are 45 fixed values in four families - emerald, gold, neutral,
  danger. Identical in light and dark. Normalised, so step 600 is equally
  legible in every family.
- **The aliases** are 40 semantic names: `--surface-page`, `--action-bg`,
  `--text-secondary`, `--status-positive-fg`. Dark mode is these 40 names given
  new values, nothing more.

A component reads the aliases, never the ramps. Write `var(--action-bg)`, not
`var(--emerald-600)`. In practice a screen writes neither: it writes a Tailwind
class, and `src/theme/tailwind-preset.js` maps that class to an alias.

The class vocabulary is historic in places. `primary` is the colour of things
you can act on. `charcoal` is the text ramp. `lightGray` is grounds and rules.

## Density

The portal runs `data-density="condensed"`, set on `<html>` in `index.html`. It
is an admin console and pointer only: 32px controls, 36px rows, 13.5px body.

Reach for `h-control`, `h-row`, `px-cellX`, `py-cellY`, `p-card` and the
`text-body` / `text-sm` / `text-label` / `text-micro` steps rather than fixed
sizes. All of them follow density, so the same markup is correct on a screen
that runs relaxed.

## Radius says what a thing is

Six steps, assigned by object type. This is not a per-screen choice.

| Step | Value | What takes it |
| --- | --- | --- |
| `rounded-none` | 0 | documents: price breakup, invoice, hallmark, rate board |
| `rounded-xs` | 4px | checkbox, stamp, progress bar, thumbnail |
| `rounded-sm` | 8px | the work layer: button, input, select, menu item |
| `rounded-md` | 12px | the conversation layer: card, panel, banner, modal, toast |
| `rounded-full` | 999px | pills: status chip, filter chip, count badge, avatar |

A button is never a pill. A document never rounds.

## Four things float

`shadow-dropdown`, `shadow-modal`, `shadow-toast`, `shadow-sheet`. There is
deliberately no `shadow-sm` or `shadow-md` in the preset. Everything else -
cards, tables, banners, sticky footers - separates with a hairline
`border-border`.

## Status is four tones

Positive, attention, negative, neutral. Each is a foreground / surface / border
triple, so it stays legible when the aliases are remapped:

```jsx
<span className="border border-success-border bg-success-surface text-success" />
```

`StatusPill` maps a feature area's own vocabulary onto those four. Add a name
to its `TONES` map rather than inventing a fifth colour.

## Dark mode

`data-theme` on `<html>`: `light` or `dark` is an explicit choice, absent means
follow the operating system. `src/theme/useThemePreference.js` owns it, the top
bar toggles it, and a small script in `index.html` applies a saved choice
before first paint so the wrong theme never flashes.

The one exception is the unauthenticated screens, which are **always light**,
whatever the viewer has chosen. Nobody who has yet to sign in can reach the
toggle, so that surface does not follow the preference at all. The pre-paint
script handles a cold load of `/sign-in` or `/reset-password`; `AuthLayout`
handles the redirect case, where a deep link lands on the sign-in screen after
the script has already run, and restores the stored choice on unmount so
signing in hands the portal straight back to it.

Nothing else in the portal needs to know about it. If a screen uses only
alias-backed classes, dark mode is already correct.

## Copy

- Sentence case everywhere, including buttons, labels and chips. No uppercase,
  no title case, no letter-spaced eyebrows.
- Buttons are verb plus object. "Request quotation", not "Submit".
- Errors say what is wrong, then the value that fixes it.
- Identifiers are mono, as issued, never re-cased: `ELZ-TH-4471`.
- Purity reads `22K 916`.
- A rate always carries its basis and time: `₹1,46,280 / 10 g - 15:40 IST`.
- Banned words: seamless, robust, comprehensive, cutting-edge, transformative,
  unlock, unleash, empower, elevate, streamline, leverage, journey, ecosystem,
  landscape, tapestry. Also "No X. No Y. Just Z.", "it's not just X, it's Y",
  "Welcome back, [Name]", "No data yet", and em dashes.

## Never do this

| Banned | Instead |
| --- | --- |
| Coloured left border on a card or banner | `Stamp` |
| Cream or beige grounds | Pearl White, or the dark page |
| Gold as text on white - it is 2.08:1 | `text-warning`, or gold as a fill |
| Uppercase labels, letter-spaced eyebrows | Sentence case, tracking 0 |
| Gradients, backdrop blur, glow | Flat colour, hairline borders |
| Rotated or skewed elements | Everything sits square |
| Cards on shadow, or cards inside cards | Borders. Four things cast shadow |
| Pill-shaped buttons | Radius 8. Pills are chips, badges and avatars |
| One radius on everything | Six steps, assigned by object type |
| Countdowns and live tickers | An absolute timestamp |
| Zebra striping | Hairline row rules |
| Emoji as icons | lucide-react only |
| Placeholder text as the field label | A persistent label above every field |
| Proportional figures in a column | `num` on every figure |
| A generic spinner as a page state | The real layout with the data missing |
| Four equal stat cards in a row | Figures sit in the page structure |
| A real firm's name in example content | Invented names |

Glass surfaces are Marketplace-only and are deliberately not implemented here.
Do not add `backdrop-filter` to this portal.
