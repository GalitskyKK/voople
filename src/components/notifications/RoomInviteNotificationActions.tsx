"use client";

import { LoaderCircle, Radio, X } from "lucide-react";
import { useState } from "react";

import { GroupNowRoomSwitchDialog } from "@/components/chat/GroupNowRoomSwitchDialog";
import { useVoiceSession } from "@/components/chat/voice/VoiceSessionProvider";
import { Button } from "@/components/ui/Button";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import { trpc } from "@/lib/trpc/client";
import type { CoreRoomInvitePreview } from "@/types/room-invitations";

const STATUS_LABELS = {
  accepted: "Вы уже вошли по этому приглашению",
  declined: "Приглашение отклонено",
  expired: "Приглашение истекло",
  cancelled: "Приглашение отменено",
} as const;

export function RoomInviteNotificationActions({ invite }: { invite: CoreRoomInvitePreview | null }) {
  return <InviteActions key={invite ? `${invite.id}:${invite.expiresAt}` : "unavailable"} invite={invite} />;
}

function InviteActions({ invite }: { invite: CoreRoomInvitePreview | null }) {
  const voice = useVoiceSession();
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);
  const respond = trpc.chat.coreRespondRoomInvite.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.unreadCount.invalidate(),
      ]);
    },
  });
  const join = useGroupNowRoomJoin({
    onJoined: ({ groupId, room }, result, credentials) => {
      voice.openCoreRoom({ groupId, room, join: result, credentials });
      if (invite) respond.mutate({ inviteId: invite.id, response: "accepted" });
    },
  });
  const status = invite?.status === "pending"
    ? respond.data?.status ?? invite.status
    : invite?.status ?? "expired";
  const available = status === "pending" && Boolean(invite?.groupId && invite.room);

  const accept = async () => {
    if (!invite?.groupId || !invite.room || join.pending) return;
    setError(null);
    try {
      await join.requestJoin({ groupId: invite.groupId, room: invite.room });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось войти в комнату");
    }
  };
  const decline = async () => {
    if (!invite || respond.isPending) return;
    setError(null);
    try {
      await respond.mutateAsync({ inviteId: invite.id, response: "declined" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отклонить приглашение");
    }
  };

  return (
    <div className="mt-3">
      {available ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={join.pending || respond.isPending} onClick={() => void accept()}>
            {join.pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Radio className="h-4 w-4" />}
            {join.pending ? "Подключаем" : `Зайти в ${invite?.room?.name}`}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={join.pending || respond.isPending} onClick={() => void decline()}>
            <X className="h-4 w-4" />
            Отклонить
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[var(--app-muted)]">
          {status === "pending" ? "Комната больше недоступна" : STATUS_LABELS[status]}
        </p>
      )}
      {error || respond.error ? (
        <p className="mt-2 text-xs text-red-400" role="alert">{error ?? respond.error?.message}</p>
      ) : null}
      <GroupNowRoomSwitchDialog
        room={join.confirmationTarget?.room ?? null}
        pending={join.pending}
        error={join.confirmationError}
        onCancel={join.cancelSwitch}
        onConfirm={() => void join.confirmSwitch()}
      />
    </div>
  );
}
