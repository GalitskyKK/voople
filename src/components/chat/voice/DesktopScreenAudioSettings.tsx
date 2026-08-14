"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  getDesktopProcessAudioBridge,
  type DesktopProcessAudioCapabilities,
  type DesktopProcessAudioSource,
} from "@/lib/livekit/desktop-process-audio";

type DesktopScreenAudioSettingsProps = {
  processId: number | null;
  onProcessChange: (processId: number | null) => void;
};

export function DesktopScreenAudioSettings({ processId, onProcessChange }: DesktopScreenAudioSettingsProps) {
  const bridge = getDesktopProcessAudioBridge();
  const [capabilities, setCapabilities] = useState<DesktopProcessAudioCapabilities | null>(null);
  const [sources, setSources] = useState<DesktopProcessAudioSource[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!bridge) return;
    setPending(true);
    setError(null);
    try {
      const nextCapabilities = await bridge.capabilities();
      setCapabilities(nextCapabilities);
      setSources(nextCapabilities.publisherSupported ? await bridge.listSources() : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось получить аудиосессии Windows.");
    } finally {
      setPending(false);
    }
  }, [bridge]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  if (!bridge) {
    return (
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
        <p className="text-sm font-medium">Звук выбранной вкладки или окна</p>
        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
          Вупл. запросит аудио выбранной поверхности, но не общий системный звук.
          Поддержка зависит от браузера: надёжнее всего работает звук вкладки Chromium.
        </p>
      </div>
    );
  }

  const publisherAvailable = capabilities?.publisherSupported === true;
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-medium">Звук приложения в демонстрации</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
            Передаётся только выбранное приложение и его дочерние процессы. Голоса из Вупл. не захватываются.
          </span>
        </span>
        <button type="button" onClick={() => void refresh()} disabled={pending} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs transition hover:bg-[var(--app-surface)] disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>
      {capabilities?.publisherIncluded && !capabilities.publisherSupported ? (
        <p className="mt-3 rounded-lg bg-[var(--app-accent-soft)] px-3 py-2 text-xs leading-5 text-[var(--app-muted)]">
          Эта версия Windows не поддерживает изолированный захват приложения. Демонстрация будет доступна без его звука.
        </p>
      ) : capabilities && !publisherAvailable ? (
        <p className="mt-3 rounded-lg bg-[var(--app-accent-soft)] px-3 py-2 text-xs leading-5 text-[var(--app-muted)]">
          Нативный захват Windows пока не включён. Временный режим запросит звук выбранной
          вкладки или окна через WebView без общего системного микса; доступность определяет Chromium.
        </p>
      ) : null}
      {publisherAvailable ? (
        <label className="mt-3 block text-xs font-medium text-[var(--app-muted)]">
          Источник звука
          <select value={processId ?? ""} onChange={(event) => onProcessChange(event.target.value ? Number(event.target.value) : null)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]">
            <option value="">Без звука приложения</option>
            {sources.map((source) => <option key={source.processId} value={source.processId}>{source.name}{source.active ? " · воспроизводит звук" : ""}</option>)}
          </select>
        </label>
      ) : null}
      {publisherAvailable && !pending && sources.length === 0 ? <p className="mt-2 text-xs text-[var(--app-muted)]">Запустите воспроизведение в нужном приложении и обновите список.</p> : null}
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {capabilities ? <p className="mt-2 text-[11px] leading-4 text-[var(--app-muted)]">Требуется Windows 10 build {capabilities.minimumWindowsBuild} или новее{capabilities.currentWindowsBuild ? ` · установлен build ${capabilities.currentWindowsBuild}` : ""}.</p> : null}
    </div>
  );
}
