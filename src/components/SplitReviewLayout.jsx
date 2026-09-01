import { cn } from '@/utils/cn';

// LAYOUT ONLY. Evidence on the left at whatever height it needs, decision
// form pinned on the right so the reviewer never scrolls away from the
// approve and reject buttons. Used by every verification workspace.
//
//   <SplitReviewLayout
//     media={<MediaViewer ... />}
//     decision={<form>...</form>}
//     header={<PageHeader ... />}
//   />
export default function SplitReviewLayout({
  header,
  media,
  decision,
  decisionTitle,
  footer,
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-section', className)}>
      {header}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">{media}</div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-md border border-border bg-white">
            {decisionTitle ? (
              <header className="border-b border-border px-5 py-4">
                <h2 className="font-heading text-lg leading-tight">{decisionTitle}</h2>
              </header>
            ) : null}

            <div className="flex-1 overflow-y-auto p-5">{decision}</div>

            {footer ? (
              <footer className="border-t border-border bg-surface-sunken px-5 py-4">{footer}</footer>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
