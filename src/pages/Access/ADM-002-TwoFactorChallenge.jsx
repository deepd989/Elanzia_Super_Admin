// ADM-002
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input } from '@/components/primitives';
import AuthLayout from '@/layouts/AuthLayout';
import {
  resendOtp,
  resetSignIn,
  selectTwoFactorChallenge,
  verifyOtp,
  verifyTwoFactor,
} from '@/store/slices/accessSlice';
import { t } from '@/i18n/en';

export default function TwoFactorChallenge() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data.
  const {
    step,
    challengeId,
    twoFactorMethod,
    maskedDestination,
    codeExpiresAt,
    attemptsRemaining,
    status,
    error,
    hasChallenge,
  } = useSelector(selectTwoFactorChallenge);

  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const secondsLeft = useCountdown(codeExpiresAt);

  // 2FA is mandatory, so landing here without a challenge means the URL was
  // typed. There is nothing to verify, so go back and start properly.
  useEffect(() => {
    if (!hasChallenge && step !== 'authenticated') navigate('/sign-in', { replace: true });
  }, [hasChallenge, step, navigate]);

  useEffect(() => {
    if (step === 'authenticated') navigate('/', { replace: true });
  }, [step, navigate]);

  // Clearing the box on a wrong code saves the user selecting six characters
  // before they can try again.
  useEffect(() => {
    if (error?.code === 'otp_incorrect' || error?.code === 'two_factor_incorrect') setCode('');
  }, [error]);

  // Handlers.
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setFieldError(t('validation.invalidCode'));
      return;
    }
    setFieldError(null);

    // The same screen serves both stages. `step` decides which one is being
    // answered, so an OTP sign-in still has to clear 2FA afterwards.
    if (step === 'otp_sent') dispatch(verifyOtp({ challengeId, code }));
    else dispatch(verifyTwoFactor({ challengeId, code }));
  };

  const isOtpStage = step === 'otp_sent';
  const expired = secondsLeft <= 0;

  const subtitle = isOtpStage
    ? t('access.otpSubtitle', { destination: maskedDestination ?? '' })
    : twoFactorMethod === 'sms'
      ? t('access.twoFactorSubtitleSms', { destination: maskedDestination ?? '' })
      : t('access.twoFactorSubtitleApp');

  // Markup.
  return (
    <AuthLayout
      title={isOtpStage ? t('access.otpTitle') : t('access.twoFactorTitle')}
      subtitle={subtitle}
      footer={
        <Button
          variant="ghost"
          className="text-onInverse/70"
          onClick={() => {
            dispatch(resetSignIn());
            navigate('/sign-in');
          }}
        >
          {t('access.useDifferentAccount')}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-field">
        <Input
          id="code"
          label={t('access.code')}
          help={t('access.codeHelp')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.4em]"
          value={code}
          error={fieldError}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        />

        {expired ? (
          <p role="alert" className="rounded border border-warning/30 bg-warning-surface px-3 py-2 text-sm text-warning">
            {t('access.codeExpired')}
          </p>
        ) : error ? (
          <p role="alert" className="rounded border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger">
            {error.message}
          </p>
        ) : null}

        {/* Warning only near the end. Showing "5 attempts remaining" on the
            first try reads as a threat rather than a help. */}
        {attemptsRemaining <= 2 && attemptsRemaining > 0 ? (
          <p className="text-xs text-warning">
            {t('access.attemptsRemaining', { count: attemptsRemaining })}
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={status === 'loading'} disabled={expired}>
          {t('access.verify')}
        </Button>

        {/* SMS and email codes can be resent. An authenticator app generates
            its own, so there is nothing to resend. */}
        {isOtpStage || twoFactorMethod === 'sms' ? (
          <Button
            type="button"
            variant="ghost"
            className="self-center"
            disabled={!expired && secondsLeft > 0}
            onClick={() => dispatch(resendOtp({ challengeId }))}
          >
            {expired || secondsLeft <= 0
              ? t('access.resendCode')
              : t('access.resendIn', { seconds: secondsLeft })}
          </Button>
        ) : null}
      </form>
    </AuthLayout>
  );
}

// Seconds until the code expires, ticking down. Local to this screen because
// nothing else in the portal counts down.
function useCountdown(expiresAt) {
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(expiresAt));

  useEffect(() => {
    setSecondsLeft(remaining(expiresAt));
    if (!expiresAt) return undefined;

    const timer = setInterval(() => setSecondsLeft(remaining(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return secondsLeft;
}

function remaining(expiresAt) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
}
