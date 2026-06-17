"use client";

import { COPY } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type PublishStatusBannerProps = {
  visible: boolean;
  onPublish: () => void;
  disabled?: boolean;
  className?: string;
};

/** Поверх карточки — без сдвига layout при появлении */
export function PublishStatusBanner({
  visible,
  onPublish,
  disabled = false,
  className,
}: PublishStatusBannerProps) {
  return (
    <div
      className={cn(
        "voople-status-publish-banner absolute inset-x-0 top-full z-30 pt-2 transition-[opacity,transform] duration-200 ease-out",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0",
        className,
      )}
      aria-hidden={!visible}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--theme-accent)]/35 bg-[var(--theme-accent)]/12 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur-sm">
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_85%,transparent)]">{COPY.statusChanged}</p>
        <Button
          size="sm"
          variant="primary"
          onClick={onPublish}
          disabled={disabled}
          className="shrink-0"
          tabIndex={visible ? 0 : -1}
        >
          {COPY.publishStatus}
        </Button>
      </div>
    </div>
  );
}
