"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { PostMedia } from "@/components/media/PostMedia";
import { MediaUploadControl } from "@/components/media/MediaUploadControl";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Button } from "@/components/ui/Button";
import type { UploadedMedia } from "@/hooks/useMediaUpload";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";

type PostCommentsProps = {
  postId: string;
  open: boolean;
  canComment: boolean;
  onCountChange?: (update: (count: number) => number) => void;
};

export function PostComments({ postId, open, canComment, onCountChange }: PostCommentsProps) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = trpc.post.listComments.useQuery(
    { postId },
    { enabled: open, staleTime: 10_000 },
  );

  const create = trpc.post.createComment.useMutation({
    onSuccess: (comment) => {
      setText("");
      setMedia(null);
      setUploadResetKey((key) => key + 1);
      utils.post.listComments.setData({ postId }, (current) =>
        current ? [...current, comment] : [comment],
      );
      onCountChange?.((count) => count + 1);
    },
  });

  const remove = trpc.post.deleteComment.useMutation({
    onSuccess: () => {
      onCountChange?.((count) => Math.max(0, count - 1));
      void utils.post.listComments.invalidate({ postId });
    },
  });

  useEffect(() => {
    if (!open) return;

    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const channel = supabase
      .channel(`post-comments:${postId}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          void utils.post.listComments.invalidate({ postId });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, postId, utils]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = text.trim();
    if ((!trimmed && !media) || create.isPending) return;
    create.mutate({
      postId,
      text: trimmed || undefined,
      mediaKey: media?.mediaKey,
      mediaType: media?.mediaType,
    });
  };

  return (
    <section className="mt-4 space-y-3 border-t border-white/10 pt-3">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={!canComment}
            maxLength={280}
            placeholder={canComment ? "Комментарий" : "Войдите, чтобы комментировать"}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#7B3AED]/60 disabled:cursor-default disabled:opacity-60"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={!canComment || (!text.trim() && !media) || create.isPending}
          >
            Ответить
          </Button>
        </div>
        {canComment && (
          <MediaUploadControl
            key={uploadResetKey}
            purpose="comment"
            onChange={setMedia}
            disabled={create.isPending}
          />
        )}
      </form>

      {isLoading && <div className="h-12 animate-pulse rounded-xl bg-white/5" />}

      {comments.map((comment) => (
        <article key={comment.id} className="rounded-xl bg-white/5 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{comment.author.displayName}</p>
              {comment.text && <p className="text-sm text-white/80">{comment.text}</p>}
              {comment.mediaUrl && (
                <PostMedia
                  url={comment.mediaUrl}
                  mediaType={comment.mediaType}
                  className="mt-2 max-w-xs"
                />
              )}
              <RelativeTime iso={comment.createdAt} className="mt-1 block text-xs text-white/40" />
            </div>
            {comment.canDelete && (
              <button
                type="button"
                onClick={() => remove.mutate({ commentId: comment.id })}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Удалить комментарий"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
