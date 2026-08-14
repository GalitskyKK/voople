"use client";

import { UsersRound } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function GroupAvatar({
  name,
  avatarUrl,
  icon,
  accentColor,
  size = "sm",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  icon?: string | null;
  accentColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && avatarUrl !== failedUrl);
  const sizeClass =
    size === "lg" ? "h-20 w-20" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  const iconClass = size === "lg" ? "h-8 w-8" : size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--group-accent,var(--theme-accent))_16%,var(--app-surface-soft))] font-semibold text-[var(--group-accent,var(--theme-accent))]",
        sizeClass,
        className,
      )}
      style={accentColor ? { "--group-accent": accentColor } as React.CSSProperties : undefined}
      aria-hidden="true"
    >
      {showImage ? (
        // Shared by Next.js and the Tauri renderer; next/image cannot run in both hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? undefined}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl ?? null)}
        />
      ) : icon ? (
        <span className={size === "lg" ? "text-3xl" : "text-base"}>{icon}</span>
      ) : name.trim() ? (
        <span className={size === "lg" ? "text-2xl" : "text-sm"}>
          {name.trim().slice(0, 1).toLocaleUpperCase("ru-RU")}
        </span>
      ) : (
        <UsersRound className={iconClass} />
      )}
    </span>
  );
}
