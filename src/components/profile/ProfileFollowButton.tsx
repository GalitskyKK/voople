"use client";

import { UserCheck, UserMinus, UserPlus } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuthGate } from "@/components/auth/AuthGateProvider";

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
    <div className="flex flex-wrap gap-1">
      {following && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]">
          <UserCheck className="h-3 w-3 text-(--theme-accent)" aria-hidden />
          {COPY.subscribed}
        </span>
      )}
      {followsYou && (
        <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-2 py-0.5 text-[11px] text-[color-mix(in_srgb,var(--foreground)_52%,transparent)]">
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
  const { authenticated, requireAuth } = useAuthGate();

  const { data: followState, isLoading } = trpc.profile.getFollowState.useQuery(
    { username },
    { enabled: canFollow && authenticated, staleTime: 30_000 },
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
  const pending = mutation.isPending || (authenticated && isLoading);
  const toggleFollow = () => {
    if (!requireAuth({ title: "Подписаться на профиль" })) return;
    mutation.mutate({ username });
  };

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
        onClick={toggleFollow}
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
    <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5")}>
      <FollowStatusBadge following={following} followsYou={followsYou} />
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        size="sm"
        className="w-full"
        disabled={pending}
        aria-pressed={following}
        onClick={toggleFollow}
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
