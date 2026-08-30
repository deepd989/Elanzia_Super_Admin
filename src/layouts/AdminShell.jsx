import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  ChevronRight,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserCog,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';
import { breadcrumbFor, sectionsForPermissions } from '@/config/navigation';
import { endImpersonation, selectShellSession, signOut } from '@/store/slices/accessSlice';
import { formatRelativeTime } from '@/utils/format';
import Badge from '@/components/primitives/Badge';
import Button from '@/components/primitives/Button';

// Top bar, collapsible left nav, breadcrumb and the content slot every screen
// renders into. It owns no feature state: the nav comes entirely from
// src/config/navigation.js, filtered by the permissions the signed-in role
// actually holds.
export default function AdminShell() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  const location = useLocation();

  const { currentUser, role, grantedPermissions, activeImpersonation } =
    useSelector(selectShellSession);

  const sections = sectionsForPermissions(grantedPermissions);
  const breadcrumb = breadcrumbFor(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-lightGray">
      <TopBar currentUser={currentUser} role={role} />

      {activeImpersonation ? <ImpersonationBanner session={activeImpersonation} /> : null}

      <div className="flex flex-1">
        <SideNav
          sections={sections}
          collapsed={navCollapsed}
          onToggle={() => setNavCollapsed(!navCollapsed)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Breadcrumb trail={breadcrumb} />

          <main className="flex-1 px-gutter pb-12 pt-2">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function TopBar({ currentUser, role }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await dispatch(signOut());
    navigate('/sign-in', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-topBarHeight shrink-0 items-center gap-4 bg-primary px-gutter text-white">
      <Link to="/" className="flex items-baseline gap-2 focus:outline-none focus-visible:shadow-focus">
        <span className="font-display text-lg leading-none">{t('app.name')}</span>
        <span className="font-body text-xs uppercase tracking-widest text-accent">
          {t('app.portal')}
        </span>
      </Link>

      <div className="ml-6 hidden max-w-md flex-1 items-center gap-2 rounded bg-white/10 px-3 py-1.5 md:flex">
        <Search size={15} className="shrink-0 text-white/60" aria-hidden="true" />
        <input
          type="search"
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          className="w-full bg-transparent text-base text-white placeholder:text-white/50 focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label={t('nav.notifications')}
          className="relative rounded p-2 hover:bg-white/10 focus:outline-none focus-visible:shadow-focus"
        >
          <Bell size={17} />
          <span className="absolute right-1 top-1">
            <Badge tone="accent">3</Badge>
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t('nav.account')}
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded p-1.5 hover:bg-white/10 focus:outline-none focus-visible:shadow-focus"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-body text-xs font-semibold text-primary">
              {initialsOf(currentUser?.name)}
            </span>
            <span className="hidden text-left md:block">
              <span className="block text-sm leading-tight">{currentUser?.name ?? '-'}</span>
              <span className="block text-xs leading-tight text-white/60">{role?.name ?? '-'}</span>
            </span>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-full mt-1 w-56 overflow-hidden rounded-md border border-lightGray-dark bg-white shadow-lg">
              <Link
                to="/settings/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-base text-charcoal hover:bg-lightGray"
              >
                <UserCog size={15} aria-hidden="true" />
                {t('access.profileTitle')}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 border-t border-lightGray-dark px-4 py-2.5 text-left text-base text-danger hover:bg-lightGray"
              >
                <LogOut size={15} aria-hidden="true" />
                {t('nav.signOut')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

// An admin acting as somebody else must never be able to forget it, so this
// sits above the content in a colour nothing else in the portal uses.
function ImpersonationBanner({ session }) {
  const dispatch = useDispatch();

  return (
    <div className="sticky top-topBarHeight z-20 flex flex-wrap items-center gap-3 border-b border-warning/40 bg-warning-surface px-gutter py-2.5">
      <UserCog size={17} className="shrink-0 text-warning" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="font-body text-base font-semibold text-warning">
          {t('access.activeBannerTitle', { business: session.targetName })}
        </p>
        <p className="truncate text-xs text-charcoal-light">
          {t('access.activeBannerBody', {
            when: formatRelativeTime(session.startedAt),
            reason: session.reason,
          })}
        </p>
      </div>

      <Button size="sm" variant="secondary" iconLeft={ExternalLink}>
        {t('access.openPanel')}
      </Button>
      <Button size="sm" variant="danger" onClick={() => dispatch(endImpersonation(session.id))}>
        {t('access.endSession')}
      </Button>
    </div>
  );
}

function SideNav({ sections, collapsed, onToggle }) {
  return (
    <nav
      aria-label={t('app.portal')}
      className={cn(
        'sticky top-topBarHeight flex h-[calc(100vh-3.5rem)] shrink-0 flex-col',
        'border-r border-lightGray-dark bg-white transition-[width] duration-150',
        collapsed ? 'w-navWidthCollapsed' : 'w-navWidth',
      )}
    >
      <div className="flex-1 overflow-y-auto py-3">
        {sections.length === 0 ? (
          !collapsed ? (
            <p className="px-4 py-3 text-xs leading-relaxed text-charcoal-lighter">
              {t('nav.noSectionsForRole')}
            </p>
          ) : null
        ) : (
          sections.map((section) => (
            <div key={section.id} className="mb-4">
              {!collapsed ? (
                <p className="px-4 pb-1.5 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-lighter">
                  {t(section.label)}
                </p>
              ) : null}

              <ul>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <NavItem item={item} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        className={cn(
          'flex h-11 items-center gap-3 border-t border-lightGray-dark px-4',
          'text-charcoal-light hover:bg-lightGray focus:outline-none focus-visible:shadow-focus',
        )}
      >
        {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        {!collapsed ? <span className="text-sm">{t('nav.collapse')}</span> : null}
      </button>
    </nav>
  );
}

function NavItem({ item, collapsed }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      title={collapsed ? t(item.label) : undefined}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-3 border-l-2 px-4 font-body text-base transition-colors',
          'focus:outline-none focus-visible:shadow-focus',
          isActive
            ? 'border-accent bg-accent-light/20 font-medium text-primary'
            : 'border-transparent text-charcoal-light hover:bg-lightGray hover:text-charcoal',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {Icon ? <Icon size={17} className="shrink-0" aria-hidden="true" /> : null}
      {!collapsed ? <span className="truncate">{t(item.label)}</span> : null}
    </NavLink>
  );
}

function Breadcrumb({ trail }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1.5 px-gutter text-sm text-charcoal-light">
      <Link to="/" className="hover:text-charcoal focus:outline-none focus-visible:shadow-focus">
        {t('nav.breadcrumbRoot')}
      </Link>

      {trail.map((crumb, index) => {
        const isLast = index === trail.length - 1;
        return (
          <span key={crumb.path ?? crumb.label} className="flex items-center gap-1.5">
            <ChevronRight size={13} className="text-charcoal-lighter" aria-hidden="true" />
            {isLast ? (
              <span className="font-medium text-charcoal">{t(crumb.label)}</span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-charcoal focus:outline-none focus-visible:shadow-focus"
              >
                {t(crumb.label)}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

function initialsOf(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
