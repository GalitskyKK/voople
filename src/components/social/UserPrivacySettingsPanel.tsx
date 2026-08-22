"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { PrivacyScope, UserPrivacySettingsView } from "@/types/privacy";

const SCOPE_OPTIONS: Array<{ value: PrivacyScope; label: string }> = [
  { value: "everyone", label: "Все допустимые пользователи" },
  { value: "contacts_and_groups", label: "Контакты и общие группы" },
  { value: "contacts", label: "Только контакты" },
  { value: "nobody", label: "Никто" },
];

const SCOPE_FIELDS: Array<{ key: keyof Pick<UserPrivacySettingsView, "onlineScope" | "gamingScope" | "musicScope" | "roomsScope" | "inviteScope" | "connectionRequestScope">; label: string }> = [
  { key: "onlineScope", label: "Кто видит мой онлайн" },
  { key: "gamingScope", label: "Кто видит игровую активность" },
  { key: "musicScope", label: "Кто видит музыку" },
  { key: "roomsScope", label: "Кто видит мои комнаты" },
  { key: "inviteScope", label: "Кто может приглашать меня" },
  { key: "connectionRequestScope", label: "Кто может отправлять запросы на общение" },
];

export function UserPrivacySettingsPanel({ load, save }: {
  load: () => Promise<UserPrivacySettingsView>;
  save: (settings: UserPrivacySettingsView) => Promise<UserPrivacySettingsView>;
}) {
  const [settings, setSettings] = useState<UserPrivacySettingsView | null>(null);
  const [saved, setSaved] = useState<UserPrivacySettingsView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load().then((value) => { if (active) { setSettings(value); setSaved(value); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить приватность"); });
    return () => { active = false; };
  }, [load]);

  if (!settings) return <div className="h-64 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />;
  const changed = JSON.stringify(settings) !== JSON.stringify(saved);
  const submit = async () => {
    if (!changed || pending) return;
    setPending(true); setError(null);
    try { const next = await save(settings); setSettings(next); setSaved(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить приватность"); }
    finally { setPending(false); }
  };

  return (
    <section className="settings-section" aria-labelledby="privacy-settings-title">
      <div className="settings-section__header"><ShieldCheck className="h-5 w-5" /><div><h2 id="privacy-settings-title">Приватность и активность</h2><p>Видимость проверяется на сервере отдельно для каждого пользователя.</p></div></div>
      <div className="settings-rows">
        {SCOPE_FIELDS.map((field) => <label key={field.key} className="settings-row"><span className="font-medium">{field.label}</span><select value={settings[field.key]} disabled={pending} onChange={(event) => setSettings({ ...settings, [field.key]: event.target.value as PrivacyScope })} className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]">{SCOPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
        <label className="settings-row"><span><span className="block font-medium">Показывать меня в рекомендациях</span><span className="mt-1 block text-sm text-[var(--app-muted)]">Разрешает учитывать профиль в подборках людей.</span></span><input type="checkbox" className="settings-switch" checked={settings.appearInRecommendations} disabled={pending} onChange={(event) => setSettings({ ...settings, appearInRecommendations: event.target.checked })} /></label>
        <label className="settings-row"><span><span className="block font-medium">Показывать мои интересы</span><span className="mt-1 block text-sm text-[var(--app-muted)]">Скрывает выбранные темы из профиля, но сохраняет их для ваших рекомендаций.</span></span><input type="checkbox" className="settings-switch" checked={settings.showInterests} disabled={pending} onChange={(event) => setSettings({ ...settings, showInterests: event.target.checked })} /></label>
      </div>
      <div className="mt-4 flex justify-end"><Button type="button" size="sm" disabled={!changed || pending} onClick={() => void submit()}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Сохранить приватность</Button></div>
      {error ? <p className="mt-3 text-sm text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
