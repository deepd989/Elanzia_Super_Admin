// ADM-004
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Checkbox, ErrorState, Input, PageHeader, Select, Spinner, StatusPill } from '@/components/primitives';
import { TIMEZONES } from '@/data/accessFixtures';
import {
  fetchProfile,
  saveNotificationPreferences,
  saveProfile,
  selectAdminProfile,
} from '@/store/slices/accessSlice';
import { formatDateTime, formatPhone } from '@/utils/format';
import { t } from '@/i18n/en';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

const CHANNELS = [
  { key: 'email', label: t('access.channelEmail') },
  { key: 'sms', label: t('access.channelSms') },
  { key: 'inApp', label: t('access.channelInApp') },
];

export default function AdminProfile() {
  const dispatch = useDispatch();

  // Data.
  const { profile, role, viewState, saveStatus, saveError, error } = useSelector(selectAdminProfile);
  const [form, setForm] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name,
      phone: profile.phone,
      designation: profile.designation,
      locale: profile.locale,
      timezone: profile.timezone,
    });
    setPreferences(profile.notificationPreferences);
  }, [profile]);

  // Handlers.
  const setField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const toggleChannel = (id, channel) =>
    setPreferences(
      preferences.map((row) =>
        row.id === id ? { ...row, channels: { ...row.channels, [channel]: !row.channels[channel] } } : row,
      ),
    );

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    dispatch(saveProfile(form));
    dispatch(saveNotificationPreferences({ preferences }));
  };

  // Markup.
  if (viewState === 'loading' || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchProfile())} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={t('access.profileTitle')}
        subtitle={t('access.profileSubtitle')}
        meta={<StatusPill tone="info" label={role?.name ?? profile.roleName} />}
      />

      <Card title={t('access.groupIdentity')} description={t('access.groupIdentityHelp')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Input
            id="name"
            label={t('access.fullName')}
            required
            value={form.name}
            error={fieldErrors.name}
            onChange={setField('name')}
          />
          {/* Email is the sign-in identifier and role is a privilege. Both are
              changed by somebody else, through ADM-006. */}
          <Input
            id="email"
            label={t('access.email')}
            help={t('access.emailLocked')}
            disabled
            value={profile.email}
          />
          <Input
            id="phone"
            label={t('access.phone')}
            required
            value={form.phone}
            error={fieldErrors.phone}
            onChange={setField('phone')}
          />
          <Input
            id="designation"
            label={t('access.designation')}
            value={form.designation}
            onChange={setField('designation')}
          />
        </div>
      </Card>

      <Card title={t('access.groupPreferences')}>
        <div className="grid grid-cols-1 gap-field md:grid-cols-2">
          <Select
            id="locale"
            label={t('access.language')}
            value={form.locale}
            onChange={setField('locale')}
            options={LANGUAGE_OPTIONS}
          />
          <Select
            id="timezone"
            label={t('access.timezone')}
            value={form.timezone}
            onChange={setField('timezone')}
            options={TIMEZONES}
          />
        </div>
      </Card>

      <Card title={t('access.groupNotifications')} description={t('access.groupNotificationsHelp')} padded={false}>
        <ul className="divide-y divide-lightGray">
          {preferences.map((preference) => (
            <li key={preference.id} className="flex flex-wrap items-start gap-4 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-base text-charcoal">
                  {t(preference.label)}
                  {preference.alwaysOn ? (
                    <StatusPill tone="warning" size="sm">{t('access.alwaysOn')}</StatusPill>
                  ) : null}
                </p>
                <p className="text-xs text-charcoal-light">{t(preference.description)}</p>
              </div>

              <div className="flex shrink-0 gap-5">
                {CHANNELS.map((channel) => (
                  <Checkbox
                    key={channel.key}
                    id={`${preference.id}-${channel.key}`}
                    label={channel.label}
                    checked={preference.channels[channel.key]}
                    onChange={() => toggleChannel(preference.id, channel.key)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('access.groupSecurity')}>
        <dl className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-sm text-charcoal-light">{t('access.twoFactor')}</dt>
            <dd className="flex items-center gap-2 text-base text-charcoal">
              {profile.twoFactorMethod === 'sms'
                ? t('access.twoFactorSms', { destination: formatPhone(profile.phone) })
                : t('access.twoFactorApp')}
              <StatusPill tone="success" size="sm">{t('access.twoFactorMandatory')}</StatusPill>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-charcoal-light">{t('access.lastSignIn')}</dt>
            <dd className="text-base text-charcoal">{formatDateTime(profile.lastSignInAt)}</dd>
          </div>
        </dl>
      </Card>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="mr-auto text-sm text-danger">{saveError.message}</p> : null}
          {saveStatus === 'succeeded' && !saveError ? (
            <p className="mr-auto text-sm text-success">{t('states.savedToast')}</p>
          ) : null}
          <Button type="submit" loading={saveStatus === 'loading'}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>
    </form>
  );
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = t('validation.requiredField');
  if (String(form.phone).replace(/\D/g, '').length !== 10) {
    errors.phone = t('validation.invalidPhone');
  }
  return errors;
}
