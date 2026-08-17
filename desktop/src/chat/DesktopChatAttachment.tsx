import { Music2 } from "lucide-react";

import type { ChatMessageAttachment } from "@/types/chat";

export function DesktopChatAttachment({
  attachment,
  onOpenImage,
}: {
  attachment: ChatMessageAttachment;
  onOpenImage?: (url: string) => void;
}) {
  if (attachment.kind === "image") {
    return (
      <button
        type="button"
        className="voople-chat-image block overflow-hidden rounded-[var(--app-radius-md)] text-left"
        onClick={(event) => {
          event.stopPropagation();
          onOpenImage?.(attachment.url);
        }}
      >
        <img
          src={attachment.url}
          alt="Вложение"
          className="max-h-72 max-w-full object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  if (attachment.kind === "circle") {
    return (
      <video
        src={attachment.url}
        controls
        playsInline
        preload="metadata"
        className="h-48 w-48 max-w-[70vw] rounded-full bg-black object-cover"
      />
    );
  }

  if (attachment.kind === "audio") {
    return (
      <div className="min-w-[14rem] max-w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-2.5">
        <p className="truncate text-sm font-medium">{attachment.title}</p>
        <p className="mb-2 truncate text-xs text-[var(--app-muted)]">
          {attachment.artist}
        </p>
        <audio
          src={attachment.url}
          controls
          preload="metadata"
          className="voople-chat-audio__player max-w-full"
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-[14rem] max-w-full items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
        <Music2 className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {attachment.track.title}
        </p>
        <p className="truncate text-xs text-[var(--app-muted)]">
          {attachment.track.artist}
        </p>
      </div>

      <audio
        src={attachment.track.streamUrl}
        controls
        preload="none"
        className="h-8 w-32"
      />
    </div>
  );
}
