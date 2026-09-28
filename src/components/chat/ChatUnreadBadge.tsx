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
        "voople-counter inline-flex min-w-4 shrink-0 items-center justify-center rounded-full border border-[var(--material-border)] bg-[var(--material-control-fill)] px-1 text-[9px] font-semibold leading-4 text-[var(--material-ice)]",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
