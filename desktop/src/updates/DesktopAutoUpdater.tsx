import { Download, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

type UpdateState =
  | { mode: "idle" }
  | { mode: "available"; version: string; notes: string | null }
  | { mode: "installing"; version: string; progress: number | null }
  | { mode: "error"; message: string };

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export function DesktopAutoUpdater() {
  const updateRef = useRef<Update | null>(null);
  const checkingRef = useRef(false);
  const [state, setState] = useState<UpdateState>({ mode: "idle" });

  const checkForUpdates = useCallback(async () => {
    if (
      import.meta.env.DEV ||
      !isTauriRuntime() ||
      checkingRef.current ||
      updateRef.current
    ) {
      return;
    }

    checkingRef.current = true;
    try {
      const update = await check({ timeout: 15_000 });
      if (!update) return;
      updateRef.current = update;
      setState({
        mode: "available",
        version: update.version,
        notes: update.body?.trim() || null,
      });
    } catch (error) {
      console.error("Desktop update check failed", error);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || !isTauriRuntime()) return;

    const initialCheck = window.setTimeout(() => void checkForUpdates(), 5_000);
    const periodicCheck = window.setInterval(() => void checkForUpdates(), 6 * 60 * 60_000);
    const onOnline = () => void checkForUpdates();
    window.addEventListener("online", onOnline);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(periodicCheck);
      window.removeEventListener("online", onOnline);
      const update = updateRef.current;
      updateRef.current = null;
      void update?.close();
    };
  }, [checkForUpdates]);

  const installUpdate = async () => {
    const update = updateRef.current;
    if (!update || state.mode === "installing") return;

    const version = update.version;
    let downloaded = 0;
    let total: number | undefined;
    setState({ mode: "installing", version, progress: null });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
        }
        setState({
          mode: "installing",
          version,
          progress: total ? Math.min(100, Math.round((downloaded / total) * 100)) : null,
        });
      });
    } catch (error) {
      setState({
        mode: "error",
        message: error instanceof Error ? error.message : "Не удалось установить обновление",
      });
    }
  };

  const dismiss = () => {
    const update = updateRef.current;
    updateRef.current = null;
    void update?.close();
    setState({ mode: "idle" });
  };

  if (state.mode === "idle") return null;

  return (
    <aside
      className="fixed bottom-5 right-5 z-[100] w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-nav)]"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
          {state.mode === "installing" ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : state.mode === "error" ? (
            <RefreshCw className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {state.mode === "error" ? "Ошибка обновления" : `Доступна Voople ${state.version}`}
          </p>
          <p className="mt-1 line-clamp-3 text-xs text-[var(--app-muted)]">
            {state.mode === "installing"
              ? state.progress === null
                ? "Загружаем и устанавливаем обновление…"
                : `Загружено ${state.progress}%`
              : state.mode === "error"
                ? state.message
                : state.notes ?? "Обновление готово к установке."}
          </p>
        </div>
        {state.mode !== "installing" ? (
          <button
            type="button"
            onClick={dismiss}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
            aria-label="Закрыть уведомление об обновлении"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {state.mode === "available" ? (
        <button
          type="button"
          onClick={() => void installUpdate()}
          className="mt-3 w-full rounded-xl bg-[var(--theme-accent)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Обновить сейчас
        </button>
      ) : state.mode === "error" ? (
        <button
          type="button"
          onClick={() => {
            dismiss();
            window.setTimeout(() => void checkForUpdates(), 0);
          }}
          className="mt-3 w-full rounded-xl border border-[var(--app-border)] px-3 py-2 text-sm font-semibold"
        >
          Проверить снова
        </button>
      ) : null}
    </aside>
  );
}
