import { Suspense, lazy, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminShell from '@/layouts/AdminShell';
import Spinner from '@/components/primitives/Spinner';
import EmptyState from '@/components/primitives/EmptyState';
import { allRoutes, authRoutes, navigation, sectionsForPermissions } from '@/config/navigation';
import { selectShellSession } from '@/store/slices/accessSlice';
import { t } from '@/i18n/en';

// The router is generated from src/config/navigation.js. Registering a screen
// there is the only step needed to make it reachable.
export default function App() {
  const shellRoutes = useMemo(
    () => allRoutes().map((route) => ({ ...route, Component: lazy(route.element) })),
    [],
  );
  const unauthenticatedRoutes = useMemo(
    () => authRoutes.map((route) => ({ ...route, Component: lazy(route.element) })),
    [],
  );

  return (
    <Routes>
      {/* Unauthenticated screens render outside the shell. */}
      {unauthenticatedRoutes.map(({ id, path, Component }) => (
        <Route
          key={id}
          path={path}
          element={
            <Suspense fallback={<FullPageFallback />}>
              <Component />
            </Suspense>
          }
        />
      ))}

      <Route
        element={
          <RequireAuth>
            <AdminShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />

        {shellRoutes.map(({ id, path, permission, Component }) => (
          <Route
            key={id}
            path={path}
            element={
              <RequirePermission permission={permission}>
                <Suspense fallback={<RouteFallback />}>
                  <Component />
                </Suspense>
              </RequirePermission>
            }
          />
        ))}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// 2FA is mandatory, so there is no partial sign-in that reaches the shell.
// Anything short of an authenticated session goes back to ADM-001.
function RequireAuth({ children }) {
  const { isAuthenticated } = useSelector(selectShellSession);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return children;
}

// Typing a URL must not reach a screen the role's nav does not offer. The
// route guard and the sidebar read the same permission, so they cannot drift.
function RequirePermission({ permission, children }) {
  const { grantedPermissions } = useSelector(selectShellSession);

  if (permission && !grantedPermissions.includes(permission)) {
    return (
      <EmptyState
        title={t('access.noPermissionTitle')}
        body={t('access.noPermissionBody')}
      />
    );
  }
  return children;
}

// Land on the first screen this role can actually reach, which is not the same
// screen for every role.
function HomeRedirect() {
  const { grantedPermissions } = useSelector(selectShellSession);
  const sections = sectionsForPermissions(grantedPermissions);
  const target = sections[0]?.items?.[0]?.path ?? navigation[0]?.items?.[0]?.path ?? '/gallery';

  return <Navigate to={target} replace />;
}

function RouteFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function FullPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lightGray">
      <Spinner size="lg" />
    </div>
  );
}

function NotFound() {
  return (
    <EmptyState
      title={t('states.notFoundTitle')}
      body={t('states.notFoundBody')}
      actionLabel={t('common.back')}
      onAction={() => window.history.back()}
    />
  );
}
