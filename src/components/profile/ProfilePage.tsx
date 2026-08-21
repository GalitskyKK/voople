"use client";

import { useEffect } from "react";

import { PostCard } from "@/components/feed/PostCard";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import type { PostViewModel, ProfileViewModel } from "@/types/domain";
import type { Stroke } from "@/types/canvas";
import { ProfilePageView } from "./ProfilePageView";
import { ProfileCard } from "./ProfileCard";
import { ProfileQuestions } from "./ProfileQuestions";
import { ProfileFlipCard } from "./canvas/ProfileFlipCard";
import { StickyProfileHeader } from "./StickyProfileHeader";

type ProfilePageProps = {
  profile: ProfileViewModel;
  posts: PostViewModel[];
  initialCanvasStrokes?: Stroke[];
  viewerId?: string | null;
  canPost?: boolean;
  canFollow?: boolean;
  /** Заход по ask-ссылке (`?ask=1`): открыть вкладку вопросов и сфокусировать форму. */
  askDeepLink?: boolean;
};

export function ProfilePage({
  profile: initialProfile,
  posts: initialPosts,
  initialCanvasStrokes = [],
  viewerId = null,
  canFollow = false,
  askDeepLink = false,
}: ProfilePageProps) {
  const utils = trpc.useUtils();

  const { data: liveProfile } = trpc.profile.getByUsername.useQuery(
    { username: initialProfile.username },
    {
      initialData: initialProfile,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );
  const profile = liveProfile ?? initialProfile;
  const isOwner = Boolean(viewerId && viewerId === profile.id);

  const { data: posts = initialPosts } = trpc.profile.getPostsByUsername.useQuery(
    { username: profile.username },
    {
      initialData: initialPosts,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  );
  const { data: pinnedPost = null } = trpc.profile.getPinnedPostByUsername.useQuery(
    { username: profile.username },
    { refetchOnWindowFocus: false },
  );

  const profileView = trpc.profile.view.useMutation({
    onSuccess: (data) => {
      utils.profile.getByUsername.setData(
        { username: initialProfile.username },
        (current) => current ? { ...current, stats: { ...current.stats, views: data.viewCount } } : current,
      );
    },
  });
  const recordProfileView = profileView.mutate;

  useEffect(() => {
    if (!viewerId || isOwner) return;
    recordProfileView({ profileUserId: profile.id });
  }, [isOwner, profile.id, recordProfileView, viewerId]);

  useEffect(() => {
    if (!isOwner) return;
    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const channel = supabase
      .channel(`profile-views:${profile.id}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profile_views",
          filter: `profile_user_id=eq.${profile.id}`,
        },
        () => {
          utils.profile.getByUsername.setData(
            { username: profile.username },
            (current) => current ? { ...current, stats: { ...current.stats, views: current.stats.views + 1 } } : current,
          );
          void utils.profile.getByUsername.invalidate({ username: profile.username });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOwner, profile.id, profile.username, utils]);

  useEffect(() => {
    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const channel = supabase
      .channel(`profile-posts:${profile.id}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `author_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            utils.profile.getByUsername.setData(
              { username: profile.username },
              (current) => current ? { ...current, stats: { ...current.stats, posts: current.stats.posts + 1 } } : current,
            );
          }
          if (payload.eventType === "DELETE") {
            utils.profile.getByUsername.setData(
              { username: profile.username },
              (current) => current ? { ...current, stats: { ...current.stats, posts: Math.max(0, current.stats.posts - 1) } } : current,
            );
          }
          void utils.profile.getPostsByUsername.invalidate({ username: profile.username });
          void utils.profile.getByUsername.invalidate({ username: profile.username });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile.id, profile.username, utils]);

  return (
    <ProfilePageView
      posts={posts}
      pinnedPost={pinnedPost}
      initialTab={askDeepLink ? "questions" : "posts"}
      card={
        <ProfileFlipCard
          profile={profile}
          isOwner={isOwner}
          viewerId={viewerId}
          initialStrokes={initialCanvasStrokes}
          front={
            <ProfileCard
              profile={profile}
              isOwner={isOwner}
              canFollow={canFollow}
              className="h-full"
            />
          }
        />
      }
      renderStickyHeader={(visible) => (
        <StickyProfileHeader
          visible={visible}
          profile={profile}
          isOwner={isOwner}
          canFollow={canFollow}
        />
      )}
      renderQuestions={() => (
        <ProfileQuestions
          profileUserId={profile.id}
          username={profile.username}
          isOwner={isOwner}
          canAsk={Boolean(viewerId) && !isOwner}
          canReact={Boolean(viewerId)}
          autoFocusAsk={askDeepLink}
        />
      )}
      renderPost={(post) => (
        <PostCard
          key={post.id}
          post={post}
          canLike={Boolean(viewerId)}
          viewerId={viewerId}
          profileUsername={profile.username}
        />
      )}
      renderPinnedPost={(post) => (
        <PostCard
          key={`pinned:${post.id}`}
          post={post}
          canLike={Boolean(viewerId)}
          viewerId={viewerId}
          profileUsername={profile.username}
          isPinned
        />
      )}
    />
  );
}
