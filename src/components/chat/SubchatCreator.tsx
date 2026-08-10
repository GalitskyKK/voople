"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc/client";

import { SubchatCreatorView } from "./SubchatCreatorView";

export function SubchatCreator({
  parentChatId,
  viewerRole,
}: {
  parentChatId: string;
  viewerRole: "owner" | "admin" | "member";
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const createSubchat = trpc.chat.createSubchat.useMutation();

  return (
    <SubchatCreatorView
      canRestrict={viewerRole === "owner" || viewerRole === "admin"}
      loadMembers={() => utils.client.chat.groupMembers.query({ chatId: parentChatId })}
      createSubchat={async (name, icon, accessMode, memberIds) => {
        const chatId = await createSubchat.mutateAsync({
          parentChatId,
          name,
          icon,
          accessMode,
          memberIds,
        });
        await utils.chat.list.invalidate();
        return chatId;
      }}
      onCreated={(chatId) => router.push(`/messages/${chatId}`)}
    />
  );
}
