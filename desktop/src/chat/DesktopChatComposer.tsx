import type { Session } from "@supabase/supabase-js";
import { useState, type FormEvent } from "react";

import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatMessageView } from "@/types/chat";

import type { DesktopConfig } from "../config";
import { DesktopChatComposerInput } from "./DesktopChatComposerInput";
import { DesktopChatComposerPreview } from "./DesktopChatComposerPreview";
import type { DesktopMessageDraft } from "./useDesktopChatThread";
import { useDesktopChatUpload } from "./useDesktopChatUpload";

export function DesktopChatComposer({
  config,
  session,
  replyTo,
  sending,
  onCancelReply,
  onSend,
}: {
  config: DesktopConfig;
  session: Session;
  replyTo: ChatMessageView | null;
  sending: boolean;
  onCancelReply: () => void;
  onSend: (draft: DesktopMessageDraft) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const {
    clear,
    error,
    setError,
    updateAudioMetadata,
    upload,
    uploadFile,
    uploading,
  } = useDesktopChatUpload(config, session);

  const audioMetadataReady =
    upload?.kind !== "audio" ||
    Boolean(upload.title?.trim() && upload.artist?.trim());
  const canSend =
    !sending &&
    !uploading &&
    audioMetadataReady &&
    Boolean(text.trim() || upload);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    const sent = await onSend({ text, replyTo, upload });
    if (!sent) return;
    setText("");
    clear();
    onCancelReply();
  };

  const selectImage = async (file?: File) => {
    if (file) await uploadFile(file);
  };

  const selectAudio = async (file?: File) => {
    if (!file) return;
    const uploaded = await uploadFile(file);
    if (!uploaded) return;
    updateAudioMetadata({
      title: file.name.replace(/\.[^.]+$/u, "") || "Аудиофайл",
      artist: "Аудиосообщение",
    });
  };

  const pasteFile = async (file: File) => {
    try {
      const { kind } = parseChatUploadMime(file.type);
      if (kind === "audio") {
        await selectAudio(file);
      } else {
        await uploadFile(file, kind === "circle" ? { purpose: "circle" } : undefined);
      }
    } catch (pasteError) {
      setError(
        pasteError instanceof Error
          ? pasteError.message
          : "Формат файла не поддерживается",
      );
    }
  };

  return (
    <form
      className="desktop-chat-composer"
      onSubmit={(event) => void submit(event)}
    >
      <DesktopChatComposerPreview
        replyTo={replyTo}
        upload={upload}
        onCancelReply={onCancelReply}
        onClearUpload={clear}
        onUpdateAudioMetadata={updateAudioMetadata}
      />

      {error ? (
        <p className="form-error desktop-chat-composer__error" role="alert">
          {error}
        </p>
      ) : null}

      <DesktopChatComposerInput
        text={text}
        canSend={canSend}
        sending={sending}
        uploading={uploading}
        hasUpload={Boolean(upload)}
        onTextChange={setText}
        onSubmit={() => void submit()}
        onImageSelected={selectImage}
        onAudioSelected={selectAudio}
        onPastedFile={pasteFile}
        onVoiceRecorded={(file, durationSeconds, purpose) => {
          void uploadFile(file, { purpose, durationSeconds });
        }}
        onError={setError}
      />
      {text.length >= 800 ? (
        <span className="desktop-chat-composer__counter">
          {text.length}/1000
        </span>
      ) : null}
    </form>
  );
}
