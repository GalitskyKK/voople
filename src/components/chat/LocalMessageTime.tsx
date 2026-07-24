"use client";

import { useSyncExternalStore } from "react";

import { formatMessageTime } from "@/lib/format/message-time";

export function LocalMessageTime({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    () => () => undefined,
    () => formatMessageTime(iso),
    () => "",
  );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  );
}
