// ADM-097
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button, Card, Checkbox, ConfirmDialog, ErrorState, Input,
  PageHeader, Select, StatusPill,
} from '@/components/primitives';
import {
  fetchSystemSettings,
  resetSettingsDraft,
  saveSettings,
  selectSystemSettings,
  setChangeReason,
  setSettingValue,
} from '@/store/slices/reportingSlice';
import { formatDateTime } from '@/utils/format';
import { t } from '@/i18n/en';

export default function SystemSettings() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    groups, values, draft, dirtyKeys, dirtySensitiveKeys, changeReason, fieldErrors,
    updatedAt, updatedByName, canSave, viewState, saveStatus, saveError, error,
  } = useSelector(selectSystemSettings);

  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    dispatch(fetchSystemSettings());
  }, [dispatch]);

  // Handlers.
  const valueOf = (key) => (key in draft ? draft[key] : values?.[key]);

  const submit = async () => {
    const changed = Object.fromEntries(dirtyKeys.map((key) => [key, draft[key]]));
    const result = await dispatch(saveSettings({ values: changed, reason: changeReason }));
    if (!result.error) setConfirming(false);
  };

  // A sensitive change moves money, changes who can do what, or shortens how
  // long the platform can answer for itself. The confirm states which, rather
  // than asking whether the operator is sure.
  const handleSubmit = (event) => {
    event.preventDefault();
    if (dirtySensitiveKeys.length > 0) setConfirming(true);
    else submit();
  };

  // Markup.
  if (viewState === 'loading') return <SettingsSkeleton />;
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchSystemSettings())} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-section pb-24">
      <PageHeader
        eyebrow={t('platform.eyebrow')}
        title={t('platform.settingsTitle')}
        subtitle={t('platform.settingsSubtitle')}
        meta={
          dirtyKeys.length > 0 ? (
            <StatusPill tone="warning">
              {t('platform.unsavedCount', { count: dirtyKeys.length })}
            </StatusPill>
          ) : null
        }
      />

      {updatedAt ? (
        <p className="text-sm text-charcoal-light">
          {t('platform.settingsUpdated', { date: formatDateTime(updatedAt), name: updatedByName })}
        </p>
      ) : null}

      {groups.map((group) => (
        <Card
          key={group.id}
          title={t(`platform.settingGroup.${group.id}`)}
          description={t(`platform.settingGroup.${group.id}Help`)}
        >
          <div className="grid grid-cols-1 gap-field md:grid-cols-2">
            {group.settings.map((setting) => (
              <SettingField
                key={setting.key}
                setting={setting}
                value={valueOf(setting.key)}
                error={fieldErrors[setting.key]}
                onChange={(value) => dispatch(setSettingValue({ key: setting.key, value }))}
              />
            ))}
          </div>
        </Card>
      ))}

      {/* Every save writes an audit entry, and an entry that cannot say why is
          half a record. So the reason is a required field rather than a note. */}
      <Card title={t('platform.changeReason')}>
        <Input
          id="change-reason"
          required
          help={t('platform.changeReasonHelp')}
          value={changeReason}
          onChange={(event) => dispatch(setChangeReason(event.target.value))}
        />
      </Card>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-lightGray-dark bg-white px-gutter py-3 shadow-md">
        <div className="flex items-center justify-end gap-2">
          {saveError ? (
            <p className="mr-auto text-sm text-danger">
              {t(`platform.settingsError.${saveError.code}`)}
            </p>
          ) : null}
          <Button
            variant="secondary"
            type="button"
            disabled={dirtyKeys.length === 0}
            onClick={() => dispatch(resetSettingsDraft())}
          >
            {t('common.reset')}
          </Button>
          {/* Saving is not loading: the fields stay on screen and the spinner
              goes in the button, so nobody loses sight of what they typed. */}
          <Button type="submit" disabled={!canSave} loading={saveStatus === 'loading'}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={submit}
        loading={saveStatus === 'loading'}
        title={t('platform.sensitiveConfirmTitle')}
        body={t('platform.sensitiveConfirmBody', {
          settings: dirtySensitiveKeys.map((key) => t(`platform.setting.${key}`)).join(', '),
        })}
        confirmLabel={t('common.saveChanges')}
      />
    </form>
  );
}

function SettingField({ setting, value, error, onChange }) {
  const label = t(`platform.setting.${setting.key}`);
  // hasHelp comes off the setting rather than being probed for, so a field
  // with no help text does not warn about a missing key on every render.
  const help = setting.hasHelp ? t(`platform.setting.${setting.key}Help`) : undefined;
  const caption = setting.restartRequired ? t('platform.restartRequired') : help;
  const fieldError = error ? t(`platform.settingsError.${error}`) : undefined;

  if (setting.kind === 'toggle') {
    return (
      <Checkbox
        id={setting.key}
        label={label}
        help={caption}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (setting.kind === 'select') {
    return (
      <Select
        id={setting.key}
        label={label}
        help={caption}
        error={fieldError}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        options={setting.options.map((option) => ({ value: option, label: option }))}
      />
    );
  }

  return (
    <Input
      id={setting.key}
      type={setting.kind === 'number' ? 'number' : 'text'}
      label={setting.unit ? `${label} (${setting.unit})` : label}
      help={caption}
      error={fieldError}
      min={setting.min}
      max={setting.max}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SettingsSkeleton({ groups = 3 }) {
  return (
    <div className="flex flex-col gap-section">
      <div className="h-8 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
      {Array.from({ length: groups }).map((_, index) => (
        <div key={index} className="rounded-md border border-lightGray-dark bg-white p-5 shadow-sm">
          <div className="mb-4 h-4 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="grid grid-cols-1 gap-field md:grid-cols-2">
            {Array.from({ length: 4 }).map((__, field) => (
              <div key={field} className="flex flex-col gap-2">
                <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
                <div className="h-9 w-full animate-pulse rounded bg-lightGray-dark" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
