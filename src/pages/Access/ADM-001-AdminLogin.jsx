// ADM-001
import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@/components/primitives';
import AuthLayout from '@/layouts/AuthLayout';
import { demoCredentials } from '@/data/accessFixtures';
import { adminUsers } from '@/data/core';
import {
  resetSignIn,
  selectSignIn,
  setIdentifier,
  setSignInMethod,
  signIn,
} from '@/store/slices/accessSlice';
import { t } from '@/i18n/en';

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data.
  const { step, method, identifier, status, error } = useSelector(selectSignIn);
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // A stale challenge from a previous visit would drop the user straight onto
  // the verify screen, so the flow is reset whenever sign-in is opened fresh.
  useEffect(() => {
    if (step !== 'credentials' && step !== 'authenticated') dispatch(resetSignIn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The password check never signs anyone in - 2FA is mandatory for every
  // admin role, so a successful credential check always advances to ADM-002.
  useEffect(() => {
    if (step === 'otp_sent' || step === 'two_factor') navigate('/sign-in/verify');
  }, [step, navigate]);

  // Handlers.
  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!identifier.trim()) nextErrors.identifier = t('validation.requiredField');
    if (method === 'password' && !password) nextErrors.password = t('validation.requiredField');
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    dispatch(signIn({ identifier, password, method }));
  };

  const toggleMethod = () => {
    setPassword('');
    setFieldErrors({});
    dispatch(setSignInMethod(method === 'password' ? 'otp' : 'password'));
  };

  // Markup.
  return (
    <AuthLayout
      title={t('access.signInTitle')}
      subtitle={t('access.signInSubtitle')}
      footer={
        <Link
          to="/reset-password"
          className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
        >
          {t('access.forgotPassword')}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-field">
        <Input
          id="identifier"
          label={t('access.identifier')}
          help={t('access.identifierHelp')}
          autoComplete="username"
          required
          value={identifier}
          error={fieldErrors.identifier}
          onChange={(event) => dispatch(setIdentifier(event.target.value))}
        />

        {method === 'password' ? (
          <Input
            id="password"
            type="password"
            label={t('access.password')}
            autoComplete="current-password"
            required
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
        ) : null}

        {error ? <SignInError error={error} /> : null}

        <Button type="submit" fullWidth loading={status === 'loading'}>
          {t('access.signIn')}
        </Button>

        <Button type="button" variant="link" className="self-center" onClick={toggleMethod}>
          {method === 'password' ? t('access.signInWithOtp') : t('access.signInWithPassword')}
        </Button>
      </form>

      <DemoHint />
    </AuthLayout>
  );
}

// Sign-in failures are not all the same. A locked account needs waiting out, a
// pending invite needs the email accepting, and neither is fixed by retyping
// the password.
function SignInError({ error }) {
  const tone =
    error.code === 'account_locked' || error.code === 'account_deactivated'
      ? 'border-danger/30 bg-danger-surface text-danger'
      : 'border-warning/30 bg-warning-surface text-warning';

  return (
    <p role="alert" className={`rounded border px-3 py-2 text-sm ${tone}`}>
      {error.message}
    </p>
  );
}

// A prototype still has to be signed into. Hiding the seeded credentials in a
// fixture file costs the next person an afternoon. The email is read from the
// fixture rather than written out, so it stays true if the fixture changes.
function DemoHint() {
  const rows = [
    [t('access.demoEmail'), adminUsers[0].email],
    [t('access.demoPassword'), demoCredentials.password],
    [t('access.demoOtp'), demoCredentials.otpCode],
    [t('access.demoTwoFactor'), demoCredentials.twoFactorCode],
  ];

  return (
    <div className="mt-6 rounded border border-lightGray-dark bg-lightGray p-3">
      <p className="font-body text-xs font-semibold uppercase tracking-wide text-charcoal-light">
        {t('access.demoTitle')}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-charcoal-light">{label}</dt>
            <dd className="font-mono text-charcoal">{value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
