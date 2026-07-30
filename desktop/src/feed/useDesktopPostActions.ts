import type { Session } from "@supabase/supabase-js";
import { useCallback, useMemo, useState } from "react";

import type { PostViewModel } from "@/types/domain";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function useDesktopPostActions(
  config: DesktopConfig,
  session: Session,
  post: PostViewModel,
) {
  const [liked, setLiked] = useState(post.likedByViewer ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.repostedByViewer ?? false);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [pendingAction, setPendingAction] = useState<"like" | "repost" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const toggleLike = useCallback(async () => {
    if (pendingAction) return;
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(!previousLiked);
    setLikeCount((count) =>
      previousLiked ? Math.max(0, count - 1) : count + 1,
    );
    setPendingAction("like");
    setError(null);
    try {
      const value = (await client.mutation("post.like", {
        postId: post.id,
      })) as { liked?: boolean; likeCount?: number };
      if (typeof value.liked === "boolean") setLiked(value.liked);
      if (typeof value.likeCount === "number") setLikeCount(value.likeCount);
    } catch (actionError: unknown) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось поставить отметку",
      );
    } finally {
      setPendingAction(null);
    }
  }, [client, likeCount, liked, pendingAction, post.id]);

  const toggleRepost = useCallback(async () => {
    if (pendingAction) return;
    const previousReposted = reposted;
    const previousCount = repostCount;
    setReposted(!previousReposted);
    setRepostCount((count) =>
      previousReposted ? Math.max(0, count - 1) : count + 1,
    );
    setPendingAction("repost");
    setError(null);
    try {
      const value = (await client.mutation("post.repost", {
        postId: post.id,
      })) as { reposted?: boolean };
      if (typeof value.reposted === "boolean") {
        setReposted(value.reposted);
        setRepostCount(
          value.reposted
            ? previousCount + (previousReposted ? 0 : 1)
            : Math.max(0, previousCount - (previousReposted ? 1 : 0)),
        );
      }
    } catch (actionError: unknown) {
      setReposted(previousReposted);
      setRepostCount(previousCount);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось сделать репост",
      );
    } finally {
      setPendingAction(null);
    }
  }, [client, pendingAction, post.id, repostCount, reposted]);

  const share = useCallback(async () => {
    const url = `${config.apiUrl}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  }, [config.apiUrl, post.id]);

  return {
    error,
    likeCount,
    liked,
    pendingAction,
    repostCount,
    reposted,
    share,
    toggleLike,
    toggleRepost,
  };
}
