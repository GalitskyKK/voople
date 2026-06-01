"use client";

import { COPY } from "@/lib/constants/copy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type PublishStatusBannerProps = {
  visible: boolean;
  onPublish: () => void;
  disabled?: boolean;
};

/** Под блоком статуса — раскрытие вниз, без сдвига слайдера */
export function PublishStatusBanner({
  visible,
  onPublish,
  disabled = false,
}: PublishStatusBannerProps) {
  return (
    <div
      className={cn(
        "voople-status-publish-banner grid transition-[grid-template-rows,opacity] duration-200 ease-out",
        visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--theme-accent)]/35 bg-[var(--theme-accent)]/12 px-3 py-2">
          <p className="text-sm text-white/85">{COPY.statusChanged}</p>
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
    </div>
  );
}
