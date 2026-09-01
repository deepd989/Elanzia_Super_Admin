// GALLERY - not a feature screen and not registered in the nav.
// Every primitive and shared component, in every state, on one page. When a
// component changes, this is where you confirm nothing else broke.
import { useState } from 'react';
import { PageHeader, Tabs, Button, Toast } from '@/components/primitives';
import { mockFlags } from '@/services/mock/_client';
import { t } from '@/i18n/en';
import PrimitivesGallery from './PrimitivesGallery';
import SharedGallery from './SharedGallery';
import { THEME, RAMPS, ALIASES } from '@/theme/tokens';

const TABS = [
  { id: 'primitives', label: t('gallery.primitives') },
  { id: 'shared', label: t('gallery.shared') },
  { id: 'tokens', label: 'Tokens' },
];

export default function Gallery() {
  const [tab, setTab] = useState('primitives');
  const [failing, setFailing] = useState(false);

  // Flipping this makes every mock request reject, so error states can be
  // exercised on real screens without touching any screen code.
  const toggleFailures = () => {
    const next = !failing;
    setFailing(next);
    if (typeof window !== 'undefined') window.MOCK_FAILURES = next;
    if (!next) mockFlags.reset();
  };

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow="Internal"
        title={t('gallery.title')}
        subtitle={t('gallery.subtitle')}
        actions={
          <Button variant={failing ? 'danger' : 'secondary'} onClick={toggleFailures}>
            {failing ? 'Mock failures on' : 'Mock failures off'}
          </Button>
        }
      />

      {failing ? (
        <Toast
          tone="warning"
          title="Every mock request is now failing"
          body="window.MOCK_FAILURES is true. Turn it off to restore normal responses."
          autoDismissMs={0}
        />
      ) : null}

      <Tabs tabs={TABS} activeId={tab} onChange={setTab} />

      {tab === 'primitives' ? <PrimitivesGallery /> : null}
      {tab === 'shared' ? <SharedGallery /> : null}
      {tab === 'tokens' ? <TokensGallery /> : null}
    </div>
  );
}

function TokensGallery() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 font-heading text-h2">The ramps</h2>
        <p className="mb-4 max-w-[78ch] text-sm text-charcoal-light">
          Layer one. Fixed, and identical in light and dark. Every family is normalised, so step 600
          carries the same contrast in emerald, gold, neutral and danger. Components never read
          these.
        </p>
        <div className="flex flex-col gap-2">
          {Object.entries(RAMPS).map(([family, steps]) => (
            <div key={family} className="flex items-center gap-0">
              <span className="w-[74px] shrink-0 text-micro font-bold capitalize text-charcoal-light">
                {family}
              </span>
              {Object.entries(steps).map(([step, hex]) => (
                <span
                  key={step}
                  title={`${family}-${step} ${hex}`}
                  className="h-7 min-w-0 flex-1 first:rounded-l-xs last:rounded-r-xs"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-heading text-h2">The aliases</h2>
        <p className="mb-4 max-w-[78ch] text-sm text-charcoal-light">
          Layer two, and the only layer a component reads. Each swatch below is drawn from the live
          variable, so switching the theme repaints this section without a re-render.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Object.keys(ALIASES.light)
            .filter((name) => !name.startsWith('shadow-') && !name.startsWith('focus-'))
            .map((name) => (
              <div key={name} className="overflow-hidden rounded-md border border-border bg-white">
                <div className="h-12 border-b border-border" style={{ background: `var(--${name})` }} />
                <p className="id p-2 text-charcoal">--{name}</p>
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-h2">Type</h2>
        <div className="flex flex-col gap-3 rounded-md border border-border bg-white p-card">
          <p className="dsp">Display - Ethic Serif</p>
          <p className="h1">Page title - h1</p>
          <p className="h2">Section title - h2</p>
          <p className="h3">Block title - h3, and the first step in Figtree</p>
          <p className="font-body text-body">Body - the default reading size</p>
          <p className="sm text-charcoal-light">Small - secondary text</p>
          <p className="lb">Label - field and column labels, sentence case</p>
          <p className="mi text-charcoal-tertiary">Micro - hints and captions</p>
          <p className="id text-charcoal">ELZ-TH-4471 - identifiers, as issued</p>
          <p className="num">1,50,000 · 12.400 g · 22K 916</p>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-heading text-h2">Radius</h2>
        <p className="mb-4 max-w-[78ch] text-sm text-charcoal-light">
          Six steps, assigned by object type rather than chosen per screen.
        </p>
        <div className="flex flex-wrap gap-4">
          {Object.entries(THEME.radii).map(([name, value]) => (
            <div
              key={name}
              className="flex h-20 w-32 flex-col items-center justify-center gap-1 border-2 border-border-strong bg-white"
              style={{ borderRadius: value }}
            >
              <span className="id text-charcoal">{name}</span>
              <span className="text-micro text-charcoal-tertiary">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-heading text-h2">Shadow</h2>
        <p className="mb-4 max-w-[78ch] text-sm text-charcoal-light">
          Four floating layers, and nothing else in the portal casts a shadow. A card, a table and a
          banner separate with a hairline.
        </p>
        <div className="flex flex-wrap gap-6">
          {['dropdown', 'modal', 'toast', 'sheet'].map((name) => (
            <div
              key={name}
              className="flex h-20 w-32 items-center justify-center rounded-md bg-white text-sm text-charcoal-light"
              style={{ boxShadow: `var(--shadow-${name})` }}
            >
              {name}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
