"use client";

import { useEffect, useRef } from "react";

import { trpc } from "@/lib/trpc/client";

/**
 * Невидимый ретеншн-хук: один раз за загрузку приложения отмечает активность
 * залогиненного пользователя (engagement.pingStreak). Идемпотентно в пределах
 * суток на сервере. Если этим заходом заработан бейдж-веха — инвалидирует
 * публичный список бейджей, чтобы он появился в шапке профиля без перезагрузки.
 */
export function StreakPing() {
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const utils = trpc.useUtils();
  const pinged = useRef(false);

  const ping = trpc.engagement.pingStreak.useMutation({
    onSuccess: (streak) => {
      if (streak.earnedBadgeId && me?.id) {
        void utils.engagement.badges.invalidate({ userId: me.id });
      }
    },
  });

  useEffect(() => {
    if (!me?.id || pinged.current) return;
    pinged.current = true;
    ping.mutate();
  }, [me?.id, ping]);

  return null;
}
