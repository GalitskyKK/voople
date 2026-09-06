import type { CSSProperties, ReactNode } from "react";

import type { ChatTimelineItem } from "@/lib/chat/group-messages";

import { ChatDateDivider } from "./ChatDateDivider";
import { ChatRoomActivitySummary } from "./ChatRoomActivitySummary";

export function ChatThreadFrameView({
  accentColor,
  header,
  sections,
  timeline,
  messagesRef,
  messagesContentRef,
  renderMessage,
  afterMessages,
  emptyState,
  error,
  composer,
  overlays,
}: {
  accentColor?: string | null;
  header: ReactNode;
  sections?: ReactNode;
  timeline: ChatTimelineItem[];
  messagesRef: { current: HTMLDivElement | null };
  messagesContentRef: { current: HTMLDivElement | null };
  renderMessage: (item: Extract<ChatTimelineItem, { type: "message" }>) => ReactNode;
  afterMessages?: ReactNode;
  emptyState?: ReactNode;
  error?: string | null;
  composer: ReactNode;
  overlays?: ReactNode;
}) {
  return (
    <div
      className="voople-chat-window flex min-h-0 flex-1 flex-col"
      style={
        accentColor
          ? ({
              "--group-accent": accentColor,
              "--theme-accent": accentColor,
            } as CSSProperties)
          : undefined
      }
    >
      {header}
      {sections}
      <div
        ref={(node) => {
          messagesRef.current = node;
        }}
        data-voople-scroll=""
        className="voople-chat-window__messages voople-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 py-3"
      >
        <div
          ref={(node) => {
            messagesContentRef.current = node;
          }}
          className="mx-auto flex min-h-full w-full flex-col justify-end gap-0.5 px-2"
        >
          {timeline.length === 0
            ? emptyState ?? (
                <p className="pb-4 text-sm text-[var(--app-muted)]">
                  Напишите первое сообщение
                </p>
              )
            : timeline.map((item) =>
                item.type === "date" ? (
                  <ChatDateDivider key={item.key} label={item.label} />
                ) : item.type === "roomSummary" ? (
                  <ChatRoomActivitySummary
                    key={item.key}
                    dayLabel={item.dayLabel}
                    durationSeconds={item.durationSeconds}
                    sessions={item.sessions}
                  />
                ) : (
                  renderMessage(item)
                ),
              )}
        </div>
        {afterMessages}
      </div>
      {error ? (
        <p className="px-4 pt-1 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {composer}
      {overlays}
    </div>
  );
}
