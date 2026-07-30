import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PostCardSurfaceProps = {
  children: ReactNode;
  className?: string;
  surfaceStyle?: CSSProperties;
};

export function PostCardSurface({
  children,
  className,
  surfaceStyle,
}: PostCardSurfaceProps) {
  return (
    <article
      className={cn("voople-post-card text-[var(--foreground)]", className)}
    >
      <div
        className="voople-post-card__surface voople-panel overflow-hidden rounded-[var(--app-radius-xl)]"
        style={surfaceStyle}
      >
        {children}
      </div>
    </article>
  );
}

export function PostCardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("voople-post-card__body px-4 pb-4 pt-3", className)}>
      {children}
    </div>
  );
}

export function PostCardActions({
  children,
  label = "Действия с публикацией",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "voople-post-card__actions mt-4 flex items-center justify-between gap-1 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-3 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]",
        className,
      )}
      aria-label={label}
    >
      {children}
    </footer>
  );
}

export function PostCardAction({
  icon,
  label,
  value,
  onClick,
  pressed,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  value?: number;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      {icon}
      {value === undefined ? null : (
        <span className="text-sm tabular-nums">{value}</span>
      )}
    </>
  );
  const className =
    "voople-post-action inline-flex items-center gap-1.5 aria-pressed:text-[var(--foreground)] disabled:cursor-default disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4";

  return onClick ? (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <span className={className} aria-label={label}>
      {content}
    </span>
  );
}
