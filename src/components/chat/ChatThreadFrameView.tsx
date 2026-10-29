import type { CSSProperties, ReactNode } from "react";

import type { ChatTimelineItem } from "@/lib/chat/group-messages";

import { ChatDateDivider } from "./ChatDateDivider";
import { ChatRoomActivitySummary } from "./ChatRoomActivitySummary";
import { GroupSurfaceShell, type GroupSurfaceConfig } from "./GroupSurfaceShell";
import { DirectWorkspaceView } from "./DirectWorkspaceView";

export function ChatThreadFrameView({
  accentColor,
  workspace = "conversation",
  header,
  groupSurface,
  sections,
  timeline,
  messagesRef,
  messagesContentRef,
  renderMessage,
  beforeMessages,
  afterMessages,
  emptyState,
  connectionState,
  composer,
  overlays,
}: {
  accentColor?: string | null;
  workspace?: "conversation" | "direct";
  header: ReactNode;
  groupSurface?: GroupSurfaceConfig;
  sections?: ReactNode;
  timeline: ChatTimelineItem[];
  messagesRef: (node: HTMLDivElement | null) => void;
  messagesContentRef: (node: HTMLDivElement | null) => void;
  renderMessage: (item: Extract<ChatTimelineItem, { type: "message" }>) => ReactNode;
  beforeMessages?: ReactNode;
  afterMessages?: ReactNode;
  emptyState?: ReactNode;
  connectionState?: ReactNode;
  composer: ReactNode;
  overlays?: ReactNode;
}) {
  const chatContent = (
    <>
      {sections}
      <div
        ref={messagesRef}
        data-voople-scroll=""
        className="voople-chat-window__messages voople-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 py-3"
      >
        <div
          ref={messagesContentRef}
          className="mx-auto flex min-h-full w-full max-w-[72rem] flex-col justify-end gap-0.5 px-2 sm:px-5 lg:px-6"
        >
          {beforeMessages}
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
      {connectionState}
      <div className="voople-chat-window__composer-slot min-w-0 shrink-0">{composer}</div>
    </>
  );

  return (
    <div
      className="voople-chat-window flex min-h-0 flex-1 flex-col"
      data-layout={groupSurface ? "group" : "conversation"}
      style={
        accentColor
          ? ({
              "--group-accent": accentColor,
            } as CSSProperties)
          : undefined
      }
    >
      {groupSurface ? (
        <GroupSurfaceShell
          key={`${groupSurface.groupId}:${groupSurface.initialTab ?? "now"}`}
          config={groupSurface}
          header={header}
          chatContent={chatContent}
        />
      ) : workspace === "direct" ? (
        <DirectWorkspaceView header={header}>{chatContent}</DirectWorkspaceView>
      ) : <>{header}<div className="voople-stage flex min-h-0 flex-1 flex-col">{chatContent}</div></>}
      {overlays}
    </div>
  );
}
