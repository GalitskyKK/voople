import { Bookmark } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SavedMessagesDestinationRenderer = (input: {
  className: string;
  children: ReactNode;
}) => ReactNode;

export function SavedMessagesShortcut({
  active,
  variant,
  renderDestination,
}: {
  active: boolean;
  variant: "inbox" | "sidebar";
  renderDestination: SavedMessagesDestinationRenderer;
}) {
  return renderDestination({
    className: cn(
      variant === "sidebar"
        ? "voople-messenger-sidebar__row group flex min-h-11 w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left transition-colors"
        : "voople-chat-list__row flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
      active
        ? variant === "sidebar"
          ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--foreground)]"
          : "voople-chat-list__row--active bg-[var(--app-accent-soft)]"
        : variant === "sidebar"
          ? "border-transparent text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          : "hover:bg-[var(--app-surface-soft)]",
    ),
    children: (
      <>
        <span className={cn(
          "grid shrink-0 place-items-center bg-[var(--app-accent-soft)] text-[var(--theme-accent)]",
          variant === "sidebar"
            ? "h-8 w-8 rounded-[var(--app-radius-md)]"
            : "h-11 w-11 rounded-[var(--app-radius-lg)]",
        )}>
          <Bookmark className={variant === "sidebar" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-semibold", variant === "sidebar" ? "text-xs" : "text-sm")}>
            Избранное
          </span>
          <span className={cn("block truncate text-[var(--app-muted)]", variant === "sidebar" ? "text-[10px]" : "mt-0.5 text-xs")}>
            Сообщения самому себе
          </span>
        </span>
      </>
    ),
  });
}
