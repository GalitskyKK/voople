import { PostMediaVisual } from "@/components/media/PostMediaVisual";
import type { PostViewModel } from "@/types/domain";

export function DesktopPostMedia({
  post,
  className = "mt-3",
}: {
  post: Pick<PostViewModel, "mediaUrl" | "mediaType">;
  className?: string;
}) {
  if (!post.mediaUrl) return null;

  return (
    <PostMediaVisual
      url={post.mediaUrl}
      mediaType={post.mediaType}
      className={className}
      image={
        <img
          className="max-h-96 w-full object-contain"
          src={post.mediaUrl}
          alt="Вложение"
          loading="lazy"
        />
      }
    />
  );
}
