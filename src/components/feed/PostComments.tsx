"use client";

import { useEffect, useState } from "react";

import { MediaUploadDropzoneView } from "@/components/media/MediaUploadDropzoneView";
import { PostMedia } from "@/components/media/PostMedia";
import { useMediaUpload } from "@/hooks/useMediaUpload";
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
  const upload = useMediaUpload("comment");
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = trpc.post.listComments.useQuery(
    { postId },
    { enabled: open, staleTime: 10_000 },
  );

  const create = trpc.post.createComment.useMutation({
    onSuccess: (comment) => {
      setText("");
      upload.reset();
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
    if ((!trimmed && !upload.uploaded) || create.isPending) return;
    create.mutate({
      postId,
      text: trimmed || undefined,
      mediaKey: upload.uploaded?.mediaKey,
      mediaType: upload.uploaded?.mediaType,
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
      hasMedia={Boolean(upload.uploaded)}
      error={create.error?.message ?? remove.error?.message ?? upload.error}
      onTextChange={setText}
      onSubmit={submit}
      onDelete={(comment) => {
        if (window.confirm("Удалить комментарий?")) {
          remove.mutate({ commentId: comment.id });
        }
      }}
      uploadControl={
        <MediaUploadDropzoneView
          compact
          allowVideo={false}
          error={upload.error}
          media={upload.uploaded}
          onRemove={upload.reset}
          onUpload={(file) => void upload.uploadFile(file)}
          uploading={upload.isUploading}
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
