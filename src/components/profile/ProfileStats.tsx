import { Eye, FileText, UserPlus, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type ProfileStatsProps = {
  posts: number;
  followers: number;
  following: number;
  views: number;
  className?: string;
};

const ITEMS = [
  { key: "posts" as const, Icon: FileText, label: "Посты" },
  { key: "followers" as const, Icon: Users, label: "Подписчики" },
  { key: "following" as const, Icon: UserPlus, label: "Подписки" },
  { key: "views" as const, Icon: Eye, label: "Просмотры" },
];

export function ProfileStats({ posts, followers, following, views, className }: ProfileStatsProps) {
  const values = { posts, followers, following, views };

  return (
    <div
      className={cn(
        "voople-profile-stats flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--foreground)_7%,transparent)] pt-2 text-[color-mix(in_srgb,var(--foreground)_62%,transparent)]",
        className,
      )}
      aria-label="Статистика профиля"
    >
      {ITEMS.map(({ key, Icon, label }) => (
        <div
          key={key}
          className="flex min-w-0 items-center gap-1"
          title={`${values[key]} ${label.toLowerCase()}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-[color-mix(in_srgb,var(--foreground)_42%,transparent)]" aria-hidden />
          <span className="truncate text-xs font-medium tabular-nums text-[color-mix(in_srgb,var(--foreground)_78%,transparent)]">
            {formatStat(values[key])}
          </span>
          <span className="sr-only">{label}</span>
        </div>
      ))}
    </div>
  );
}

function formatStat(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}
