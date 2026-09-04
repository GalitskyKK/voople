"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, LoaderCircle, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { shareLink } from "@/lib/platform/share-link";

type ShareButtonProps = {
  /** URL для шаринга; относительный путь резолвится к текущему origin при клике. */
  url: string;
  title?: string;
  text?: string;
  label?: string;
  className?: string;
  mode?: "share" | "copy";
  disabled?: boolean;
};

/**
 * Кнопка «Поделиться»: системный Web Share API на мобильных, копирование
 * ссылки в буфер — как фолбэк на десктопе. Подтверждение показывается инлайн.
 * URL резолвится к абсолютному только в обработчике клика, поэтому компонент
 * безопасен для SSR и не требует доступа к `window` при рендере.
 */
export function ShareButton(props: ShareButtonProps) {
  return <ShareButtonAction key={`${props.mode ?? "share"}:${props.url}`} {...props} />;
}

function ShareButtonAction({ url, title, text, mode = "share", disabled, label = "Поделиться", className }: ShareButtonProps) {
  const [state, setState] = useState<"idle" | "pending" | "copied" | "shared" | "error">("idle");
  const active = useRef(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; clearTimeout(timer.current); };
  }, []);
  const handleShare = async () => {
    if (disabled || pending.current) return;
    pending.current = true;
    clearTimeout(timer.current);
    setState("pending");
    try {
      const result = await shareLink({ url, title, text, mode }, {
        origin: window.location.origin,
        share: navigator.share ? (data) => navigator.share(data) : undefined,
        copy: navigator.clipboard?.writeText ? (value) => navigator.clipboard.writeText(value) : undefined,
      });
      if (!active.current) return;
      setState(result === "cancelled" ? "idle" : result);
      timer.current = setTimeout(() => setState("idle"), 2_000);
    } catch {
      if (active.current) setState("error");
    } finally {
      pending.current = false;
    }
  };

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={disabled || state === "pending"}
      aria-busy={state === "pending"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
        className,
      )}
    >
      {state === "pending" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> : state === "copied" || state === "shared" ? <Check className="h-3.5 w-3.5" aria-hidden /> : mode === "copy" ? <Copy className="h-3.5 w-3.5" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
      {state === "copied" ? "Ссылка скопирована" : state === "shared" ? "Ссылка отправлена" : label}
    </button>
    <span className="sr-only" role="status">{state === "copied" ? "Ссылка скопирована" : state === "shared" ? "Ссылка отправлена" : ""}</span>
    {state === "error" ? <span className="max-w-64 text-xs text-[var(--app-muted)]" role="alert">Не удалось передать ссылку. Проверьте доступ к буферу обмена и попробуйте снова.</span> : null}
    </span>
  );
}
