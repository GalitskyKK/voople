import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MessagesLayoutViewProps = {
  isThread: boolean;
  listHeader: ReactNode;
  list: ReactNode;
  thread: ReactNode;
  wallpaper?: "plain" | "doodles" | "grid" | "aurora";
};

export function MessagesLayoutView({
  isThread,
  listHeader,
  list,
  thread,
  wallpaper = "doodles",
}: MessagesLayoutViewProps) {
  return (
    <div
      className="voople-messages-layout flex min-h-0 flex-1 flex-col"
      data-chat-wallpaper={wallpaper}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className={cn(
            "flex min-h-0 w-full flex-col bg-[var(--app-surface-soft)] lg:w-[320px] lg:shrink-0 lg:border-r lg:border-[var(--app-border)]",
            isThread ? "hidden lg:flex" : "flex flex-1 lg:flex-none",
          )}
        >
          {listHeader}
          <div
            data-voople-scroll=""
            className={cn(
              "voople-messages-layout__list voople-scroll min-h-0 flex-1 overflow-y-auto px-4 lg:px-4 lg:pb-3",
              !isThread &&
                "pb-[max(5.5rem,calc(3.625rem+1.25rem+env(safe-area-inset-bottom)))]",
            )}
          >
            {list}
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--app-surface)]",
            isThread ? "flex" : "hidden lg:flex",
          )}
        >
          {isThread ? (
            thread
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-[var(--app-muted)]">
                Выберите чат слева или начните новый
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
