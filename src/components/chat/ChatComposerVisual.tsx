import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ChatComposerFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "voople-chat-composer shrink-0 border-t border-[var(--app-border)] py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChatComposerContextPreview({
  label,
  text,
  accent = false,
  onClose,
}: {
  label: string;
  text: string;
  accent?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="voople-chat-composer__reply mb-2 flex items-start gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2">
      <div className="min-w-0 flex-1 text-sm">
        <p
          className={cn(
            "text-xs font-medium",
            accent ? "text-[var(--theme-accent)]" : "text-[var(--app-muted)]",
          )}
        >
          {label}
        </p>
        <p className="truncate text-[var(--foreground)]">{text}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]"
        aria-label={`Закрыть: ${label.toLocaleLowerCase("ru-RU")}`}
        onClick={onClose}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export const CHAT_COMPOSER_ICON_BUTTON_CLASS =
  "rounded-[var(--app-radius-sm)] p-2 text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]";

export const CHAT_COMPOSER_SURFACE_CLASS =
  "rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-[var(--app-shadow-sm)] transition-[border-color,box-shadow] duration-200 focus-within:border-[color-mix(in_srgb,var(--theme-accent)_55%,var(--app-border))] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-accent)_12%,transparent)]";
