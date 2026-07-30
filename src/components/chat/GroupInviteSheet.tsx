"use client";

import { trpc } from "@/lib/trpc/client";

import { GroupInviteSheetView } from "./GroupInviteSheetView";

export function GroupInviteSheet({ chatId }: { chatId: string }) {
  const createInvite = trpc.chat.createInvite.useMutation();
  const revokeInvite = trpc.chat.revokeInvite.useMutation();

  return (
    <GroupInviteSheetView
      createInvite={() => createInvite.mutateAsync({ chatId })}
      revokeInvite={(token) => revokeInvite.mutateAsync({ chatId, token })}
    />
  );
}
