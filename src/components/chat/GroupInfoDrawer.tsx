"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

import { GroupInfoDrawerView } from "./GroupInfoDrawerView";
import { GroupInviteCopyNotice, useGroupInviteQuickCopy } from "./useGroupInviteQuickCopy";
import { useGroupSurfaceNavigation } from "./GroupSurfaceNavigationContext";

export function GroupInfoDrawer({ chatId, chatName, memberCount, groupIcon, groupAvatarUrl, groupBannerUrl, groupAccentColor, groupTag, canManage }: {
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
  const [open, setOpen] = useState(false);
  const selectGroupTab = useGroupSurfaceNavigation();
  const community = trpc.chat.groupCommunity.useQuery({ chatId }, { enabled: open });
  const utils = trpc.useUtils();
  const setProfileTag = trpc.chat.setGroupProfileTag.useMutation({ onSuccess: async () => { await Promise.all([utils.chat.groupCommunity.invalidate({ chatId }), utils.profile.getByUsername.invalidate()]); } });
  const createInvite = trpc.chat.createInvite.useMutation();
  const invite = useGroupInviteQuickCopy({
    groupId: chatId,
    createInvite: () => createInvite.mutateAsync({ chatId, lifetime: "7d" }),
  });

  // Header needs member/voice state even when the drawer itself is closed.
  const members = trpc.chat.groupMembers.useQuery({ chatId }, { staleTime: 10_000, refetchInterval: 20_000, refetchOnWindowFocus: false });
  const now = trpc.chat.coreGroupNow.useQuery({ groupId: chatId }, { staleTime: 10_000, refetchInterval: 20_000, refetchOnWindowFocus: false });
  const navigate = (href: string) => { setOpen(false); router.push(href); };

  return <>
    <GroupInfoDrawerView
      open={open}
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
      now={now.data}
      infoLoading={community.isLoading}
      membersLoading={members.isLoading}
      error={community.error?.message ?? members.error?.message ?? now.error?.message}
      onOpenChange={setOpen}
      onManage={() => navigate(`/messages/${chatId}/settings`)}
      onInvite={() => { setOpen(false); void invite.copy(); }}
      onOpenPeople={() => { setOpen(false); selectGroupTab?.("people"); }}
      onOpenProfile={(username) => navigate(`/${username}`)}
      onToggleGroupTag={() => setProfileTag.mutate({ chatId: community.data?.tagEquippedByMe ? null : chatId })}
    />
    <GroupInviteCopyNotice notice={invite.notice} />
  </>;
}
