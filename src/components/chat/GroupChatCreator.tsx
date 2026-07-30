"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";

import { GroupChatCreatorView } from "./GroupChatCreatorView";

export function GroupChatCreator({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const me = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const create = trpc.chat.createGroup.useMutation();
  const searchUsers = useCallback(
    (query: string) => utils.client.user.search.query({ q: query }),
    [utils.client],
  );

  return (
    <GroupChatCreatorView
      compact={compact}
      currentUserId={me.data?.id ?? ""}
      searchUsers={searchUsers}
      createGroup={(input) => create.mutateAsync(input)}
      onCreated={(chatId) => {
        void utils.chat.list.invalidate();
        router.push(`/messages/${chatId}`);
      }}
      renderAvatar={(user) => (
        <ProfileAvatar
          displayName={user.displayName}
          size="sm"
          animatedAvatarUrl={user.avatarUrl}
        />
      )}
    />
  );
}
