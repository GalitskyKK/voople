"use client";

import { Headphones, LoaderCircle, Radio } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import { useGroupNowVoiceLauncher } from "@/hooks/useGroupNowVoiceLauncher";
import { roomJoinErrorMessage } from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { GroupNowRoomSwitchDialog } from "./GroupNowRoomSwitchDialog";
import { VoiceRoomButton } from "./voice/VoiceRoomButton";

export function GroupLobbyAction({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const availability = trpc.chat.coreRoomAvailability.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const enabled = availability.data?.enabled === true;
  const now = trpc.chat.coreGroupNow.useQuery(
    { groupId },
    {
      enabled,
      retry: false,
      staleTime: 10_000,
      refetchInterval: enabled ? 15_000 : false,
    },
  );
  const launcher = useGroupNowVoiceLauncher({ groupId });
  const join = useGroupNowRoomJoin({
    onJoined: launcher.openJoinedRoom,
    onOpenLegacy: (target) => launcher.openLegacyRoom(target.room),
  });

  if (!enabled) {
    return (
      <VoiceRoomButton
        chatId={groupId}
        chatName={groupName}
        chatType="group"
        display="label"
      />
    );
  }

  const lobby = now.data?.rooms.find((room) => room.kind === "lobby") ?? null;
  const serverRoom =
    now.data?.rooms.find((room) => room.id === now.data.currentUserRoomId) ?? null;
  const isLocalGroupSession =
    launcher.voice.activeSession?.coreSession?.groupId === groupId;
  const localRoom = isLocalGroupSession
    ? launcher.voice.activeSession?.coreSession?.room
    : null;
  const currentRoom = localRoom ?? serverRoom;
  const localSessionActive =
    launcher.voice.state.inside ||
    launcher.voice.state.mediaStatus === "connecting" ||
    launcher.voice.state.mediaStatus === "reconnecting";
  const opensCurrentRoom = Boolean(isLocalGroupSession && localSessionActive);
  const targetRoom = currentRoom ?? lobby;
  const loading = now.isLoading || (!now.data && now.isFetching);
  const pending = join.pending;
  const failed = Boolean(actionError || now.error);

  const label = pending
    ? "Входим…"
    : currentRoom
      ? currentRoom.name
      : failed
        ? "Повторить"
        : "Войти";

  const accessibleLabel = opensCurrentRoom
    ? `Открыть комнату ${currentRoom?.name ?? groupName}`
    : currentRoom
      ? `Вернуться в комнату ${currentRoom.name}`
      : failed
        ? `Повторить открытие Лобби группы ${groupName}`
        : `Войти в Лобби группы ${groupName}`;

  const activate = async () => {
    setActionError(null);

    if (opensCurrentRoom) {
      launcher.voice.openPanel();
      return;
    }

    if (now.error || !now.data) {
      await now.refetch();
      return;
    }

    if (!targetRoom) return;

    try {
      await join.requestJoin({ groupId, room: targetRoom });
    } catch (error) {
      setActionError(roomJoinErrorMessage(error));
    }
  };

  return (
    <>
      <IconButton
        label={accessibleLabel}
        tooltipSide="bottom"
        onClick={() => void activate()}
        disabled={pending || loading || (!targetRoom && !failed && !opensCurrentRoom)}
        className={cn(
          "voople-group-header-voice inline-flex h-9 max-w-40 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition max-sm:w-9 max-sm:px-0",
          currentRoom && "voople-group-header-voice--active",
          failed && "voople-group-header-voice--error",
        )}
      >
        {pending || loading ? (
          <LoaderCircle
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : currentRoom ? (
          <Radio className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Headphones className="h-4 w-4" aria-hidden="true" />
        )}

        <span className="truncate max-sm:hidden">{label}</span>
      </IconButton>

      {actionError ? (
        <span className="sr-only" role="alert">
          {actionError}
        </span>
      ) : null}

      <GroupNowRoomSwitchDialog
        room={join.confirmationTarget?.room ?? null}
        pending={join.pending}
        error={join.confirmationError}
        onCancel={join.cancelSwitch}
        onConfirm={() => void join.confirmSwitch()}
      />
    </>
  );
}
