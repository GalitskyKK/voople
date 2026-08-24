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
        {timeline.length === 0 ? (
          <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
            Напишите первое сообщение
          </p>
        ) : null}
        <div
          ref={(node) => {
            messagesContentRef.current = node;
          }}
          className="mx-auto flex w-full flex-col gap-0.5 px-2"
        >
          {timeline.map((item) =>
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
