"use client";

import { trpc } from "@/lib/trpc/client";

export function useVoiceRoomServerSession(chatId: string, open: boolean) {
  const utils = trpc.useUtils();
  const room = trpc.chat.room.useQuery(
    { chatId },
    { staleTime: 5_000, refetchInterval: open ? 5_000 : 15_000 },
  );
  const enter = trpc.chat.enterRoom.useMutation();
  const mediaToken = trpc.chat.roomMediaToken.useMutation();
  const leave = trpc.chat.leaveRoom.useMutation({
    onSuccess: () => void utils.chat.room.invalidate({ chatId }),
  });
  const access = trpc.chat.setRoomAccess.useMutation({
    onSuccess: () => void utils.chat.room.invalidate({ chatId }),
  });

  return { access, enter, leave, mediaToken, room, utils };
}
