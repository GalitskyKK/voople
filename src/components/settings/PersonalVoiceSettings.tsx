"use client";

import { useEffect, useState } from "react";
import { Mic, RefreshCw } from "lucide-react";

import { DEFAULT_VOICE_PREFERENCES, loadVoicePreferences, saveVoicePreferences } from "@/lib/livekit/voice-preferences";
import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

export function PersonalVoiceSettings() {
  const [preferences, setPreferences] = useState<VoicePreferences>(DEFAULT_VOICE_PREFERENCES);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setPreferences(loadVoicePreferences()); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) throw new Error("Устройства недоступны в этом браузере");
      setDevices(await navigator.mediaDevices.enumerateDevices());
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось получить список устройств"); }
  };
  useEffect(() => { void Promise.resolve().then(refresh); }, []);

  const update = (patch: Partial<VoicePreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try { saveVoicePreferences(next); setError(null); }
    catch { setError("Не удалось сохранить настройки на этом устройстве"); }
  };

  return <section className="settings-section" aria-labelledby="personal-voice-title">
    <div className="settings-section__header"><Mic className="h-5 w-5" /><div><h2 id="personal-voice-title">Голос и видео</h2><p>Устройства и обработка звука на этом устройстве. Изменения применятся при следующем подключении.</p></div></div>
    <div className="settings-rows">
      {([ ["audioinput", "Микрофон", "inputDeviceId"], ["audiooutput", "Динамики", "outputDeviceId"] ] as const).map(([kind, label, key]) => <label key={key} className="settings-row">
        <span className="font-medium">{label}</span>
        <select className="min-h-10 min-w-0 rounded-[var(--material-control-radius)] border border-[var(--material-border)] bg-[var(--material-control-fill)] px-3 text-sm" value={preferences[key]} onChange={(event) => update({ [key]: event.target.value })}>
          <option value="default">Системное устройство</option>
          {devices.filter((device) => device.kind === kind && device.deviceId !== "default").map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${label} ${index + 1}`}</option>)}
        </select>
      </label>)}
      <label className="settings-row"><span className="font-medium">Звуки комнаты</span><input type="checkbox" className="settings-switch" checked={preferences.roomSounds} onChange={(event) => update({ roomSounds: event.target.checked })} /></label>
      <label className="settings-row"><span className="font-medium">Эхоподавление</span><input type="checkbox" className="settings-switch" checked={preferences.echoCancellation} onChange={(event) => update({ echoCancellation: event.target.checked })} /></label>
    </div>
    <button type="button" className="inline-flex min-h-10 items-center gap-2 self-start rounded-[var(--material-control-radius)] border border-[var(--material-border)] px-3 text-sm hover:bg-[var(--material-interactive-fill)]" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Обновить устройства</button>
    {error ? <p role="alert" className="text-sm text-[var(--voople-danger)]">{error}</p> : null}
  </section>;
}
