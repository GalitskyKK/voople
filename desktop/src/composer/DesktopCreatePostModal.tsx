import type { Session } from "@supabase/supabase-js";
import { ImagePlus, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { DesktopMediaDropzone } from "./DesktopMediaDropzone";
import { useDesktopMediaUpload } from "./useDesktopMediaUpload";

export function DesktopCreatePostModal({
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
  const upload = useDesktopMediaUpload(config, session);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  const publish = async () => {
    const trimmed = text.trim();
    if (!trimmed && !upload.media) {
      setError("Добавьте текст или медиа");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await client.mutation("post.create", {
        text: trimmed || undefined,
        mediaKey: upload.media?.mediaKey,
        mediaType: upload.media?.mediaType,
      });
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
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <header>
          <div className="composer-icon"><ImagePlus size={20} /></div>
          <div>
            <h2 id="composer-title">Новая публикация</h2>
            <p>Поделитесь тем, что происходит.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>
        <textarea
          autoFocus
          maxLength={280}
          placeholder="Что нового?"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={busy}
        />
        <DesktopMediaDropzone
          error={upload.error}
          media={upload.media}
          uploading={upload.uploading}
          onUpload={(file) => void upload.upload(file)}
          onRemove={upload.remove}
        />
        <div className="composer-footer">
          <span>{text.length}/280</span>
          <button
            type="button"
            className="primary-button"
            onClick={publish}
            disabled={busy || upload.uploading}
          >
            <Send size={16} />
            {busy ? "Публикуем…" : "Опубликовать"}
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
