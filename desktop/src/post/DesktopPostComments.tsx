import type { Session } from "@supabase/supabase-js";
import { useState } from "react";

import { PostCommentsView } from "@/components/feed/PostCommentsView";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import type { CommentViewModel } from "@/types/domain";
import { DesktopMediaDropzone } from "../composer/DesktopMediaDropzone";
import { useDesktopMediaUpload } from "../composer/useDesktopMediaUpload";
import type { DesktopConfig } from "../config";
import { PostMediaGallery } from "@/components/media/PostMediaGallery";

type DesktopPostCommentsProps = {
  comments: CommentViewModel[];
  loading: boolean;
  creating: boolean;
  deletingCommentId: string | null;
  error: string | null;
  config: DesktopConfig;
  session: Session;
  onCreate: (input: {
    text?: string;
    mediaKey?: string;
    mediaType?: "image" | "gif" | "meme" | "video" | "circle";
  }) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<boolean>;
};

export function DesktopPostComments({
  comments,
  loading,
  creating,
  deletingCommentId,
  error,
  config,
  session,
  onCreate,
  onDelete,
}: DesktopPostCommentsProps) {
  const [text, setText] = useState("");
  const upload = useDesktopMediaUpload(config, session, "comment");

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed && !upload.media) return;
    const created = await onCreate({
      text: trimmed || undefined,
      mediaKey: upload.media?.mediaKey,
      mediaType: upload.media?.mediaType,
    });
    if (created) {
      setText("");
      upload.remove();
    }
  };

  return (
    <PostCommentsView
      comments={comments}
      text={text}
      canComment
      loading={loading}
      submitting={creating || upload.uploading}
      deletingCommentId={deletingCommentId}
      hasMedia={Boolean(upload.media)}
      error={error}
      badgeUrl={vooplusBadgeUrl(config.assetsCdnUrl)}
      onTextChange={setText}
      onSubmit={() => void submit()}
      onDelete={(comment) => {
        if (window.confirm("Удалить комментарий?")) {
          void onDelete(comment.id);
        }
      }}
      uploadControl={
        <DesktopMediaDropzone
          compact
          error={upload.error}
          media={upload.media}
          onRemove={upload.remove}
          onUpload={(file) => void upload.upload(file)}
          uploading={upload.uploading}
        />
      }
      renderMedia={(comment) => (
        <PostMediaGallery post={comment} className="mt-2 max-w-xs" />
      )}
    />
  );
}
