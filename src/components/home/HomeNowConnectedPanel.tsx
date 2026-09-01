"use client";

import { useState } from "react";

import { GroupNowRoomSwitchDialog } from "@/components/chat/GroupNowRoomSwitchDialog";
import { useVoiceSession } from "@/components/chat/voice/VoiceSessionProvider";
import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import { reportProductEvent } from "@/lib/telemetry/client";
import type { HomeOverviewView, HomeRoomTarget } from "@/types/home";

import { HomeNowPanelView } from "./HomeOverviewPanelsView";

export function HomeNowConnectedPanel({
  overview,
  renderDestination,
  onMessageUser,
  messagingUsername,
  messageError,
  refreshing,
  refreshPaused,
  refreshError,
  onRetryRefresh,
}: {
  overview: HomeOverviewView;
  renderDestination: NavigationDestinationRenderer;
  onMessageUser?: (username: string) => void;
  messagingUsername?: string | null;
  messageError?: string | null;
  refreshing?: boolean;
  refreshPaused?: boolean;
  refreshError?: string | null;
  onRetryRefresh?: () => void;
}) {
  const voice = useVoiceSession();
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const join = useGroupNowRoomJoin({
    onOpenLegacy: async ({ room }) => {
      if (room.joinTarget.kind !== "legacy") return;
      const started = voice.joinRoom({
        chatId: room.joinTarget.chatId,
        chatName: room.name,
        chatType: "group",
      });
      if (!started) throw new Error("Сначала завершите текущий разговор");
    },
    onJoined: async ({ groupId, room }, result, credentials) => {
      voice.openCoreRoom({ groupId, room, join: result, credentials });
      reportProductEvent("presence_room_joined", { source: "home_now", transport: "core" });
    },
  });

  const joinRoom = async (target: HomeRoomTarget) => {
    if (join.pending) return;
    setRoomError(null);
    setJoiningRoomId(target.room.id);
    try {
      if (target.context === "direct") {
        if (target.room.joinTarget.kind !== "legacy") {
          throw new Error("Личный разговор использует неподдерживаемый тип комнаты");
        }
        const started = voice.joinRoom({
          chatId: target.chatId,
          chatName: target.room.name,
          chatType: "direct",
        });
        if (!started) throw new Error("Сначала завершите текущий разговор");
      } else {
        await join.requestJoin({ groupId: target.groupId, room: target.room });
      }
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "Не удалось войти в комнату");
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <>
      <HomeNowPanelView
        overview={overview}
        renderDestination={renderDestination}
        onMessageUser={onMessageUser}
        messagingUsername={messagingUsername}
        messageError={messageError}
        onJoinRoom={(target) => void joinRoom(target)}
        joiningRoomId={joiningRoomId}
        roomError={roomError}
        refreshing={refreshing}
        refreshPaused={refreshPaused}
        refreshError={refreshError}
        onRetryRefresh={onRetryRefresh}
      />
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
