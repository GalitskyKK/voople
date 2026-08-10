import { cn } from "@/lib/utils";

import { SectionHeaderGlow } from "./SectionHeaderGlow";

type SectionPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  variant?: "panel" | "plain";
  density?: "default" | "compact";
  sticky?: boolean;
  className?: string;
};

/** Единый заголовок разделов (поиск, уведомления, сообщения). */
export function SectionPageHeader({
  title,
  description,
  eyebrow,
  action,
  variant = "panel",
  density = "default",
  sticky = false,
  className,
}: SectionPageHeaderProps) {
  return (
    <header
      className={cn(
        "voople-section-header shrink-0",
        variant === "panel"
          ? cn(
              "relative overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)]",
              density === "compact" ? "px-4 py-3" : "px-5 py-5 sm:px-7",
            )
          : "border-b border-[var(--app-border)] px-4 py-4 lg:px-6",
        sticky &&
          "sticky top-14 z-20 bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] backdrop-blur-xl lg:top-4",
        className,
      )}
    >
      {variant === "panel" ? (
        <SectionHeaderGlow />
      ) : null}
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-(--theme-accent)">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "font-bold tracking-[-0.03em]",
              density === "compact" ? "text-lg" : "text-2xl",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--app-muted)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
