"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

type ProfileReactionsProps = {
  profileUserId: string;
  canReact: boolean;
};

export function ProfileReactions({ profileUserId, canReact }: ProfileReactionsProps) {
  const utils = trpc.useUtils();
  const { data: reactions = [] } = trpc.profile.getReactions.useQuery(
    { profileUserId },
    { staleTime: 30_000 },
  );

  const toggle = trpc.profile.toggleReaction.useMutation({
    onSuccess: (next) => {
      utils.profile.getReactions.setData({ profileUserId }, next);
    },
  });

  useEffect(() => {
    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const channel = supabase
      .channel(`profile-reactions:${profileUserId}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "card_reactions",
          filter: `profile_user_id=eq.${profileUserId}`,
        },
        () => {
          void utils.profile.getReactions.invalidate({ profileUserId });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profileUserId, utils]);

  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <p className="min-w-0 text-[11px] text-[color-mix(in_srgb,var(--foreground)_42%,transparent)]">
        {canReact ? "Оставить реакцию" : "Реакции профиля"}
      </p>
      <div className="flex shrink-0 gap-1 text-sm">
        {reactions.map(({ emoji, count, reactedByViewer }) => (
          <button
            key={emoji}
            type="button"
            disabled={!canReact || toggle.isPending}
            onClick={() => toggle.mutate({ profileUserId, emoji })}
            className={cn(
              "flex h-7 items-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-2 transition-[background-color,transform] hover:scale-[1.03] hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] active:scale-95 disabled:cursor-default disabled:opacity-60",
              reactedByViewer && "bg-[color-mix(in_srgb,var(--theme-accent)_13%,var(--app-surface))] text-[var(--foreground)]",
            )}
            aria-pressed={reactedByViewer}
            aria-label={`Реакция ${emoji}`}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 && (
              <span className="ml-1 text-[11px] tabular-nums text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
