"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Radio, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";
import { reportProductEvent } from "@/lib/telemetry/client";
import { authEntryHref } from "@/lib/auth/continuation";
import { createClient } from "@/lib/supabase/client";
import { GroupAvatar } from "./GroupAvatar";

export function ChatInvitePage({ token }: { token: string }) {
  const router = useRouter();
  const openedReported = useRef(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const preview = trpc.chat.invitePreview.useQuery({ token }, { retry: false });
  const accept = trpc.chat.acceptInvite.useMutation({
    onSuccess: ({ chatId }) => {
      reportProductEvent("invite_joined", { source: "group_invite" });
      router.replace(`/messages/${chatId}`);
      router.refresh();
    },
  });

  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(({ data }) => {
      if (active) setAuthenticated(Boolean(data.user));
    }).catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!preview.data || openedReported.current) return;
    openedReported.current = true;
    reportProductEvent("invite_opened", {
      result: preview.data.available ? "available" : preview.data.reason,
    });
  }, [preview.data]);

  const unavailableText =
    preview.data?.reason === "expired"
      ? "Срок действия ссылки истёк."
      : preview.data?.reason === "revoked"
        ? "Создатель отозвал эту ссылку."
        : preview.data?.reason === "used"
          ? "Лимит вступлений по ссылке исчерпан."
          : "Ссылка не найдена или больше не действует.";

  return (
    <main id="main-content" className="voople-invite-stage grid min-h-dvh place-items-center px-4 py-10">
      <section
        className="voople-glass-object relative w-full max-w-md overflow-hidden rounded-2xl p-6 text-center sm:p-7"
      >
        {preview.data?.groupBannerUrl ? (
          <div
            className="absolute inset-x-0 top-0 h-28 bg-cover bg-center opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]"
            style={{ backgroundImage: `url("${preview.data.groupBannerUrl}")` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="relative">
          {preview.data?.available ? (
            <GroupAvatar
              name={preview.data.chatName ?? "Группа"}
              avatarUrl={preview.data.groupAvatarUrl}
              icon={preview.data.groupIcon}
              accentColor={preview.data.groupAccentColor}
              size="lg"
              className="mx-auto border-4 border-[var(--material-panel-fill)]"
            />
          ) : (
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-(--theme-accent)">
              <UsersRound className="h-7 w-7" />
            </span>
          )}

        {preview.isLoading ? (
          <div className="mx-auto mt-5 h-20 w-full animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />
        ) : preview.error ? (
          <><h1 className="mt-5 text-xl font-semibold">Не удалось проверить приглашение</h1><p className="mt-2 text-sm text-[var(--app-muted)]">Попробуйте загрузить его ещё раз.</p><Button type="button" variant="secondary" className="mt-5" onClick={() => void preview.refetch()}>Повторить</Button></>
        ) : preview.data?.available ? (
          <>
            <p className="mt-5 text-sm text-[var(--app-muted)]">Вас приглашают в группу</p>
            <h1 className="mt-1 flex items-center justify-center gap-2 text-2xl font-semibold">
              {preview.data.chatName}
              {preview.data.groupTag ? (
                <span className="rounded-md border border-[var(--group-accent,var(--app-border))] px-1.5 py-0.5 text-[10px] text-[var(--group-accent,var(--theme-accent))]">
                  {preview.data.groupTag}
                </span>
              ) : null}
            </h1>
            <p className="mt-2 text-sm text-[var(--app-muted)]">{preview.data.memberCount} участников · {preview.data.onlineCount} онлайн · {preview.data.roomParticipantCount} в голосе</p>
            {authenticated === false ? (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Link href={authEntryHref("/login", `/invite/${token}`)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--material-border-hover)] bg-[var(--material-control-fill)] px-4 text-sm font-semibold text-[var(--foreground)]">Войти</Link>
                <Link href={authEntryHref("/register", `/invite/${token}`)} className="voople-material-control inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium">Создать профиль</Link>
              </div>
            ) : authenticated === null ? <p className="mt-6 text-xs text-[var(--app-muted)]" role="status">Проверяем вход…</p> : <Button
              type="button"
              className="mt-6 w-full"
              disabled={accept.isPending}
              onClick={() => accept.mutate({ token })}
            >
              {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />}
              Вступить в группу
            </Button>}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--app-muted)]"><Radio className="h-3.5 w-3.5" aria-hidden="true" />Микрофон не включится автоматически.</p>
            {accept.error ? (
              <>
                <p className="mt-3 text-sm text-red-400">
                  {accept.error.data?.code === "UNAUTHORIZED" ? "Войдите, чтобы принять приглашение." : accept.error.message}
                </p>
                {accept.error.data?.code === "UNAUTHORIZED" ? (
                  <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                    <Link
                      href={authEntryHref("/login", `/invite/${token}`)}
                      className="voople-link"
                    >
                      Войти
                    </Link>
                    <Link
                      href={authEntryHref("/register", `/invite/${token}`)}
                      className="voople-link"
                    >
                      Создать профиль
                    </Link>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <>
            <h1 className="mt-5 text-xl font-semibold">Приглашение недоступно</h1>
            <p className="mt-2 text-sm text-[var(--app-muted)]">{unavailableText}</p>
            <Link href={authenticated ? "/messages" : authEntryHref("/login", "/messages")} className="voople-link mt-5 inline-block text-sm">
              {authenticated ? "К группам" : "Войти"}
            </Link>
          </>
        )}
        </div>
      </section>
    </main>
  );
}
