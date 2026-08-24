import type { Session } from "@supabase/supabase-js";
import { useState } from "react";

import { ChatComposerFormView } from "@/components/chat/ChatComposerFormView";
import { ChatComposerPreviewView } from "@/components/chat/ChatComposerPreviewView";
import { useLocalChatDraft } from "@/hooks/useLocalChatDraft";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { ChatMessageView, GroupEmojiView } from "@/types/chat";

import type { DesktopMessageDraft } from "../chat/useDesktopChatThread";
import { useDesktopChatUpload } from "../chat/useDesktopChatUpload";
import type { DesktopConfig } from "../config";

export function DesktopChatComposerAdapter({
  chatId,
  config,
  session,
  replyTo,
  editing,
  sending,
  onCancelReply,
  onSend,
  onEdit,
  onCancelEdit,
  customEmojis = [],
}: {
  chatId: string;
  config: DesktopConfig;
  session: Session;
  replyTo: ChatMessageView | null;
  editing: ChatMessageView | null;
  sending: boolean;
  onCancelReply: () => void;
  onSend: (draft: DesktopMessageDraft) => Promise<boolean>;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  onCancelEdit: () => void;
  customEmojis?: GroupEmojiView[];
}) {
  const [text, setText] = useState(() => editing?.text ?? "");
  useLocalChatDraft({
    accountId: session.user.id,
    chatId,
    text,
    editing: Boolean(editing),
    onRestore: setText,
  });
  const {
    clear,
    error,
    setError,
    updateAudioMetadata,
    upload,
    uploadFile,
    uploading,
  } = useDesktopChatUpload(config, session, chatId);

  const audioMetadataReady =
    upload?.kind !== "audio" ||
    Boolean(upload.title?.trim() && upload.artist?.trim());
  const canSend =
    !sending &&
    !uploading &&
    audioMetadataReady &&
    Boolean(text.trim() || upload) &&
    (!editing || text.trim() !== editing.text?.trim());

  const submit = async () => {
    if (!canSend) return;
    if (editing) {
      if (await onEdit(editing.id, text)) {
        setText("");
        onCancelEdit();
      }
      return;
    }
    const sent = await onSend({ text, replyTo, upload, customEmojis });
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
        await uploadFile(
          file,
          kind === "circle" ? { purpose: "circle" } : undefined,
        );
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
      <ChatComposerFormView
        preview={
          <ChatComposerPreviewView
            editing={editing}
            replyTo={replyTo}
            upload={upload}
            editableAudioMetadata
            onCancelReply={onCancelReply}
            onClearUpload={clear}
            onUpdateAudioMetadata={updateAudioMetadata}
            onCancelEdit={() => {
              setText("");
              onCancelEdit();
            }}
          />
        }
        error={error}
        textLength={text.length}
        onSubmit={() => void submit()}
        input={{
          focusKey: chatId,
          text,
          canSend,
          sending,
          busy: uploading,
          hasAttachment: Boolean(upload),
          editing: Boolean(editing),
          onTextChange: setText,
          onSubmit: () => void submit(),
          onImageSelected: selectImage,
          onAudioSelected: selectAudio,
          onPastedFile: pasteFile,
          onVoiceRecorded: (file, durationSeconds, purpose) => {
            void uploadFile(file, { purpose, durationSeconds });
          },
          onError: setError,
          customEmojis,
        }}
      />
    </div>
  );
}
