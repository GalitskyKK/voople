import type { CSSProperties, ReactNode } from "react";

import { PostMediaGallery } from "@/components/media/PostMediaGallery";
import { RichText } from "@/components/ui/RichText";
import type { PostViewModel } from "@/types/domain";
import { PostCardBody, PostCardSurface } from "./PostCardVisual";

type PostCardViewProps = {
  post: Pick<PostViewModel, "id" | "media" | "mediaUrl" | "mediaType" | "tags">;
  text?: string | null;
  repostComment?: string | null;
  author: ReactNode;
  appearance?: ReactNode;
  status?: ReactNode;
  repost?: ReactNode;
  actions: ReactNode;
  footer?: ReactNode;
  error?: ReactNode;
  renderTag: (tag: string) => ReactNode;
  surfaceStyle?: CSSProperties;
  className?: string;
};

/** Canonical stateless post layout shared by Next and Tauri controllers. */
export function PostCardView({
  post,
  text,
  repostComment,
  author,
  appearance,
  status,
  repost,
  actions,
  footer,
  error,
  renderTag,
  surfaceStyle,
  className,
}: PostCardViewProps) {
  return (
    <PostCardSurface className={className} surfaceStyle={surfaceStyle}>
      {author}
      <PostCardBody>
        {repostComment ? (
          <p className="voople-post-card__text mb-3 text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
            <RichText text={repostComment} />
          </p>
        ) : null}
        {text ? (
          <p className="voople-post-card__text text-sm leading-relaxed text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">
            <RichText text={text} />
          </p>
        ) : null}
        <PostMediaGallery post={post} className="mt-3" />
        {appearance}
        {status}
        {repost}
        {post.tags?.length ? (
          <div className="voople-post-card__tags mt-2 flex flex-wrap gap-2">
            {post.tags.map((tag) => <span key={tag}>{renderTag(tag)}</span>)}
          </div>
        ) : null}
        {actions}
        {error}
        {footer}
      </PostCardBody>
    </PostCardSurface>
  );
}
