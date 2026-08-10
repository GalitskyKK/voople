import type { Session } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";

import { PostDetailViewVisual } from "@/components/feed/PostDetailViewVisual";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { AppPageContent } from "@/components/layout/AppPageContent";
import type { DesktopConfig } from "../config";
import { DesktopPostCard } from "../feed/DesktopPostCard";
import { DesktopPostComments } from "./DesktopPostComments";
import { useDesktopPostDetail } from "./useDesktopPostDetail";

export function DesktopPostDetail({
  config,
  session,
  postId,
  renderDestination,
}: {
  config: DesktopConfig;
  session: Session;
  postId: string;
  renderDestination: NavigationDestinationRenderer;
}) {
  const detail = useDesktopPostDetail(config, session, postId);

  if (detail.loading) {
    return (
      <AppPageContent
        className="py-4"
        aria-label="Загрузка публикации"
      >
        <div className="feed-skeleton h-80 rounded-2xl" />
      </AppPageContent>
    );
  }

  if (detail.error || !detail.post) {
    return (
      <AppPageContent className="py-4">
        <div className="feed-message" role="alert">
          <p>{detail.error ?? "Публикация не найдена"}</p>
          <button type="button" onClick={() => void detail.retry()}>
            Повторить
          </button>
        </div>
      </AppPageContent>
    );
  }

  return (
    <AppPageContent>
      <PostDetailViewVisual
        backAction={renderDestination({
          href: "/feed",
          label: "Назад к ленте",
          active: false,
          className:
            "inline-flex items-center gap-2 text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] transition hover:text-[var(--foreground)]",
          children: (
            <>
              <ArrowLeft className="h-4 w-4" />
              Назад к ленте
            </>
          ),
        })}
      >
        <DesktopPostCard
          post={detail.post}
          config={config}
          session={session}
          renderDestination={renderDestination}
        />
        <DesktopPostComments
          comments={detail.comments}
          loading={detail.commentsLoading}
          creating={detail.creating}
          deletingCommentId={detail.deletingCommentId}
          error={detail.mutationError}
          config={config}
          session={session}
          onCreate={detail.createComment}
          onDelete={detail.deleteComment}
        />
      </PostDetailViewVisual>
    </AppPageContent>
  );
}
