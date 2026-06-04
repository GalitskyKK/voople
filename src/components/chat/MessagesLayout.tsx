"use client";

import { usePathname } from "next/navigation";

import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { COPY } from "@/lib/constants/copy";
import { activeMessagesChatId } from "@/lib/layout/messages-path";
import { cn } from "@/lib/utils";

import { ChatList } from "./ChatList";

export function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chatId = activeMessagesChatId(pathname);
  const isThread = Boolean(chatId);

  return (
    <div className="voople-messages-layout flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row",
          "lg:rounded-[var(--app-radius-xl)] lg:border lg:border-[var(--app-border)] lg:bg-[var(--app-surface-soft)]",
        )}
      >
        <aside
          className={cn(
            "flex min-h-0 w-full flex-col lg:w-[320px] lg:shrink-0 lg:border-r lg:border-[var(--app-border)]",
            isThread ? "hidden lg:flex" : "flex flex-1 lg:flex-none",
          )}
        >
          <SectionPageHeader
            title={COPY.messages}
            description="Диалоги с подписчиками и друзьями"
            className="border-b-0 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-4"
          />
          <div
            data-voople-scroll=""
            className={cn(
              "voople-messages-layout__list voople-scroll min-h-0 flex-1 overflow-y-auto px-4 lg:px-4 lg:pb-3",
              !isThread && "pb-[max(5.5rem,calc(3.625rem+1.25rem+env(safe-area-inset-bottom)))]",
            )}
          >
            <ChatList activeChatId={chatId} />
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            isThread ? "flex" : "hidden lg:flex",
          )}
        >
          {isThread ? (
            children
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-[var(--app-muted)]">
                Выберите диалог слева или найдите человека в поиске
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
