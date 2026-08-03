"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc/client";

import { SubchatCreatorView } from "./SubchatCreatorView";

export function SubchatCreator({ parentChatId }: { parentChatId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const createSubchat = trpc.chat.createSubchat.useMutation();

  return (
    <SubchatCreatorView
      createSubchat={async (name, icon) => {
        const chatId = await createSubchat.mutateAsync({ parentChatId, name, icon });
        await utils.chat.list.invalidate();
        return chatId;
      }}
      onCreated={(chatId) => router.push(`/messages/${chatId}`)}
    />
  );
}
