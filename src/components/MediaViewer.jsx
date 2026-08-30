import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';
import Button from './primitives/Button';
import EmptyState from './primitives/EmptyState';

// Documents, images and video with zoom, rotate and page navigation.
// Shared because a reviewer looking at a GSTIN certificate and a reviewer
// looking at a product video should be driving the same controls.
//
// items: [{ id, type: 'image'|'document'|'video', url, label, caption }]
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3];

const TYPE_ICONS = { image: ImageIcon, document: FileText, video: Film };

export default function MediaViewer({ items = [], initialIndex = 0, onDownload, className }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomStep, setZoomStep] = useState(2); // index into ZOOM_STEPS, 1x
  const [rotation, setRotation] = useState(0);

  if (items.length === 0) {
    return (
      <div className={cn('rounded-md border border-lightGray-dark bg-white', className)}>
        <EmptyState icon={ImageIcon} title={t('common.attachments')} body={t('states.emptyBody')} />
      </div>
    );
  }

  const current = items[Math.min(index, items.length - 1)];
  const zoom = ZOOM_STEPS[zoomStep];

  const goTo = (next) => {
    setIndex(Math.max(0, Math.min(items.length - 1, next)));
    setZoomStep(2);
    setRotation(0);
  };

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-md border border-lightGray-dark bg-white shadow-sm', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-lightGray-dark px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-body text-base font-medium text-charcoal">{current.label}</span>
          {items.length > 1 ? (
            <span className="shrink-0 text-xs text-charcoal-light num">
              {index + 1} {t('common.of')} {items.length}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <IconAction
            label={t('common.previous')}
            icon={ChevronLeft}
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          />
          <IconAction
            label={t('common.next')}
            icon={ChevronRight}
            disabled={index >= items.length - 1}
            onClick={() => goTo(index + 1)}
          />
          <span className="mx-1 h-5 w-px bg-lightGray-dark" aria-hidden="true" />
          <IconAction
            label="Zoom out"
            icon={ZoomOut}
            disabled={zoomStep === 0}
            onClick={() => setZoomStep(zoomStep - 1)}
          />
          <span className="w-12 text-center text-xs text-charcoal-light num">
            {Math.round(zoom * 100)}%
          </span>
          <IconAction
            label="Zoom in"
            icon={ZoomIn}
            disabled={zoomStep === ZOOM_STEPS.length - 1}
            onClick={() => setZoomStep(zoomStep + 1)}
          />
          <IconAction label="Rotate" icon={RotateCw} onClick={() => setRotation((rotation + 90) % 360)} />
          {onDownload ? (
            <Button variant="ghost" size="sm" iconLeft={Download} onClick={() => onDownload(current)}>
              {t('common.download')}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-[24rem] items-center justify-center overflow-auto bg-lightGray p-6">
        <Surface item={current} zoom={zoom} rotation={rotation} />
      </div>

      {current.caption ? (
        <p className="border-t border-lightGray-dark px-4 py-2.5 text-sm text-charcoal-light">
          {current.caption}
        </p>
      ) : null}

      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-lightGray-dark bg-white p-3">
          {items.map((item, itemIndex) => {
            const Icon = TYPE_ICONS[item.type] ?? FileText;
            const isActive = itemIndex === index;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(itemIndex)}
                aria-current={isActive}
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border-2',
                  'focus:outline-none focus-visible:shadow-focus',
                  isActive ? 'border-accent' : 'border-lightGray-dark hover:border-charcoal-lighter',
                )}
              >
                {item.type === 'image' && item.url ? (
                  <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                ) : (
                  <Icon size={18} className="text-charcoal-light" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Surface({ item, zoom, rotation }) {
  const style = { transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center' };

  if (item.type === 'video') {
    return (
      <video src={item.url} controls className="max-h-[32rem] max-w-full rounded shadow-md" style={style}>
        <track kind="captions" />
      </video>
    );
  }

  if (item.type === 'image' && item.url) {
    return (
      <img
        src={item.url}
        alt={item.label}
        className="max-h-[32rem] max-w-full rounded shadow-md"
        style={style}
      />
    );
  }

  // Documents render as a page surface. The real viewer swaps in here.
  return (
    <div
      className="flex h-[28rem] w-[20rem] flex-col items-center justify-center gap-3 rounded bg-white shadow-md"
      style={style}
    >
      <FileText size={40} className="text-charcoal-lighter" aria-hidden="true" />
      <span className="px-6 text-center text-sm text-charcoal-light">{item.label}</span>
    </div>
  );
}

function IconAction({ label, icon: Icon, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded text-charcoal',
        'hover:bg-lightGray focus:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:text-charcoal-lighter disabled:hover:bg-transparent',
      )}
    >
      <Icon size={16} />
    </button>
  );
}
