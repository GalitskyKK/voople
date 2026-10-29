"use client";
import { MiniProfileCardView } from "@/components/profile/MiniProfileCardView";
import { Skeleton } from "@/components/ui/Skeleton";
import { trpc } from "@/lib/trpc/client";
import { navigateInternally } from "@/lib/platform/internal-navigation";
import type { ChatListItem } from "@/types/chat";

export function DirectConversationInfo({ peer, online }: { peer: NonNullable<ChatListItem["otherUser"]>; online: boolean }) {
  const profile = trpc.profile.getBetaByUsername.useQuery({ username: peer.username }, { staleTime: 30_000 });
  return <div className="voople-direct-info">
    {profile.isLoading ? <div role="status" aria-label="Загружаем информацию о собеседнике"><Skeleton className="h-24 w-full" /><Skeleton shape="avatar" className="mx-4 mt-3 h-16 w-16" /><Skeleton className="mx-4 mt-4 h-4 w-32" /></div>
      : profile.error || !profile.data ? <div role="alert" className="p-4 text-sm"><p>Не удалось загрузить информацию.</p><button type="button" className="mt-3 underline" onClick={() => void profile.refetch()}>Повторить</button></div>
      : <MiniProfileCardView profile={profile.data} online={online} actions={<a className="voople-direct-info__profile-link" href={`/${peer.username}`} onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && navigateInternally(`/${peer.username}`)) event.preventDefault(); }}>Открыть профиль</a>} />}
  </div>;
}
