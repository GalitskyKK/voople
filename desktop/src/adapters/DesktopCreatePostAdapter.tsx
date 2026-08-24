import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { PostMediaUploadControl } from "@/components/media/PostMediaUploadControl";
import { CreatePostDialogView } from "@/components/feed/CreatePostDialogView";
import { useDesktopPostMediaUploads } from "../composer/useDesktopPostMediaUploads";
import { useDesktopCloudPostDraft } from "../composer/useDesktopCloudPostDraft";

export function DesktopCreatePostAdapter({
  config,
  onClose,
  onCreated,
  session,
}: {
  config: DesktopConfig;
  onClose: () => void;
  onCreated: () => void;
  session: Session;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const uploads = useDesktopPostMediaUploads(config, session);
  const cloudDraft = useDesktopCloudPostDraft(config, session, text, setText, uploads);

  const publish = async () => {
    const trimmed = text.trim();
    if (!trimmed && uploads.media.length === 0) {
      setError("Добавьте текст или медиа");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await client.mutation("post.create", {
        text: trimmed || undefined,
        media: uploads.media,
      });
      await cloudDraft.clear();
      onCreated();
      onClose();
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : "Не удалось опубликовать пост",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <CreatePostDialogView
      open
      text={text}
      busy={busy || uploads.busy}
      error={error}
      draftStatus={cloudDraft.active ? cloudDraft.saving ? "Сохраняем облачный черновик…" : cloudDraft.error ?? "Черновик синхронизирован с web" : null}
      uploadControl={<PostMediaUploadControl uploads={uploads} disabled={busy} />}
      onClose={onClose}
      onTextChange={setText}
      onPublish={() => void publish()}
    />
  );
}
