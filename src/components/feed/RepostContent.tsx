import { FileX2 } from "lucide-react";

import type { PostViewModel } from "@/types/domain";

import { RepostPreview } from "./RepostPreview";

export function RepostContent({ post }: { post: PostViewModel }) {
  if (post.repost?.target) {
    return (
      <div className="mt-3">
        <RepostPreview post={post.repost.target} />
      </div>
    );
  }

  if (!post.repostUnavailable) return null;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-5 text-[var(--app-muted)]">
      <FileX2 className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">
          Публикация недоступна
        </p>
        <p className="mt-0.5 text-xs">Автор удалил исходную публикацию.</p>
      </div>
    </div>
  );
}
