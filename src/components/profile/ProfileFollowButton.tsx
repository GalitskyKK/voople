"use client";

import { UserCheck, UserMinus, UserPlus } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type ProfileFollowButtonProps = {
  username: string;
  canFollow: boolean;
  layout?: "default" | "compact";
};

function FollowStatusBadge({
  following,
  followsYou,
}: {
  following: boolean;
  followsYou: boolean;
}) {
  if (!following && !followsYou) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {following && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--foreground)_15%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 py-0.5 text-xs font-medium text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
          <UserCheck className="h-3.5 w-3.5 text-(--theme-accent)" aria-hidden />
          {COPY.subscribed}
        </span>
      )}
      {followsYou && (
        <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2 py-0.5 text-xs text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
          {following ? COPY.mutualFollow : COPY.followsYou}
        </span>
      )}
    </div>
  );
}

export function ProfileFollowButton({
  username,
  canFollow,
  layout = "default",
}: ProfileFollowButtonProps) {
  const utils = trpc.useUtils();

  const { data: followState, isLoading } = trpc.profile.getFollowState.useQuery(
    { username },
    { enabled: canFollow, staleTime: 30_000 },
  );

  const mutation = trpc.profile.toggleFollow.useMutation({
    onSuccess: () => {
      void utils.profile.getFollowState.invalidate({ username });
      void utils.feed.getPage.invalidate();
    },
  });

  if (!canFollow) return null;

  const following = followState?.following ?? false;
  const followsYou = followState?.followsYou ?? false;
  const showFollowBack = followsYou && !following;
  const pending = mutation.isPending || isLoading;

  const actionLabel = following
    ? COPY.unsubscribe
    : showFollowBack
      ? COPY.subscribeBack
      : COPY.subscribe;

  if (layout === "compact") {
    return (
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        size="sm"
        className="shrink-0"
        disabled={pending}
        aria-label={actionLabel}
        onClick={() => mutation.mutate({ username })}
      >
        {following ? (
          <UserMinus className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2")}>
      <FollowStatusBadge following={following} followsYou={followsYou} />
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        className="w-full"
        disabled={pending}
        aria-pressed={following}
        onClick={() => mutation.mutate({ username })}
      >
        {following ? (
          <>
            <UserMinus className="h-4 w-4" />
            {COPY.unsubscribe}
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            {actionLabel}
          </>
        )}
      </Button>
    </div>
  );
}
