// ADM-003
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import { Button, Input } from '@/components/primitives';
import AuthLayout from '@/layouts/AuthLayout';
import {
  requestPasswordReset,
  resetPassword,
  selectPasswordReset,
  setIdentifier,
} from '@/store/slices/accessSlice';
import { t } from '@/i18n/en';

// Three steps on one screen: ask for the address, enter the emailed code and
// a new password, done. The step comes from the slice rather than local state
// so a failed reset cannot leave the screen showing the wrong stage.
export default function PasswordReset() {
  const dispatch = useDispatch();

  // Data.
  const { step, resetToken, identifier, maskedDestination, status, error } =
    useSelector(selectPasswordReset);

  const [form, setForm] = useState({ code: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  // Handlers.
  const handleRequest = (event) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setFieldErrors({ identifier: t('validation.requiredField') });
      return;
    }
    setFieldErrors({});
    dispatch(requestPasswordReset({ identifier }));
  };

  const handleReset = (event) => {
    event.preventDefault();
    setFieldErrors(validateReset(form));
    if (Object.keys(validateReset(form)).length > 0) return;

    dispatch(resetPassword({ resetToken, code: form.code, password: form.password }));
  };

  // Markup.
  if (step === 'reset_done') {
    return (
      <AuthLayout title={t('access.resetDoneTitle')} subtitle={t('access.resetDoneSubtitle')}>
        <div className="flex flex-col items-center gap-5 py-2">
          <CheckCircle2 size={40} className="text-success" aria-hidden="true" />
          <Link to="/sign-in" className="w-full">
            <Button fullWidth>{t('access.backToSignIn')}</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'reset_sent') {
    return (
      <AuthLayout
        title={t('access.resetSentTitle')}
        subtitle={t('access.resetSentSubtitle', { destination: maskedDestination ?? '' })}
        footer={<BackLink />}
      >
        <form onSubmit={handleReset} className="flex flex-col gap-field">
          <Input
            id="code"
            label={t('access.code')}
            help={t('access.codeHelp')}
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            value={form.code}
            error={fieldErrors.code}
            onChange={(event) =>
              setForm({ ...form, code: event.target.value.replace(/\D/g, '') })
            }
          />
          <Input
            id="password"
            type="password"
            label={t('access.resetNewPassword')}
            help={t('access.resetPasswordHelp')}
            autoComplete="new-password"
            required
            value={form.password}
            error={fieldErrors.password}
            onChange={setField('password')}
          />
          <Input
            id="confirmPassword"
            type="password"
            label={t('access.resetConfirmPassword')}
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={setField('confirmPassword')}
          />

          {error ? (
            <p role="alert" className="rounded border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger">
              {error.message}
            </p>
          ) : null}

          <Button type="submit" fullWidth loading={status === 'loading'}>
            {t('access.resetSubmit')}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('access.resetTitle')}
      subtitle={t('access.resetSubtitle')}
      footer={<BackLink />}
    >
      <form onSubmit={handleRequest} className="flex flex-col gap-field">
        <Input
          id="identifier"
          label={t('access.identifier')}
          autoComplete="username"
          required
          autoFocus
          value={identifier}
          error={fieldErrors.identifier}
          onChange={(event) => dispatch(setIdentifier(event.target.value))}
        />

        <Button type="submit" fullWidth loading={status === 'loading'}>
          {t('access.resetSendCode')}
        </Button>
      </form>
    </AuthLayout>
  );
}

function BackLink() {
  return (
    <Link
      to="/sign-in"
      className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
    >
      {t('access.backToSignIn')}
    </Link>
  );
}

function validateReset(form) {
  const errors = {};
  if (!/^\d{6}$/.test(form.code)) errors.code = t('validation.invalidCode');
  if (form.password.length < 10) errors.password = t('validation.passwordTooShort');
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = t('validation.passwordMismatch');
  }
  return errors;
}
