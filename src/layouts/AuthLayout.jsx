import { ShieldCheck } from 'lucide-react';
import { t } from '@/i18n/en';

// The frame for the three unauthenticated screens. It deliberately shows no
// navigation, no breadcrumb and no member data - somebody who has not proved
// who they are should not be able to read the shape of the portal off the
// sign-in page.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-inverse">
      <header className="flex h-topBarHeight shrink-0 items-baseline gap-2 px-gutter text-onInverse">
        <span className="font-heading text-h3 leading-none">{t('app.name')}</span>
        <span className="font-body text-micro font-semibold text-accent">
          {t('app.portal')}
        </span>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-md bg-white p-8">
            <h1 className="font-heading text-h2 leading-tight text-charcoal">{title}</h1>
            {subtitle ? <p className="mt-2 text-body text-charcoal-light">{subtitle}</p> : null}

            <div className="mt-6">{children}</div>
          </div>

          {footer ? <div className="mt-4 text-center">{footer}</div> : null}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-micro text-onInverse/70">
            <ShieldCheck size={13} aria-hidden="true" />
            {t('access.twoFactorRequired')}
          </p>
        </div>
      </div>
    </div>
  );
}
