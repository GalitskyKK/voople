"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/format/relative-time";

type RelativeTimeProps = {
  iso: string;
  className?: string;
};

/** Форматирует время только на клиенте — без hydration mismatch */
export function RelativeTime({ iso, className }: RelativeTimeProps) {
  const [, setTick] = useState(0);
  const label = formatRelativeTime(iso);

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
