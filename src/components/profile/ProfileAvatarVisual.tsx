import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ProfileAvatarVisualSize = "sm" | "md" | "lg";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-[72px] w-[72px] text-lg",
  lg: "h-20 w-20 text-xl",
} as const;

const decorationMinSize = { sm: 52, md: 100, lg: 112 } as const;

const onlineDotSize = {
  sm: "h-2.5 w-2.5 border",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
} as const;

type ProfileAvatarVisualProps = {
  displayName: string;
  avatarImage?: ReactNode;
  decorationImage?: ReactNode;
  ringClassName?: string;
  className?: string;
  size?: ProfileAvatarVisualSize;
  isOnline?: boolean;
};

/**
 * Framework-neutral avatar surface shared by the Next.js and Tauri renderers.
 * Each host supplies its own image implementation.
 */
export function ProfileAvatarVisual({
  displayName,
  avatarImage,
  decorationImage,
  ringClassName,
  className,
  size = "md",
  isOnline = false,
}: ProfileAvatarVisualProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-visible",
        sizes[size],
        className,
      )}
    >
      {decorationImage && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `max(140%, ${decorationMinSize[size]}px)`,
            height: `max(140%, ${decorationMinSize[size]}px)`,
          }}
        >
          {decorationImage}
        </span>
      )}
      <span
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-violet-400 font-semibold text-[var(--foreground)]",
          ringClassName,
        )}
      >
        {avatarImage ?? displayName.charAt(0).toUpperCase()}
      </span>
      {isOnline && (
        <span
          className={cn(
            "profile-avatar__presence absolute bottom-0 right-0 z-30 rounded-full border-[var(--background)] bg-emerald-500",
            onlineDotSize[size],
          )}
          aria-label="В сети"
        />
      )}
    </div>
  );
}
