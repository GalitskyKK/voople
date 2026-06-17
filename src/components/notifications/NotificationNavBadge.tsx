"use client"

import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

type NotificationNavBadgeProps = {
  className?: string
}

export function NotificationNavBadge({ className }: NotificationNavBadgeProps) {
  const { data } = trpc.notifications.unreadCount.useQuery(undefined, {
    staleTime: 15_000
  })

  useRealtimeNotifications(true)

  const count = data?.count ?? 0
  if (count <= 0) return null

  const label = count > 99 ? "99+" : String(count)

  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--theme-accent)] px-1 text-[10px] font-semibold leading-none text-[var(--foreground)]",
        className
      )}
      aria-hidden>
      {label}
    </span>
  )
}
