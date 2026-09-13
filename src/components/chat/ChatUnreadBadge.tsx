import { cn } from "@/lib/utils";

export function ChatUnreadBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count < 1) return null;

  return (
    <span
      aria-label={`Непрочитанных сообщений: ${count}`}
      className={cn(
        "voople-counter inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent)] px-1 text-[9px] font-semibold leading-4 text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
