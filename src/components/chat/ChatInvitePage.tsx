"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, UsersRound } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";
import { reportProductEvent } from "@/lib/telemetry/client";
import { GroupAvatar } from "./GroupAvatar";

export function ChatInvitePage({ token }: { token: string }) {
  const router = useRouter();
  const openedReported = useRef(false);
  const preview = trpc.chat.invitePreview.useQuery({ token }, { retry: false });
  const accept = trpc.chat.acceptInvite.useMutation({
    onSuccess: ({ chatId }) => {
      reportProductEvent("invite_joined", { source: "group_invite" });
      router.replace(`/messages/${chatId}`);
      router.refresh();
    },
  });

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
    <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-10">
      <section
        className="voople-panel relative w-full max-w-md overflow-hidden p-6 text-center"
        style={preview.data?.groupAccentColor ? {
          "--group-accent": preview.data.groupAccentColor,
          background: `linear-gradient(145deg, color-mix(in srgb, ${preview.data.groupAccentColor} 18%, var(--app-surface)), var(--app-surface) 55%)`,
        } as React.CSSProperties : undefined}
      >
        {preview.data?.groupBannerUrl ? (
          <div
            className="absolute inset-x-0 top-0 h-28 bg-cover bg-center opacity-65 [mask-image:linear-gradient(to_bottom,black,transparent)]"
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
              className="mx-auto border-4 border-[var(--app-surface)]"
            />
          ) : (
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-(--theme-accent)">
              <MessageCircle className="h-7 w-7" />
            </span>
          )}

        {preview.isLoading ? (
          <div className="mx-auto mt-5 h-20 w-full animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />
        ) : preview.data?.available ? (
          <>
            <p className="mt-5 text-sm text-[var(--app-muted)]">Вас приглашают в беседу</p>
            <h1 className="mt-1 flex items-center justify-center gap-2 text-2xl font-semibold">
              {preview.data.chatName}
              {preview.data.groupTag ? (
                <span className="rounded-md border border-[var(--group-accent,var(--app-border))] px-1.5 py-0.5 text-[10px] text-[var(--group-accent,var(--theme-accent))]">
                  {preview.data.groupTag}
                </span>
              ) : null}
            </h1>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              Уже {preview.data.memberCount} участников. Голосовая комната подключается отдельно —
              вступление в чат не включает микрофон.
            </p>
            {preview.data.onlineCount > 0 || preview.data.roomParticipantCount > 0 ? (
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                {preview.data.onlineCount > 0 ? <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">● {preview.data.onlineCount} онлайн</span> : null}
                {preview.data.roomParticipantCount > 0 ? <span className="rounded-full border border-[color-mix(in_srgb,var(--theme-accent)_40%,transparent)] bg-[var(--app-accent-soft)] px-2.5 py-1 text-[var(--theme-accent)]">🎙 {preview.data.roomParticipantCount} разговаривают</span> : null}
              </div>
            ) : null}
            <Button
              type="button"
              className="mt-6 w-full"
              disabled={accept.isPending}
              onClick={() => accept.mutate({ token })}
            >
              {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />}
              Вступить в беседу
            </Button>
            {accept.error ? (
              <>
                <p className="mt-3 text-sm text-red-400">
                  {accept.error.data?.code === "UNAUTHORIZED"
                    ? "Войдите или создайте профиль, чтобы принять приглашение."
                    : accept.error.message}
                </p>
                {accept.error.data?.code === "UNAUTHORIZED" ? (
                  <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                    <Link
                      href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
                      className="voople-link"
                    >
                      Войти
                    </Link>
                    <Link
                      href={`/register?redirect=${encodeURIComponent(`/invite/${token}`)}`}
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
            <Link href="/feed" className="voople-link mt-5 inline-block text-sm">
              Перейти в ленту
            </Link>
          </>
        )}
        </div>
      </section>
    </main>
  );
}
