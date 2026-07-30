"use client";

import { useEffect, useState } from "react";

import { MediaUploadControl } from "@/components/media/MediaUploadControl";
import { PostMedia } from "@/components/media/PostMedia";
import type { UploadedMedia } from "@/hooks/useMediaUpload";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { PostCommentsView } from "./PostCommentsView";

type PostCommentsProps = {
  postId: string;
  open: boolean;
  canComment: boolean;
  onCountChange?: (update: (count: number) => number) => void;
};

export function PostComments({
  postId,
  open,
  canComment,
  onCountChange,
}: PostCommentsProps) {
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

  const submit = () => {
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
    <PostCommentsView
      comments={comments}
      text={text}
      canComment={canComment}
      loading={isLoading}
      submitting={create.isPending}
      deletingCommentId={remove.isPending ? remove.variables?.commentId : null}
      hasMedia={Boolean(media)}
      error={create.error?.message ?? remove.error?.message}
      onTextChange={setText}
      onSubmit={submit}
      onDelete={(comment) => {
        if (window.confirm("Удалить комментарий?")) {
          remove.mutate({ commentId: comment.id });
        }
      }}
      uploadControl={
        <MediaUploadControl
          key={uploadResetKey}
          purpose="comment"
          onChange={setMedia}
          disabled={create.isPending}
        />
      }
      renderMedia={(comment) => (
        <PostMedia
          url={comment.mediaUrl!}
          mediaType={comment.mediaType}
          className="mt-2 max-w-xs"
        />
      )}
    />
  );
}
