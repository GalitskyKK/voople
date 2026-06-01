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
    <div className="flex gap-2 text-lg">
      {reactions.map(({ emoji, count, reactedByViewer }) => (
        <button
          key={emoji}
          type="button"
          disabled={!canReact || toggle.isPending}
          onClick={() => toggle.mutate({ profileUserId, emoji })}
          className={cn(
            "rounded-lg bg-white/5 px-2 py-1 hover:bg-white/10 disabled:cursor-default disabled:opacity-60",
            reactedByViewer && "bg-white/15 text-white",
          )}
          aria-pressed={reactedByViewer}
          aria-label={`Реакция ${emoji}`}
        >
          <span aria-hidden>{emoji}</span>
          <span className="ml-1 text-xs tabular-nums text-white/60">{count}</span>
        </button>
      ))}
    </div>
  );
}
