import { useState } from 'react';
import { Download, Filter, Plus, Search, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Tabs,
  Textarea,
  Toast,
} from '@/components/primitives';
import { t } from '@/i18n/en';
import { Row, Section, Stack } from './GallerySection';

const SELECT_OPTIONS = [
  { value: 'rajkot', label: 'Rajkot' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'jaipur', label: 'Jaipur' },
];

export default function PrimitivesGallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div className="flex flex-col gap-10">
      <Section id="button" title="Button">
        <Row label="variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row label="sizes">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="with icons">
          <Button iconLeft={Plus}>Add manufacturer</Button>
          <Button variant="secondary" iconLeft={Download}>Export</Button>
          <Button variant="danger" iconLeft={Trash2}>Remove</Button>
        </Row>
        <Row label="loading and disabled">
          <Button loading>Approving</Button>
          <Button variant="secondary" loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>Disabled</Button>
        </Row>
        <Row label="full width">
          <div className="w-64"><Button fullWidth>Full width</Button></div>
        </Row>
      </Section>

      <Section id="input" title="Input, Select, Textarea, Checkbox">
        <Stack label="input states">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input id="g-in-1" label="Business name" placeholder="Shree Balaji Jewels" />
            <Input id="g-in-2" label="Search" placeholder={t('common.search')} iconLeft={Search} />
            <Input id="g-in-3" label="GSTIN" required help="15 characters, state code first" />
            <Input id="g-in-4" label="GSTIN" defaultValue="24ABCDE" error={t('validation.invalidGstin')} />
            <Input id="g-in-5" label="PAN" defaultValue="ABCDE1234F" disabled />
            <Input id="g-in-6" label="Commission" type="number" defaultValue={4.5} help="Percent of goods value" />
          </div>
        </Stack>

        <Stack label="select states">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select id="g-sel-1" label="City" options={SELECT_OPTIONS} placeholder="All cities" />
            <Select id="g-sel-2" label="City" options={SELECT_OPTIONS} error={t('validation.requiredField')} required />
            <Select id="g-sel-3" label="City" options={SELECT_OPTIONS} disabled />
          </div>
        </Stack>

        <Stack label="textarea states">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Textarea id="g-ta-1" label="Rejection reason" placeholder="Explain what the applicant must fix" />
            <Textarea id="g-ta-2" label="Notes" error={t('validation.tooLong')} defaultValue="..." />
            <Textarea id="g-ta-3" label="Notes" disabled defaultValue="Locked after approval" />
          </div>
        </Stack>

        <Stack label="checkbox states">
          <Checkbox id="g-cb-1" label="Hallmarked pieces only" />
          <Checkbox id="g-cb-2" label="Include archived" defaultChecked help="Archived listings stay searchable" />
          <Checkbox id="g-cb-3" label="Partially selected" indeterminate />
          <Checkbox id="g-cb-4" label="Locked after approval" disabled />
        </Stack>
      </Section>

      <Section id="statuspill" title="StatusPill and Badge" note="Tones, not statuses. Feature areas map their vocabulary onto a tone.">
        <Row label="statuspill tones">
          <StatusPill tone="neutral" label="draft" />
          <StatusPill tone="info" label="under_review" />
          <StatusPill tone="warning" label="info_requested" />
          <StatusPill tone="success" label="approved" />
          <StatusPill tone="danger" label="rejected" />
          <StatusPill tone="accent" label="private" />
        </Row>
        <Row label="with dot, small">
          <StatusPill tone="success" dot label="live" />
          <StatusPill tone="danger" dot label="payment_failed" />
          <StatusPill tone="warning" size="sm" dot label="awaiting_verification" />
        </Row>
        <Row label="badge tones">
          <Badge>12</Badge>
          <Badge tone="primary">4</Badge>
          <Badge tone="accent">99+</Badge>
          <Badge tone="danger">3</Badge>
          <Badge tone="outline">New</Badge>
        </Row>
      </Section>

      <Section id="spinner" title="Spinner">
        <Row label="sizes and tones">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <Spinner tone="accent" />
          <span className="rounded bg-primary p-2"><Spinner tone="inverse" /></span>
        </Row>
      </Section>

      <Section id="pageheader" title="PageHeader">
        <Stack label="full">
          <PageHeader
            eyebrow="Onboarding"
            title="Manufacturer applications"
            subtitle="Applications awaiting document verification, oldest first."
            meta={<StatusPill tone="warning" label="18 pending" />}
            actions={
              <>
                <Button variant="secondary" iconLeft={Download}>Export</Button>
                <Button iconLeft={Plus}>Invite manufacturer</Button>
              </>
            }
          />
        </Stack>
        <Stack label="title only">
          <PageHeader title="Settlement runs" />
        </Stack>
      </Section>

      <Section id="card" title="Card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Bank details" description="Verified against the penny drop" action={<Button size="sm" variant="ghost">{t('common.edit')}</Button>}>
            <p className="text-base text-charcoal-light">Card body content.</p>
          </Card>
          <Card>
            <p className="text-base text-charcoal-light">A card with no header at all.</p>
          </Card>
        </div>
      </Section>

      <Section id="tabs" title="Tabs">
        <Stack label="with counts">
          <Tabs
            activeId={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'pending', label: 'Pending', count: 18 },
              { id: 'approved', label: 'Approved', count: 214 },
              { id: 'rejected', label: 'Rejected', count: 7 },
              { id: 'suspended', label: 'Suspended' },
            ]}
          />
          <p className="text-sm text-charcoal-light">Active tab: {activeTab}</p>
        </Stack>
      </Section>

      <Section id="modal" title="Modal and ConfirmDialog">
        <Row label="triggers">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Open confirm dialog</Button>
        </Row>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Request more information"
          description="The applicant is notified and the application returns to their queue."
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => setModalOpen(false)}>{t('common.submit')}</Button>
            </>
          }
        >
          <Textarea id="g-modal-note" label="What is missing" rows={5} placeholder="Be specific about the document and the page" />
        </Modal>

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="Suspend this manufacturer?"
          body="Their 34 live listings are hidden immediately and open orders continue to fulfilment."
          confirmLabel="Suspend"
        />
      </Section>

      <Section id="toast" title="Toast">
        <div className="flex flex-wrap gap-3">
          <Toast tone="success" title={t('states.savedToast')} body="Application approved." autoDismissMs={0} onDismiss={() => {}} />
          <Toast tone="info" title="Export queued" body="You will get an email when it is ready." autoDismissMs={0} onDismiss={() => {}} />
          <Toast tone="warning" title="Rate card expires today" autoDismissMs={0} onDismiss={() => {}} />
          <Toast tone="danger" title={t('states.failedToast')} body="The settlement run could not start." autoDismissMs={0} onDismiss={() => {}} />
        </div>
      </Section>

      <Section id="states" title="EmptyState and ErrorState">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-lightGray-dark bg-white">
            <EmptyState />
          </div>
          <div className="rounded-md border border-lightGray-dark bg-white">
            <EmptyState
              icon={Filter}
              title={t('states.emptyFilteredTitle')}
              body={t('states.emptyFilteredBody')}
              actionLabel={t('common.clearFilters')}
              onAction={() => {}}
            />
          </div>
          <div className="rounded-md border border-lightGray-dark bg-white">
            <ErrorState detail="503 mock_failure" onRetry={() => {}} />
          </div>
        </div>
      </Section>
    </div>
  );
}
