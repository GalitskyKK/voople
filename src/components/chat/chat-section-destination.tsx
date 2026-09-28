import { Hash } from "lucide-react";
import type { ReactNode } from "react";

import type { ChatListItem } from "@/types/chat";

export type ChatSectionDestinationRenderer = (
  chat: ChatListItem,
  className: string,
  children: ReactNode,
  onNavigate?: () => void,
) => ReactNode;

export function ChatSectionIcon({
  section,
  rootChatId,
}: {
  section: ChatListItem;
  rootChatId: string;
}) {
  return section.id !== rootChatId && section.topicIcon ? (
    <span aria-hidden="true">{section.topicIcon}</span>
  ) : (
    <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  );
}
