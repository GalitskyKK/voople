"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, UsersRound } from "lucide-react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { trpc } from "@/lib/trpc/client";
import type { PublicGroupPageView } from "@/types/chat";
import { GroupAvatar } from "./GroupAvatar";

export function PublicGroupPage({ group }: { group: PublicGroupPageView }) {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const join = trpc.chat.joinPublicGroup.useMutation({
    onSuccess: ({ chatId }) => router.push(`/messages/${chatId}`),
  });

  const openGroup = () => {
    if (!requireAuth({
      title: group.joined ? "Открыть группу" : "Вступить в группу",
      description: "После входа вернём вас к этой группе.",
    })) return;
    if (group.joined) router.push(`/messages/${group.id}`);
    else join.mutate({ chatId: group.id });
  };

  return (
    <article
      className="voople-panel mt-4 overflow-hidden"
      style={{ "--group-accent": group.accentColor ?? "var(--theme-accent)" } as React.CSSProperties}
    >
      <div
        className="h-28 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--group-accent)_34%,var(--app-surface)),var(--app-surface-soft))] bg-cover bg-center"
        style={group.bannerUrl ? { backgroundImage: `linear-gradient(90deg, color-mix(in srgb, var(--app-surface) 18%, transparent), transparent), url("${group.bannerUrl}")` } : undefined}
      />
      <div className="p-5 sm:p-6">
        <div className="-mt-14 flex items-end justify-between gap-4">
          <GroupAvatar
            name={group.name}
            avatarUrl={group.avatarUrl}
            icon={group.icon}
            accentColor={group.accentColor}
            size="lg"
            className="border-4 border-[var(--app-surface)]"
          />
          <Button type="button" onClick={openGroup} disabled={join.isPending}>
            {join.isPending ? "Вступаем…" : group.joined ? "Открыть" : "Вступить"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
            {group.name}
          </h1>
          {group.tag ? <span className="rounded-md border border-[color-mix(in_srgb,var(--group-accent)_55%,var(--app-border))] bg-[color-mix(in_srgb,var(--group-accent)_14%,var(--app-surface))] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--group-accent)]">{group.tag}</span> : null}
        </div>
        <p className="mt-1 text-sm text-[var(--app-muted)]">@{group.publicSlug}</p>
        {group.description ? (
          <p className="mt-4 max-w-prose text-sm leading-6 text-[color-mix(in_srgb,var(--foreground)_78%,transparent)]">
            <RichText text={group.description} />
          </p>
        ) : null}
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--app-muted)]">
          <UsersRound className="h-4 w-4 text-[var(--group-accent)]" />
          {group.memberCount.toLocaleString("ru-RU")} участников
        </p>
        {join.error ? <p className="mt-3 text-sm text-red-400">{join.error.message}</p> : null}
      </div>
    </article>
  );
}
