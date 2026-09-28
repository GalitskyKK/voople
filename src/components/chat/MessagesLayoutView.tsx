import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MessagesLayoutViewProps = {
  isThread: boolean;
  list: ReactNode;
  thread: ReactNode;
  wallpaper?: "plain" | "doodles" | "grid" | "aurora";
};

export function MessagesLayoutView({
  isThread,
  list,
  thread,
  wallpaper = "doodles",
}: MessagesLayoutViewProps) {
  return (
    <div
      className="voople-messages-layout flex min-h-0 flex-1 flex-col"
      data-chat-wallpaper={wallpaper}
      data-thread={isThread ? "true" : "false"}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className={cn(
            "min-h-0 w-full flex-col lg:hidden",
            isThread ? "hidden" : "flex flex-1",
          )}
        >
          {list}
        </aside>

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
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
