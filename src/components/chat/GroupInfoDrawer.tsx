"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";

import { GroupInfoDrawerView, type GroupInfoDrawerTab } from "./GroupInfoDrawerView";
import { VoiceRoomButton } from "./voice/VoiceRoomButton";

export function GroupInfoDrawer({
  chatId,
  chatName,
  memberCount,
  groupIcon,
  groupAvatarUrl,
  groupBannerUrl,
  groupAccentColor,
  groupTag,
  canManage,
}: {
  chatId: string;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const { onlineUserIds } = useOnlineUsers();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<GroupInfoDrawerTab>("info");
  const community = trpc.chat.groupCommunity.useQuery({ chatId }, { enabled: open });
  const utils = trpc.useUtils();
  const setProfileTag = trpc.chat.setGroupProfileTag.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.chat.groupCommunity.invalidate({ chatId }),
        utils.profile.getByUsername.invalidate(),
      ]);
    },
  });
  const members = trpc.chat.groupMembers.useQuery({ chatId }, { enabled: open });
  const room = trpc.chat.room.useQuery({ chatId }, { enabled: open });
  const chats = trpc.chat.list.useQuery(undefined, { enabled: open, staleTime: 5_000 });
  const discovery = trpc.social.groupDiscoveryProfile.useQuery({ chatId }, { enabled: open });
  const catalog = trpc.social.interestCatalog.useQuery(undefined, { enabled: open, staleTime: 60_000 });
  const rootChat = chats.data?.find((chat) => chat.id === chatId);
  const topicNames = (discovery.data?.topicSlugs ?? []).map((slug) =>
    catalog.data?.categories.flatMap((category) => category.interests).find((interest) => interest.slug === slug)?.name ?? slug,
  );

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <GroupInfoDrawerView
      open={open}
      tab={tab}
      chatName={chatName}
      memberCount={memberCount}
      groupIcon={groupIcon}
      groupAvatarUrl={groupAvatarUrl}
      groupBannerUrl={groupBannerUrl}
      groupAccentColor={groupAccentColor}
      groupTag={groupTag}
      groupTagEquipped={community.data?.tagEquippedByMe}
      groupTagPending={setProfileTag.isPending}
      canManage={canManage}
      description={community.data?.description}
      members={members.data}
      onlineUserIds={onlineUserIds}
      roomParticipantIds={new Set(room.data?.participants.map((participant) => participant.id) ?? [])}
      infoLoading={community.isLoading}
      membersLoading={members.isLoading}
      error={tab === "members" ? members.error?.message : community.error?.message}
      topics={topicNames}
      sections={rootChat?.channels.map((section) => ({ id: section.id, name: section.name || "Раздел" })) ?? []}
      roomAction={room.data?.participants.length ? <VoiceRoomButton chatId={chatId} chatName={chatName} chatType="group" /> : undefined}
      onOpenChange={setOpen}
      onTabChange={setTab}
      onManage={() => navigate(`/messages/${chatId}/settings`)}
      onInvite={() => navigate(`/messages/${chatId}/settings`)}
      onOpenSection={(sectionId) => navigate(`/messages/${sectionId}`)}
      onOpenProfile={(username) => navigate(`/${username}`)}
      onToggleGroupTag={() => setProfileTag.mutate({ chatId: community.data?.tagEquippedByMe ? null : chatId })}
    />
  );
}
