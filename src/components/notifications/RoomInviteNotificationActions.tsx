"use client";

import { LoaderCircle, Radio, X } from "lucide-react";
import { useState } from "react";

import { GroupNowRoomSwitchDialog } from "@/components/chat/GroupNowRoomSwitchDialog";
import { useVoiceSession } from "@/components/chat/voice/VoiceSessionProvider";
import { Button } from "@/components/ui/Button";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import { isCrossContextRoomJoinError } from "@/lib/chat/group-room-join";
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
  const [confirmVoop, setConfirmVoop] = useState(false);
  const invalidate = async () => {
    await Promise.all([
      utils.notifications.list.invalidate(),
      utils.notifications.unreadCount.invalidate(),
      ...(invite
        ? [utils.chat.coreRoomInvitePreview.invalidate({ inviteId: invite.id })]
        : []),
    ]);
  };
  const respond = trpc.chat.coreRespondRoomInvite.useMutation({
    onSuccess: invalidate,
  });
  const acceptVoop = trpc.chat.coreAcceptVoop.useMutation({ onSuccess: invalidate });
  const respondMove = trpc.chat.coreRespondLiveMove.useMutation({ onSuccess: invalidate });
  const join = useGroupNowRoomJoin({
    onJoined: ({ groupId, room }, result, credentials) => {
      voice.openCoreRoom({ groupId, room, join: result, credentials });
      if (invite) respond.mutate({ inviteId: invite.id, response: "accepted" });
    },
  });
  const status = invite?.status === "pending" && !invite.requestId
    ? acceptVoop.data ? "accepted" : respond.data?.status ?? invite.status
    : invite?.status ?? "expired";
  const available = status === "pending" && Boolean(invite?.groupId && invite.room);

  const accept = async (confirmedCrossContext = false) => {
    if (!invite?.groupId || !invite.room || join.pending) return;
    setError(null);
    try {
      if (invite.requestId) {
        await respondMove.mutateAsync({ consentId: invite.id, accept: true });
        return;
      }
      if (invite.intent === "voop") {
        const accepted = await acceptVoop.mutateAsync({
          inviteId: invite.id,
          confirmedCrossContext,
        });
        if (!accepted.credentials.enabled) {
          throw new Error("Медиасервер для комнаты временно недоступен");
        }
        setConfirmVoop(false);
        voice.openCoreRoom({
          groupId: accepted.groupId,
          room: accepted.room,
          join: accepted.join,
          credentials: accepted.credentials,
        });
        return;
      }
      await join.requestJoin({ groupId: invite.groupId, room: invite.room });
    } catch (cause) {
      if (invite.intent === "voop" && isCrossContextRoomJoinError(cause)) {
        setConfirmVoop(true);
        return;
      }
      setError(cause instanceof Error ? cause.message : "Не удалось войти в комнату");
    }
  };
  const decline = async () => {
    if (!invite || respond.isPending) return;
    setError(null);
    try {
      if (invite.requestId) {
        await respondMove.mutateAsync({ consentId: invite.id, accept: false });
        return;
      }
      await respond.mutateAsync({ inviteId: invite.id, response: "declined" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отклонить приглашение");
    }
  };

  return (
    <div className="mt-3">
      {invite?.requestId && invite.status === "accepted" && invite.requestStatus === "pending" ? (
        <p className="text-xs text-[var(--app-muted)]" role="status">Согласие отправлено · ждём остальных ({invite.acceptedCount}/{invite.selectedCount})</p>
      ) : available && invite ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" aria-label={join.pending || acceptVoop.isPending || respondMove.isPending ? "Подключаем" : invite.intent === "voop" ? "Принять Вуп" : invite.intent === "split" ? "Принять Сплит" : `Зайти в ${invite.room?.name}`} className="border border-[var(--theme-accent)] bg-[var(--app-accent-soft)] shadow-none [&>svg]:shrink-0" disabled={join.pending || acceptVoop.isPending || respond.isPending || respondMove.isPending} onClick={() => void accept()}>
            {join.pending || acceptVoop.isPending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Radio className="h-4 w-4" />}
            {join.pending || acceptVoop.isPending || respondMove.isPending ? "Подключаем" : invite.intent === "voop" ? "Отойти" : invite.intent === "split" ? "Согласиться" : "Войти в комнату"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={join.pending || acceptVoop.isPending || respond.isPending || respondMove.isPending} onClick={() => void decline()}>
            <X className="h-4 w-4" />
            Отклонить
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[var(--app-muted)]">
          {status === "pending" ? "Комната больше недоступна" : STATUS_LABELS[status]}
        </p>
      )}
      {error || respond.error || acceptVoop.error || respondMove.error ? (
        <p className="mt-2 text-xs text-red-400" role="alert">{error ?? respond.error?.message ?? acceptVoop.error?.message ?? respondMove.error?.message}</p>
      ) : null}
      <GroupNowRoomSwitchDialog
        room={confirmVoop && invite?.room ? { ...invite.room, name: "Сплит" } : join.confirmationTarget?.room ?? null}
        pending={join.pending || acceptVoop.isPending}
        error={join.confirmationError}
        onCancel={confirmVoop ? () => setConfirmVoop(false) : join.cancelSwitch}
        onConfirm={confirmVoop ? () => void accept(true) : () => void join.confirmSwitch()}
      />
    </div>
  );
}
