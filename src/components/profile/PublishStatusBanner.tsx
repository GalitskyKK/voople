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

/** Compact reveal below the mood card; never covers reactions or profile stats. */
export function PublishStatusBanner({
  visible,
  onPublish,
  disabled = false,
  className,
}: PublishStatusBannerProps) {
  return (
    <div
      className={cn(
        "voople-status-publish-banner grid transition-[grid-template-rows,opacity] duration-200 ease-out",
        visible
          ? "pointer-events-auto grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid-rows-[0fr] opacity-0",
        className,
      )}
      aria-hidden={!visible}
    >
      <div className="overflow-hidden">
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/10 px-3 py-2">
          <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">
            {COPY.statusChanged}
          </p>
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
