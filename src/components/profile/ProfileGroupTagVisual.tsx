import { UsersRound } from "lucide-react";
import type { CSSProperties } from "react";

import type { ProfileViewModel } from "@/types/domain";

export function ProfileGroupTagVisual({
  value,
  compact = false,
}: {
  value: NonNullable<ProfileViewModel["groupTag"]>;
  compact?: boolean;
}) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--group-tag-accent,var(--theme-accent))_38%,var(--app-border))] bg-[color-mix(in_srgb,var(--group-tag-accent,var(--theme-accent))_12%,var(--app-surface-soft))] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--group-tag-accent,var(--theme-accent))]"
      style={{ "--group-tag-accent": value.accentColor ?? undefined } as CSSProperties}
      title={`Тег сообщества ${value.groupName}`}
      aria-label={`Тег сообщества ${value.groupName}: ${value.tag}`}
    >
      {compact ? null : <UsersRound className="h-3 w-3 shrink-0" aria-hidden />}
      <span className="truncate">{value.tag}</span>
    </span>
  );
}
