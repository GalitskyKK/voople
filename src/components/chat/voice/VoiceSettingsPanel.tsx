"use client";

import { Mic, MicOff, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";

import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

import type { LiveKitEndpoint, MediaStatus } from "./voice-room-config";
import { DesktopScreenAudioSettings } from "./DesktopScreenAudioSettings";

type AudioProcessingKey =
  | "echoCancellation"
  | "noiseSuppression"
  | "autoGainControl"
  | "voiceIsolation"
  | "enhancedNoiseSuppression";

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
  onRefreshDevices: () => void | Promise<void>;
  onAudioProcessingChange: (
    key: AudioProcessingKey,
    enabled: boolean,
  ) => void | Promise<void>;
  onEndpointChange: (endpointUrl: string) => void;
  onCompatibilityModeChange: (enabled: boolean) => void;
  onRoomSoundsChange: (enabled: boolean) => void;
  onScreenAudioProcessChange: (processId: number | null) => void;
  onReconnect: () => void | Promise<void>;
};

const processingOptions: Array<[AudioProcessingKey, string]> = [
  ["enhancedNoiseSuppression", "Усиленное шумоподавление RNNoise"],
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
  onRefreshDevices,
  onAudioProcessingChange,
  onEndpointChange,
  onCompatibilityModeChange,
  onRoomSoundsChange,
  onScreenAudioProcessChange,
  onReconnect,
}: VoiceSettingsPanelProps) {
  return (
    <div className="space-y-4">
        <p className="rounded-xl bg-[var(--app-accent-soft)] px-3 py-2 text-xs leading-5 text-[var(--app-muted)]">
          Голос передаётся в Opus до 96 кбит/с с защитой от потери пакетов и без
          обрезания первых слогов после тишины. Обработка применяется локально.
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--app-muted)]">
            Названия появляются после разрешения доступа к микрофону.
          </p>
          <button
            type="button"
            onClick={() => void onRefreshDevices()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs hover:bg-[var(--app-surface)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Обновить
          </button>
        </div>

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
        <p className="-mt-2 text-xs leading-5 text-[var(--app-muted)]">
          RNNoise обрабатывает голос локально нейросетью. При его включении
          системное шумоподавление отключается, чтобы не искажать голос двойной обработкой.
        </p>

        <DesktopScreenAudioSettings
          processId={preferences.screenAudioProcessId}
          onProcessChange={onScreenAudioProcessChange}
        />

        <label className="flex items-start justify-between gap-4 rounded-xl border border-[var(--app-border)] px-3 py-3">
          <span>
            <span className="text-sm font-medium">Звуки комнаты</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
              Короткий сигнал при входе и выходе участника.
            </span>
          </span>
          <input
            type="checkbox"
            checked={preferences.roomSounds}
            onChange={(event) => onRoomSoundsChange(event.target.checked)}
            className="settings-switch shrink-0"
          />
        </label>

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
  );
}
