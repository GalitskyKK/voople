"use client";

import { MessageCircle } from "lucide-react";

import { useAuthGate } from "@/components/auth/AuthGateContext";
import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";

export function ProfileMessageAction({
  username,
  onNavigate,
  size = "md",
}: {
  username: string;
  onNavigate: (href: string) => void;
  size?: "sm" | "md";
}) {
  const { requireAuth } = useAuthGate();
  const openChat = trpc.chat.openDirect.useMutation({
    onSuccess: ({ chatId }) => onNavigate(`/messages/${chatId}`),
  });

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={size === "sm" ? "shrink-0" : undefined}
      aria-label={COPY.message}
      disabled={openChat.isPending}
      onClick={() => {
        if (!requireAuth({ title: "Написать сообщение" })) return;
        openChat.mutate({ username });
      }}
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}
