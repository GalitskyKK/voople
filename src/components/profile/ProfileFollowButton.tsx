"use client";

import { UserMinus, UserPlus } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/Button";

type ProfileFollowButtonProps = {
  username: string;
  canFollow: boolean;
  layout?: "default" | "compact";
};

export function ProfileFollowButton({
  username,
  canFollow,
  layout = "default",
}: ProfileFollowButtonProps) {
  const utils = trpc.useUtils();

  const { data: followState } = trpc.profile.getFollowState.useQuery(
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

  if (layout === "compact") {
    return (
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        size="sm"
        className="shrink-0"
        disabled={mutation.isPending || !followState}
        onClick={() => mutation.mutate({ username })}
      >
        {following ? (
          <>
            <UserMinus className="h-4 w-4" />
            <span className="sr-only">{COPY.unsubscribe}</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span className="sr-only">{showFollowBack ? COPY.subscribeBack : COPY.subscribe}</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {showFollowBack && (
        <p className="text-xs text-white/55">{COPY.followsYou}</p>
      )}
      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        className="w-full"
        disabled={mutation.isPending || !followState}
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
            {showFollowBack ? COPY.subscribeBack : COPY.subscribe}
          </>
        )}
      </Button>
    </div>
  );
}
