import { Check, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type MessageReadTicksProps = {
  readAt: string | null | undefined;
  className?: string;
};

export function MessageReadTicks({ readAt, className }: MessageReadTicksProps) {
  const read = Boolean(readAt);
  const Icon = read ? CheckCheck : Check;

  return (
    <Icon
      className={cn(
        "h-3.5 w-3.5 shrink-0",
        read ? "text-[var(--theme-accent)]" : "text-[var(--app-muted)]",
        className,
      )}
      strokeWidth={2.5}
      aria-hidden
    />
  );
}
