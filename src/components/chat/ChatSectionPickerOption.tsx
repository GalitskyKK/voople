"use client";

import { Check, Star } from "lucide-react";

import type { ChatListItem } from "@/types/chat";

import { ChatUnreadBadge } from "./ChatUnreadBadge";
import {
  ChatSectionIcon,
  type ChatSectionDestinationRenderer,
} from "./chat-section-destination";

export function ChatSectionPickerOption({
  section,
  rootChatId,
  label,
  active,
  renderDestination,
  onNavigate,
  onToggleFavorite,
  favoriteUpdatePending,
}: {
  section: ChatListItem;
  rootChatId: string;
  label: string;
  active: boolean;
  renderDestination: ChatSectionDestinationRenderer;
  onNavigate: () => void;
  onToggleFavorite?: (sectionId: string) => void | Promise<void>;
  favoriteUpdatePending: boolean;
}) {
  const favorite = Boolean(section.favoritePosition);

  return (
    <div className="flex items-center gap-1">
      <div className="min-w-0 flex-1">
        {renderDestination(
          section,
          "voople-chat-section-option flex min-h-10 w-full items-center gap-2 rounded-[var(--app-radius-sm)] px-2.5 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]",
          <>
            <ChatSectionIcon section={section} rootChatId={rootChatId} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChatUnreadBadge count={section.unreadCount} />
            {active ? (
              <Check
                className="h-4 w-4 shrink-0 text-[var(--theme-accent)]"
                aria-label="Выбран"
              />
            ) : null}
          </>,
          onNavigate,
        )}
      </div>
      {section.id !== rootChatId && onToggleFavorite ? (
        <button
          type="button"
          aria-label={favorite ? `Убрать ${label} из избранных` : `Закрепить ${label}`}
          aria-pressed={favorite}
          disabled={favoriteUpdatePending}
          onClick={() => void onToggleFavorite(section.id)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--app-radius-sm)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--theme-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)] disabled:opacity-50"
        >
          <Star
            className={`h-4 w-4 ${favorite ? "fill-current text-[var(--theme-accent)]" : ""}`}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  );
}
