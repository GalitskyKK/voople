"use client";

import { Gauge, Mic, MicOff, RotateCcw, Settings2, ShieldCheck } from "lucide-react";

import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

import type { LiveKitEndpoint, MediaStatus } from "./voice-room-config";

type AudioProcessingKey =
  | "echoCancellation"
  | "noiseSuppression"
  | "autoGainControl"
  | "voiceIsolation";

type VoiceSettingsPanelProps = {
  preferences: VoicePreferences;
  inputDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  micTestActive: boolean;
  micTestLevel: number;
  endpoints: LiveKitEndpoint[];
  selectedEndpoint: string;
  currentEndpoint: string | null;
  mediaStatus: MediaStatus;
  onInputDeviceChange: (deviceId: string) => void | Promise<void>;
  onOutputDeviceChange: (deviceId: string) => void | Promise<void>;
  onMicTestToggle: () => void | Promise<void>;
  onAudioProcessingChange: (
    key: AudioProcessingKey,
    enabled: boolean,
  ) => void | Promise<void>;
  onEndpointChange: (endpointUrl: string) => void;
  onCompatibilityModeChange: (enabled: boolean) => void;
  onReconnect: () => void | Promise<void>;
};

const processingOptions: Array<[AudioProcessingKey, string]> = [
  ["noiseSuppression", "Шумоподавление"],
  ["echoCancellation", "Эхоподавление"],
  ["autoGainControl", "Автогромкость"],
  ["voiceIsolation", "Изоляция голоса"],
];

export function VoiceSettingsPanel({
  preferences,
  inputDevices,
  outputDevices,
  micTestActive,
  micTestLevel,
  endpoints,
  selectedEndpoint,
  currentEndpoint,
  mediaStatus,
  onInputDeviceChange,
  onOutputDeviceChange,
  onMicTestToggle,
  onAudioProcessingChange,
  onEndpointChange,
  onCompatibilityModeChange,
  onReconnect,
}: VoiceSettingsPanelProps) {
  return (
    <details className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Звук и соединение
        </span>
        <Gauge className="h-4 w-4 text-[var(--app-muted)]" />
      </summary>

      <div className="voople-scroll max-h-[min(42dvh,22rem)] space-y-4 overflow-y-auto border-t border-[var(--app-border)] p-4">
        <label className="block text-xs font-medium text-[var(--app-muted)]">
          Микрофон
          <select
            value={preferences.inputDeviceId}
            onChange={(event) => void onInputDeviceChange(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]"
          >
            <option value="default">Системный по умолчанию</option>
            {inputDevices
              .filter((device) => device.deviceId !== "default")
              .map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Микрофон ${index + 1}`}
                </option>
              ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-[var(--app-muted)]">
          Динамики
          <select
            value={preferences.outputDeviceId}
            onChange={(event) => void onOutputDeviceChange(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]"
          >
            <option value="default">Системные по умолчанию</option>
            {outputDevices
              .filter((device) => device.deviceId !== "default")
              .map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Устройство ${index + 1}`}
                </option>
              ))}
          </select>
        </label>

        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onMicTestToggle()}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-sm transition hover:bg-[var(--app-surface)]"
            >
              {micTestActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {micTestActive ? "Остановить проверку" : "Проверить микрофон"}
            </button>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--app-surface)]">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-75"
                style={{ width: `${micTestLevel}%` }}
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-[var(--app-muted)]">
            Индикатор работает локально и ничего не отправляет в комнату.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {processingOptions.map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] px-3 py-2.5 text-sm"
            >
              {label}
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) => void onAudioProcessingChange(key, event.target.checked)}
                className="settings-switch"
              />
            </label>
          ))}
        </div>

        {endpoints.length > 1 ? (
          <label className="block text-xs font-medium text-[var(--app-muted)]">
            Маршрут медиасервера
            <select
              value={selectedEndpoint}
              onChange={(event) => onEndpointChange(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]"
            >
              <option value="auto">Автоматически, с резервированием</option>
              {endpoints.map((endpoint) => (
                <option key={endpoint.url} value={endpoint.url}>
                  {endpoint.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex items-start justify-between gap-4 rounded-xl border border-[var(--app-border)] px-3 py-3">
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Совместимый режим
            </span>
            <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
              Принудительно использует TURN. Включайте, если обычное соединение без VPN не
              проходит.
            </span>
          </span>
          <input
            type="checkbox"
            checked={preferences.compatibilityMode}
            onChange={(event) => onCompatibilityModeChange(event.target.checked)}
            className="settings-switch shrink-0"
          />
        </label>

        {mediaStatus === "connected" || mediaStatus === "reconnecting" ? (
          <button
            type="button"
            onClick={() => void onReconnect()}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] text-sm transition hover:bg-[var(--app-surface)]"
          >
            <RotateCcw className="h-4 w-4" />
            Применить маршрут и переподключиться
          </button>
        ) : null}

        {currentEndpoint ? (
          <p className="truncate text-xs text-[var(--app-muted)]">
            Подключено через {new URL(currentEndpoint).hostname}
          </p>
        ) : null}
      </div>
    </details>
  );
}
