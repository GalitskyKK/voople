"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { ChatListItem } from "@/types/chat";

import { ChatUnreadBadge } from "./ChatUnreadBadge";
import {
  ChatSectionIcon,
  type ChatSectionDestinationRenderer,
} from "./chat-section-destination";

export function ChatSectionPicker({
  sections,
  activeSection,
  rootChatId,
  renderDestination,
}: {
  sections: ChatListItem[];
  activeSection: ChatListItem;
  rootChatId: string;
  renderDestination: ChatSectionDestinationRenderer;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const unreadElsewhere = sections.reduce(
    (total, section) => total + (section.id === activeSection.id ? 0 : section.unreadCount),
    0,
  );
  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    if (!normalized) return sections;
    return sections.filter((section) =>
      sectionLabel(section, rootChatId).toLocaleLowerCase("ru").includes(normalized),
    );
  }, [query, rootChatId, sections]);
  const unreadSections = query
    ? []
    : visibleSections.filter((section) => section.id !== activeSection.id && section.unreadCount > 0);
  const unreadIds = new Set(unreadSections.map((section) => section.id));
  const remainingSections = query
    ? visibleSections
    : visibleSections.filter((section) => !unreadIds.has(section.id));

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const moveOptionFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(".voople-chat-section-option"),
    );
    if (!options.length) return;
    event.preventDefault();
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? options.length - 1
        : event.key === "ArrowDown"
          ? currentIndex < 0 ? 0 : (currentIndex + 1) % options.length
          : currentIndex < 0 ? options.length - 1 : (currentIndex - 1 + options.length) % options.length;
    options[nextIndex]?.focus();
  };

  const renderSection = (section: ChatListItem) => renderDestination(
    section,
    "voople-chat-section-option flex min-h-10 w-full items-center gap-2 rounded-[var(--app-radius-sm)] px-2.5 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]",
    <>
      <ChatSectionIcon section={section} rootChatId={rootChatId} />
      <span className="min-w-0 flex-1 truncate">{sectionLabel(section, rootChatId)}</span>
      <ChatUnreadBadge count={section.unreadCount} />
      {section.id === activeSection.id ? (
        <Check className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" aria-label="Выбран" />
      ) : null}
    </>,
    close,
  );

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
      align="start"
      contentRole="dialog"
      ariaLabel="Выбор раздела группы"
      className="min-w-0"
      menuClassName="w-[min(22rem,calc(100vw-1rem))] rounded-[var(--app-radius-md)] p-2"
      trigger={(
        <button
          type="button"
          className="voople-chat-sections__selector voople-chat-sections__item--active relative inline-flex h-9 min-w-0 max-w-72 items-center gap-1.5 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--background)] px-2.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]"
          aria-label={`Текущий раздел: ${sectionLabel(activeSection, rootChatId)}${unreadElsewhere ? `. Непрочитано в других разделах: ${unreadElsewhere}` : ""}. Выбрать раздел`}
          aria-expanded={open}
        >
          <ChatSectionIcon section={activeSection} rootChatId={rootChatId} />
          <span className="truncate">{sectionLabel(activeSection, rootChatId)}</span>
          <ChatUnreadBadge count={activeSection.unreadCount} />
          {unreadElsewhere ? (
            <span className="hidden shrink-0 text-xs font-medium leading-4 text-[var(--app-muted)] sm:inline">
              · {unreadElsewhere > 99 ? "99+" : unreadElsewhere} в других
            </span>
          ) : null}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
        </button>
      )}
    >
      <div onKeyDown={moveOptionFocus}>
        <label className="flex h-10 items-center gap-2 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--background)] px-2.5 focus-within:border-[var(--theme-accent)]">
          <Search className="h-4 w-4 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
          <span className="sr-only">Найти раздел</span>
          <input
            data-dropdown-autofocus=""
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти раздел"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--app-muted)]"
          />
        </label>

        <div className="voople-scroll mt-2 max-h-72 overflow-y-auto" aria-live="polite">
          {unreadSections.length ? (
            <section aria-labelledby="chat-section-unread-title">
              <p id="chat-section-unread-title" className="px-2.5 pb-1 pt-1 text-xs font-semibold leading-4 text-[var(--app-muted)]">
                Непрочитанное
              </p>
              {unreadSections.map(renderSection)}
            </section>
          ) : null}
          {remainingSections.length ? (
            <section aria-labelledby="chat-section-all-title">
              <p id="chat-section-all-title" className="px-2.5 pb-1 pt-2 text-xs font-semibold leading-4 text-[var(--app-muted)]">
                {query ? "Результаты" : "Все разделы"}
              </p>
              {remainingSections.map(renderSection)}
            </section>
          ) : (
            <p className="px-2.5 py-5 text-center text-sm text-[var(--app-muted)]" role="status">
              Раздел не найден
            </p>
          )}
        </div>
      </div>
    </DropdownMenu>
  );
}

function sectionLabel(section: ChatListItem, rootChatId: string) {
  return section.id === rootChatId ? "Общий" : section.name || "Раздел";
}
