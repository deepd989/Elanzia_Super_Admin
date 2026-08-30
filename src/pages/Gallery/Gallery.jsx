// GALLERY - not a feature screen and not registered in the nav.
// Every primitive and shared component, in every state, on one page. When a
// component changes, this is where you confirm nothing else broke.
import { useState } from 'react';
import { PageHeader, Tabs, Button, Toast } from '@/components/primitives';
import { mockFlags } from '@/services/mock/_client';
import { t } from '@/i18n/en';
import PrimitivesGallery from './PrimitivesGallery';
import SharedGallery from './SharedGallery';
import { THEME } from '@/theme/tokens';

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
            {failing ? 'Mock failures ON' : 'Mock failures OFF'}
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
  const swatches = Object.entries(THEME.colors).flatMap(([name, value]) =>
    typeof value === 'string'
      ? [{ name, hex: value }]
      : Object.entries(value).map(([shade, hex]) => ({
          name: shade === 'DEFAULT' ? name : `${name}.${shade}`,
          hex,
        })),
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 font-display text-xl">Colours</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map((swatch) => (
            <div key={swatch.name} className="overflow-hidden rounded-md border border-lightGray-dark bg-white">
              <div className="h-14" style={{ backgroundColor: swatch.hex }} />
              <div className="p-2">
                <p className="font-mono text-xs text-charcoal">{swatch.name}</p>
                <p className="font-mono text-xs uppercase text-charcoal-lighter">{swatch.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl">Type</h2>
        <div className="flex flex-col gap-3 rounded-md border border-lightGray-dark bg-white p-5">
          <p className="font-display text-3xl">Display 3xl - Ethic Serif</p>
          <p className="font-display text-2xl">Display 2xl - page titles</p>
          <p className="font-display text-lg">Display lg - card titles</p>
          <p className="font-body text-md">Body md - Gilroy</p>
          <p className="font-body text-base">Body base - the default reading size</p>
          <p className="font-body text-sm text-charcoal-light">Body sm - secondary text</p>
          <p className="font-body text-xs text-charcoal-lighter">Body xs - help text and captions</p>
          <p className="font-mono text-sm num">Mono - 24ABCDE1234F1Z5 · 1,50,000 · 12.400 g</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl">Radii and shadows</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(THEME.shadows)
            .filter(([name]) => name !== 'none')
            .map(([name, shadow]) => (
              <div
                key={name}
                className="flex h-20 w-32 items-center justify-center rounded-md bg-white font-mono text-xs text-charcoal-light"
                style={{ boxShadow: shadow }}
              >
                shadow-{name === 'DEFAULT' ? 'default' : name}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
