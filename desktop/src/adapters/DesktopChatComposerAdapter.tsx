import type { Session } from "@supabase/supabase-js";
import { useState } from "react";

import { useChatComposerSession } from "@/components/chat/ChatComposerSessionProvider";
import { ChatComposerFormView } from "@/components/chat/ChatComposerFormView";
import { ChatMusicAttachSheet } from "@/components/chat/ChatMusicAttachSheet";
import { ChatComposerPreviewView } from "@/components/chat/ChatComposerPreviewView";
import { useLocalChatDraft } from "@/hooks/useLocalChatDraft";
import { parseChatUploadMime } from "@/lib/object-storage/chat-mime";
import type { GroupEmojiView } from "@/types/chat";

import type { DesktopMessageDraft } from "../chat/useDesktopChatThread";
import { useDesktopChatUpload } from "../chat/useDesktopChatUpload";
import type { DesktopConfig } from "../config";

export function DesktopChatComposerAdapter({
  chatId,
  placeholder,
  config,
  session,
  sending,
  onSend,
  onEdit,
  customEmojis = [],
}: {
  chatId: string;
  placeholder?: string;
  config: DesktopConfig;
  session: Session;
  sending: boolean;
  onSend: (draft: DesktopMessageDraft) => Promise<boolean>;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  customEmojis?: GroupEmojiView[];
}) {
  const {
    text, replyTo, editing, pendingUpload, pendingTrack,
    setText, setReplyTo, setEditing, setPendingUpload, setPendingTrack,
  } = useChatComposerSession(chatId);
  const [musicSheetOpen, setMusicSheetOpen] = useState(false);
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
  } = useDesktopChatUpload(
    config,
    session,
    chatId,
    pendingUpload,
    setPendingUpload,
  );

  const audioMetadataReady =
    upload?.kind !== "audio" ||
    Boolean(upload.title?.trim() && upload.artist?.trim());
  const canSend =
    !sending &&
    !uploading &&
    audioMetadataReady &&
    Boolean(text.trim() || upload || pendingTrack) &&
    (!editing || text.trim() !== editing.text?.trim());

  const submit = async () => {
    if (!canSend) return;
    if (editing) {
      if (await onEdit(editing.id, text)) {
        setText("");
        setEditing(null);
      }
      return;
    }
    const sent = await onSend({ text, replyTo, upload, pendingTrack, customEmojis });
    if (!sent) return;
    setText("");
    clear();
    setPendingTrack(null);
    setReplyTo(null);
  };

  const selectImage = async (file?: File) => {
    if (!file) return;
    setPendingTrack(null);
    await uploadFile(file);
  };

  const selectAudio = async (file?: File) => {
    if (!file) return;
    setPendingTrack(null);
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
        setPendingTrack(null);
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
      <ChatMusicAttachSheet
        open={musicSheetOpen}
        onClose={() => setMusicSheetOpen(false)}
        onSelect={(track) => {
          clear();
          setPendingTrack(track);
        }}
      />
      <ChatComposerFormView
        preview={
          <ChatComposerPreviewView
            editing={editing}
            replyTo={replyTo}
            upload={upload}
            track={pendingTrack}
            editableAudioMetadata
            onCancelReply={() => setReplyTo(null)}
            onClearUpload={clear}
            onClearTrack={() => setPendingTrack(null)}
            onUpdateAudioMetadata={updateAudioMetadata}
            onCancelEdit={() => {
              setText("");
              setEditing(null);
            }}
          />
        }
        error={error}
        textLength={text.length}
        onSubmit={() => void submit()}
        input={{
          focusKey: chatId,
          placeholder,
          text,
          canSend,
          sending,
          busy: uploading,
          hasAttachment: Boolean(upload || pendingTrack),
          editing: Boolean(editing),
          onTextChange: setText,
          onSubmit: () => void submit(),
          onImageSelected: selectImage,
          onAudioSelected: selectAudio,
          onPastedFile: pasteFile,
          onPickMusic: () => setMusicSheetOpen(true),
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
