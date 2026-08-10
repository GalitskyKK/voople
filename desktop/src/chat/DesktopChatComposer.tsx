import type { Session } from "@supabase/supabase-js";
import { useState, type FormEvent } from "react";

import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatMessageView } from "@/types/chat";
import { ChatComposerFrame } from "@/components/chat/ChatComposerVisual";

import type { DesktopConfig } from "../config";
import { DesktopChatComposerInput } from "./DesktopChatComposerInput";
import { DesktopChatComposerPreview } from "./DesktopChatComposerPreview";
import type { DesktopMessageDraft } from "./useDesktopChatThread";
import { useDesktopChatUpload } from "./useDesktopChatUpload";

export function DesktopChatComposer({
  config,
  session,
  replyTo,
  editing,
  sending,
  onCancelReply,
  onSend,
  onEdit,
  onCancelEdit,
}: {
  config: DesktopConfig;
  session: Session;
  replyTo: ChatMessageView | null;
  editing: ChatMessageView | null;
  sending: boolean;
  onCancelReply: () => void;
  onSend: (draft: DesktopMessageDraft) => Promise<boolean>;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  onCancelEdit: () => void;
}) {
  const [text, setText] = useState(() => editing?.text ?? "");
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
    Boolean(text.trim() || upload) &&
    (!editing || text.trim() !== editing.text?.trim());

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    if (editing) {
      if (await onEdit(editing.id, text)) {
        setText("");
        onCancelEdit();
      }
      return;
    }
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
    <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-4 lg:pb-3">
      <ChatComposerFrame>
        <form onSubmit={(event) => void submit(event)}>
          <DesktopChatComposerPreview
            editing={editing}
            replyTo={replyTo}
            upload={upload}
            onCancelReply={onCancelReply}
            onClearUpload={clear}
            onUpdateAudioMetadata={updateAudioMetadata}
            onCancelEdit={() => {
              setText("");
              onCancelEdit();
            }}
          />

          {error ? (
            <p className="mb-2 text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <DesktopChatComposerInput
            text={text}
            canSend={canSend}
            sending={sending}
            uploading={uploading}
            hasUpload={Boolean(upload)}
            editing={Boolean(editing)}
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
            <span className="mt-1 block text-right text-[10px] tabular-nums text-[var(--app-muted)]">
              {text.length}/1000
            </span>
          ) : null}
        </form>
      </ChatComposerFrame>
    </div>
  );
}
