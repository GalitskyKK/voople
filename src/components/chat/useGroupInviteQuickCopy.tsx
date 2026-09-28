"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CachedInvite = { token: string; expiresAt: number };

export function useGroupInviteQuickCopy({ groupId, baseUrl, createInvite }: {
  groupId: string;
  baseUrl?: string;
  createInvite: () => Promise<{ token: string; expiresAt: string | null }>;
}) {
  const cache = useRef<{ groupId: string; invite: CachedInvite } | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const copy = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setNotice(null);
    try {
      let invite = cache.current?.groupId === groupId ? cache.current.invite : null;
      if (!invite || invite.expiresAt <= Date.now()) {
        const created = await createInvite();
        invite = { token: created.token, expiresAt: created.expiresAt ? Date.parse(created.expiresAt) : Date.now() + 7 * 86_400_000 };
        cache.current = { groupId, invite };
      }
      const origin = new URL(baseUrl ?? window.location.origin).origin;
      await navigator.clipboard.writeText(`${origin}/invite/${invite.token}`);
      setNotice({ message: "Ссылка скопирована · действует 7 дней", error: false });
    } catch (cause) {
      setNotice({ message: cause instanceof Error ? cause.message : "Не удалось скопировать ссылку", error: true });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, [baseUrl, createInvite, groupId]);

  return { copy, pending, notice };
}

export function GroupInviteCopyNotice({ notice }: { notice: { message: string; error: boolean } | null }) {
  if (!notice) return null;
  return (
    <p role={notice.error ? "alert" : "status"} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[120] max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] shadow-[var(--app-shadow-md)]">
      {notice.message}
    </p>
  );
}
