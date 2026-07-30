"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

import { useElementScrolledPast } from "@/hooks/useElementScrolledPast";
import type { PostViewModel } from "@/types/domain";
import { ProfileFeedTabs, type ProfileFeedTab } from "./ProfileFeedTabs";

type ProfilePageViewProps = {
  posts: PostViewModel[];
  card: ReactNode;
  renderPost: (post: PostViewModel) => ReactNode;
  renderQuestions?: () => ReactNode;
  renderStickyHeader?: (visible: boolean) => ReactNode;
  initialTab?: ProfileFeedTab;
};

export function ProfilePageView({
  posts,
  card,
  renderPost,
  renderQuestions,
  renderStickyHeader,
  initialTab = "posts",
}: ProfilePageViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [feedTab, setFeedTab] = useState<ProfileFeedTab>(initialTab);
  const stickyVisible = useElementScrolledPast(cardRef, { edgeTop: 48 });
  const filteredPosts = useMemo(
    () =>
      feedTab === "media"
        ? posts.filter((post) => Boolean(post.mediaUrl))
        : posts,
    [feedTab, posts],
  );
  const emptyFeedMessage =
    feedTab === "media" ? "Пока нет постов с медиа" : "Пока нет постов";

  return (
    <>
      {renderStickyHeader?.(stickyVisible)}
      <div className="voople-profile-page flex w-full flex-col gap-4 py-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6 lg:py-6">
        <div
          ref={cardRef}
          className="voople-profile-page__card w-full shrink-0 lg:sticky lg:top-6 lg:self-start lg:w-[320px]"
        >
          {card}
        </div>

        <section
          data-voople-scroll=""
          className="voople-profile-page__posts voople-scroll min-w-0 space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
        >
          <ProfileFeedTabs active={feedTab} onChange={setFeedTab} />
          {feedTab === "questions" ? (
            renderQuestions ? (
              renderQuestions()
            ) : (
              <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
                Вопросы пока недоступны в этой версии приложения
              </p>
            )
          ) : filteredPosts.length === 0 ? (
            <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
              {emptyFeedMessage}
            </p>
          ) : (
            filteredPosts.map(renderPost)
          )}
        </section>
      </div>
    </>
  );
}
