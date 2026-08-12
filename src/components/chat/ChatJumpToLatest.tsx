import { ArrowDown } from "lucide-react";

export function ChatJumpToLatest({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="voople-chat-window__jump-to-latest sticky bottom-2 ml-auto mr-3 mt-2 grid h-9 w-9 place-items-center rounded-full border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] text-[var(--app-muted)] shadow-[var(--app-shadow-md)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[var(--foreground)]"
      onClick={() => onClick()}
      aria-label="Перейти к последним сообщениям"
    >
      <ArrowDown className="h-4 w-4" aria-hidden />
    </button>
  );
}
