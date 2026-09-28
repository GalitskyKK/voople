"use client";

import { trpc } from "@/lib/trpc/client";

export function useVoiceRoomServerSession(
  chatId: string,
  open: boolean,
  enabled = true,
) {
  const utils = trpc.useUtils();
  const room = trpc.chat.room.useQuery(
    { chatId },
    {
      enabled,
      staleTime: 5_000,
      refetchInterval: enabled ? open ? 5_000 : 15_000 : false,
    },
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
