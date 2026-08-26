"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { trpc } from "@/lib/trpc/client";
import type { PublicGroupPageView } from "@/types/chat";
import { PublicGroupPageView as PublicGroupView } from "./PublicGroupPageView";

export function PublicGroupPage({ group }: { group: PublicGroupPageView }) {
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const [requestPending, setRequestPending] = useState(group.joinRequestPending);
  const join = trpc.chat.joinPublicGroup.useMutation({
    onSuccess: ({ chatId, status }) => {
      if (status === "joined") router.push(`/messages/${chatId}`);
      else setRequestPending(true);
    },
  });

  const openGroup = () => {
    if (!requireAuth({
      title: group.joined ? "Открыть группу" : "Вступить в группу",
      description: "После входа вернём вас к этой группе.",
    })) return;
    if (group.joined) router.push(`/messages/${group.id}`);
    else if (group.joinPolicy !== "invite_only" && !requestPending) join.mutate({ chatId: group.id });
  };

  return (
    <PublicGroupView
      group={group}
      actionPending={join.isPending}
      requestPending={requestPending}
      error={join.error?.message}
      onAction={openGroup}
    />
  );
}
