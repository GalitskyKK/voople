"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/Button";

type ProfileMessageButtonProps = {
  username: string;
  size?: "sm" | "md";
};

export function ProfileMessageButton({ username, size = "md" }: ProfileMessageButtonProps) {
  const router = useRouter();

  const openChat = trpc.chat.openDirect.useMutation({
    onSuccess: ({ chatId }) => {
      router.push(`/messages/${chatId}`);
    },
  });

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={size === "sm" ? "shrink-0" : undefined}
      aria-label={COPY.message}
      disabled={openChat.isPending}
      onClick={() => openChat.mutate({ username })}
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  );
}
