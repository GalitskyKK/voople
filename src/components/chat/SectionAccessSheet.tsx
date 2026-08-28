"use client";

import { useCallback } from "react";

import { trpc } from "@/lib/trpc/client";

import { SectionAccessSheetView } from "./SectionAccessSheetView";

export function SectionAccessSheet({
  chatId,
  parentChatId,
}: {
  chatId: string;
  parentChatId: string;
}) {
  const utils = trpc.useUtils();
  const update = trpc.chat.setSectionAccess.useMutation();
  const loadAccess = useCallback(
    () => utils.client.chat.sectionAccess.query({ chatId }),
    [chatId, utils.client],
  );
  const loadMembers = useCallback(
    () => utils.client.chat.groupMembers.query({ chatId: parentChatId }),
    [parentChatId, utils.client],
  );

  return (
    <SectionAccessSheetView
      loadAccess={loadAccess}
      loadMembers={loadMembers}
      saveAccess={(accessMode, memberIds) =>
        update.mutateAsync({ chatId, accessMode, memberIds })
      }
      onChanged={() => {
        void utils.chat.list.invalidate();
        void utils.chat.observeMessages.invalidate({ chatId });
      }}
    />
  );
}
