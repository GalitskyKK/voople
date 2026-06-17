"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

type ShareButtonProps = {
  /** URL для шаринга; относительный путь резолвится к текущему origin при клике. */
  url: string;
  title?: string;
  text?: string;
  label?: string;
  className?: string;
};

/**
 * Кнопка «Поделиться»: системный Web Share API на мобильных, копирование
 * ссылки в буфер — как фолбэк на десктопе. Подтверждение показывается инлайн.
 * URL резолвится к абсолютному только в обработчике клика, поэтому компонент
 * безопасен для SSR и не требует доступа к `window` при рендере.
 */
export function ShareButton({ url, title, text, label = "Поделиться", className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const absoluteUrl = new URL(url, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch {
        // отмена системного шита — не ошибка, продолжаем к копированию
      }
    }
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // буфер недоступен — тихо игнорируем
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_15%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--foreground)_80%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Ссылка скопирована" : label}
    </button>
  );
}
