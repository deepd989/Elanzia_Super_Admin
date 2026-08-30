import { ShieldCheck } from 'lucide-react';
import { t } from '@/i18n/en';

// The frame for the three unauthenticated screens. It deliberately shows no
// navigation, no breadcrumb and no member data - somebody who has not proved
// who they are should not be able to read the shape of the portal off the
// sign-in page.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <header className="flex h-topBarHeight shrink-0 items-baseline gap-2 px-gutter text-white">
        <span className="font-display text-lg leading-none">{t('app.name')}</span>
        <span className="font-body text-xs uppercase tracking-widest text-accent">
          {t('app.portal')}
        </span>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h1 className="font-display text-xl leading-tight text-primary">{title}</h1>
            {subtitle ? <p className="mt-2 text-base text-charcoal-light">{subtitle}</p> : null}

            <div className="mt-6">{children}</div>
          </div>

          {footer ? <div className="mt-4 text-center">{footer}</div> : null}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/60">
            <ShieldCheck size={13} aria-hidden="true" />
            {t('access.twoFactorRequired')}
          </p>
        </div>
      </div>
    </div>
  );
}
