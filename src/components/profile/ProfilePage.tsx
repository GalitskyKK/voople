"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CreatePostBlock } from "@/components/feed/CreatePostBlock";
import { PostCard } from "@/components/feed/PostCard";
import { useElementScrolledPast } from "@/hooks/useElementScrolledPast";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import type { PostViewModel, ProfileViewModel } from "@/types/domain";
import type { Stroke } from "@/types/canvas";
import { ProfileFeedTabs, type ProfileFeedTab } from "./ProfileFeedTabs";
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
  canPost = false,
  canFollow = false,
  askDeepLink = false,
}: ProfilePageProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [feedTab, setFeedTab] = useState<ProfileFeedTab>(askDeepLink ? "questions" : "posts");
  const stickyVisible = useElementScrolledPast(cardRef, { edgeTop: 48 });
  const isOwner = Boolean(viewerId && viewerId === profile.id);
  const utils = trpc.useUtils();

  const { data: posts = initialPosts } = trpc.profile.getPostsByUsername.useQuery(
    { username: profile.username },
    {
      initialData: initialPosts,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  );

  const profileView = trpc.profile.view.useMutation({
    onSuccess: (data) => {
      setProfile((current) => ({
        ...current,
        stats: { ...current.stats, views: data.viewCount },
      }));
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
          setProfile((current) => ({
            ...current,
            stats: { ...current.stats, views: current.stats.views + 1 },
          }));
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
            setProfile((current) => ({
              ...current,
              stats: { ...current.stats, posts: current.stats.posts + 1 },
            }));
          }
          if (payload.eventType === "DELETE") {
            setProfile((current) => ({
              ...current,
              stats: { ...current.stats, posts: Math.max(0, current.stats.posts - 1) },
            }));
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

  const filteredPosts = useMemo(() => {
    if (feedTab === "media") return posts.filter((post) => Boolean(post.mediaUrl));
    return posts;
  }, [feedTab, posts]);

  const emptyFeedMessage =
    feedTab === "media" ? "Пока нет постов с медиа" : "Пока нет постов";

  return (
    <>
      <StickyProfileHeader
        visible={stickyVisible}
        profile={profile}
        isOwner={isOwner}
        canFollow={canFollow}
      />
      <div className="voople-profile-page flex w-full flex-col gap-4 py-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6 lg:py-6">
        <div ref={cardRef} className="voople-profile-page__card w-full shrink-0 lg:w-[320px]">
          <ProfileFlipCard
            profile={profile}
            isOwner={isOwner}
            canFollow={canFollow}
            viewerId={viewerId}
            initialStrokes={initialCanvasStrokes}
          />
        </div>

        <section
          data-voople-scroll=""
          className="voople-profile-page__posts voople-scroll min-w-0 space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
        >
          {canPost && feedTab !== "questions" && (
            <div className="hidden lg:block">
              <CreatePostBlock profile={profile} canPost />
            </div>
          )}
          <ProfileFeedTabs active={feedTab} onChange={setFeedTab} />
          {feedTab === "questions" ? (
            <ProfileQuestions
              profileUserId={profile.id}
              username={profile.username}
              isOwner={isOwner}
              canAsk={Boolean(viewerId) && !isOwner}
              autoFocusAsk={askDeepLink}
            />
          ) : filteredPosts.length === 0 ? (
            <p className="text-center text-sm text-white/50">{emptyFeedMessage}</p>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canLike={Boolean(viewerId)}
                viewerId={viewerId}
                profileUsername={profile.username}
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}
