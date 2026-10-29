"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";

import type { ChatListItem } from "@/types/chat";

import type { ChatSectionDestinationRenderer } from "./chat-section-destination";
import { ChatSectionPicker } from "./ChatSectionPicker";
import { useGroupPeopleAction } from "./GroupPeopleActionContext";
import { useGroupChatHeaderSlot } from "./GroupChatHeaderSlotContext";

export function ChatSectionsBarView({
  rootChat,
  activeChatId,
  renderDestination,
  createAction,
  onToggleFavorite,
  pendingFavoriteId,
  favoriteError,
}: {
  rootChat: ChatListItem;
  activeChatId: string;
  renderDestination: ChatSectionDestinationRenderer;
  createAction?: ReactNode | ((control: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => ReactNode);
  onToggleFavorite?: (sectionId: string) => void | Promise<void>;
  pendingFavoriteId?: string | null;
  favoriteError?: string | null;
}) {
  const peopleAction = useGroupPeopleAction();
  const headerSlot = useGroupChatHeaderSlot();
  const orbit = useInterfaceDesign() === "orbit";
  const sections = [rootChat, ...rootChat.channels];
  const activeSection = sections.find((section) => section.id === activeChatId) ?? rootChat;

  const content = !rootChat.topicsEnabled ? <div className="voople-chat-sections flex min-h-11 shrink-0 items-center border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3">
    <span className="text-xs font-semibold"># Общий</span>{peopleAction?.action}
  </div> : (
    <nav
      className="voople-chat-sections flex min-h-11 shrink-0 items-center gap-1 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 lg:min-h-9"
      aria-label="Разделы группы"
    >
      <ChatSectionPicker
        sections={sections}
        activeSection={activeSection}
        rootChatId={rootChat.id}
        renderDestination={renderDestination}
        createAction={createAction}
        onToggleFavorite={onToggleFavorite}
        pendingFavoriteId={pendingFavoriteId}
        favoriteError={favoriteError}
      />
      {peopleAction?.action}
    </nav>
  );
  return orbit && headerSlot ? createPortal(content, headerSlot) : content;
}
