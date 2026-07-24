"use client";

import { useEffect, useRef, useState } from "react";
import {
  DoorOpen,
  Headphones,
  Loader2,
  Lock,
  LockOpen,
  Mic,
  MicOff,
  PhoneOff,
  UsersRound,
  Volume2,
} from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
} from "livekit-client";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type MediaStatus = "idle" | "connecting" | "connected" | "unavailable" | "error";

export function ChatRoomControl({
  chatId,
  chatName,
  chatType,
}: {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
}) {
  const [open, setOpen] = useState(false);
  const [micMuted, setMicMuted] = useState(true);
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const liveRoomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const utils = trpc.useUtils();
  const room = trpc.chat.room.useQuery(
    { chatId },
    { staleTime: 5_000, refetchInterval: open ? 5_000 : 15_000 },
  );

  const enter = trpc.chat.enterRoom.useMutation();
  const mediaToken = trpc.chat.roomMediaToken.useMutation();
  const leave = trpc.chat.leaveRoom.useMutation({
    onSuccess: () => {
      void utils.chat.room.invalidate({ chatId });
    },
  });
  const heartbeat = trpc.chat.heartbeatRoom.useMutation({
    onError: () => {
      void utils.chat.room.invalidate({ chatId });
    },
  });
  const access = trpc.chat.setRoomAccess.useMutation({
    onSuccess: () => void utils.chat.room.invalidate({ chatId }),
  });

  const value = room.data;
  const active = value?.status === "active";
  const inside = Boolean(value?.isInside);
  const participantCount = value?.participants.length ?? 0;
  const meIsStarter = Boolean(
    value?.startedBy &&
      value.participants.find((participant) => participant.isMe)?.id === value.startedBy,
  );

  useEffect(() => {
    if (!inside) return;
    const timer = window.setInterval(() => {
      if (!heartbeat.isPending) heartbeat.mutate({ chatId, micMuted });
    }, 25_000);
    return () => window.clearInterval(timer);
  }, [chatId, heartbeat, inside, micMuted]);

  useEffect(() => {
    return () => {
      liveRoomRef.current?.disconnect();
      liveRoomRef.current = null;
    };
  }, []);

  const disconnectMedia = () => {
    liveRoomRef.current?.disconnect();
    liveRoomRef.current = null;
    if (audioContainerRef.current) audioContainerRef.current.replaceChildren();
    setMediaStatus("idle");
  };

  const connectMedia = async () => {
    setMediaStatus("connecting");
    setMediaError(null);

    try {
      const credentials = await mediaToken.mutateAsync({ chatId });
      if (!credentials.enabled) {
        setMediaStatus("unavailable");
        return;
      }

      liveRoomRef.current?.disconnect();
      const liveRoom = new Room({ adaptiveStream: true, dynacast: true });
      liveRoomRef.current = liveRoom;

      const attachAudio = (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        element.autoplay = true;
        element.dataset.livekitAudio = "true";
        audioContainerRef.current?.appendChild(element);
      };
      const detachAudio = (track: RemoteTrack) => {
        track.detach().forEach((element) => element.remove());
      };

      liveRoom
        .on(RoomEvent.TrackSubscribed, attachAudio)
        .on(RoomEvent.TrackUnsubscribed, detachAudio)
        .on(RoomEvent.Disconnected, () => {
          if (liveRoomRef.current === liveRoom) {
            liveRoomRef.current = null;
            setMediaStatus("idle");
          }
        });

      await liveRoom.connect(credentials.url, credentials.token);
      await liveRoom.startAudio().catch(() => undefined);
      if (!micMuted) {
        await liveRoom.localParticipant.setMicrophoneEnabled(true);
      }
      setMediaStatus("connected");
    } catch (error) {
      liveRoomRef.current?.disconnect();
      liveRoomRef.current = null;
      setMicMuted(true);
      setMediaStatus("error");
      setMediaError(
        error instanceof Error
          ? error.message
          : "Не удалось подключить голос. Проверьте микрофон и сеть.",
      );
    }
  };

  const enterAndConnect = async () => {
    try {
      if (!inside) {
        const nextRoom = await enter.mutateAsync({ chatId, micMuted });
        utils.chat.room.setData({ chatId }, nextRoom);
      }
      await connectMedia();
    } catch {
      // Ошибка мутации уже отображается ниже.
    }
  };

  const leaveRoom = async () => {
    disconnectMedia();
    await leave.mutateAsync({ chatId });
  };

  const toggleMic = async () => {
    const nextMuted = !micMuted;
    try {
      if (liveRoomRef.current && mediaStatus === "connected") {
        await liveRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
      }
      setMicMuted(nextMuted);
      setMediaError(null);
      if (inside && !heartbeat.isPending) {
        heartbeat.mutate({ chatId, micMuted: nextMuted });
      }
    } catch {
      setMicMuted(true);
      setMediaError("Не удалось включить микрофон. Разрешите доступ в настройках браузера.");
    }
  };

  const isDirect = chatType === "direct";
  const connectionLabel =
    mediaStatus === "connected"
      ? "Голос подключён"
      : mediaStatus === "connecting"
        ? "Подключение…"
        : mediaStatus === "unavailable"
          ? "Нужны ключи LiveKit"
          : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition",
          mediaStatus === "connected"
            ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
            : active
              ? "border-[var(--theme-accent)]/35 bg-[var(--app-accent-soft)] text-(--theme-accent)"
              : "border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
        )}
        aria-label={isDirect ? "Открыть голосовую комнату" : "Комната группы"}
      >
        {active ? <UsersRound className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        <span className="hidden sm:inline">
          {active
            ? `${participantCount} в комнате`
            : isDirect
              ? "Голос"
              : "Комната"}
        </span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} className="max-w-lg">
        <div ref={audioContainerRef} hidden aria-hidden="true" />

        <div className="pr-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">
            {isDirect ? "Разговор вдвоём" : "Комната"}
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold">{chatName}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            {active
              ? isDirect
                ? "Можно спокойно подключиться голосом. Собеседник увидит комнату, но войдёт только сам."
                : "Участники беседы видят комнату и присоединяются по своему желанию."
              : isDirect
                ? "Откройте комнату и ждите собеседника. Это не звонок: звук у него не включится автоматически."
                : "Откройте комнату, чтобы участники беседы увидели, что к вам можно присоединиться."}
          </p>
          {connectionLabel ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
              {mediaStatus === "connecting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {connectionLabel}
            </p>
          ) : null}
        </div>

        {active ? (
          <div className="mt-5 space-y-2">
            {value?.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2.5"
              >
                <ProfileAvatar displayName={participant.displayName} size="sm" isOnline />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {participant.displayName}
                    {participant.isMe ? " · вы" : ""}
                  </p>
                  <p className="truncate text-xs text-[var(--app-muted)]">@{participant.username}</p>
                </div>
                {participant.micMuted ? (
                  <MicOff className="h-4 w-4 text-[var(--app-muted)]" />
                ) : (
                  <Mic className="h-4 w-4 text-emerald-400" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)">
                <DoorOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Вход только по действию пользователя</p>
                <p className="text-xs text-[var(--app-muted)]">Микрофон изначально выключен.</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void toggleMic()}
          className={cn(
            "mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
            micMuted
              ? "border-[var(--app-border)] bg-[var(--app-surface-soft)]"
              : "border-emerald-500/35 bg-emerald-500/10",
          )}
        >
          <span>
            <span className="block text-sm font-medium">
              {micMuted ? "Микрофон выключен" : "Микрофон включён"}
            </span>
            <span className="block text-xs text-[var(--app-muted)]">
              Браузер запросит разрешение только при включении
            </span>
          </span>
          {micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-emerald-400" />}
        </button>

        {meIsStarter && active && !isDirect ? (
          <button
            type="button"
            disabled={access.isPending}
            onClick={() =>
              access.mutate({
                chatId,
                accessMode: value?.accessMode === "locked" ? "open" : "locked",
              })
            }
            className="mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          >
            {value?.accessMode === "locked" ? "Открыть свободный вход" : "Закрыть свободный вход"}
            {value?.accessMode === "locked" ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>
        ) : null}

        {value?.accessMode === "locked" && !inside ? (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Комната закрыта. Механика «постучаться» будет следующим состоянием доступа.
          </p>
        ) : null}

        {mediaError || enter.error || leave.error || heartbeat.error || access.error || mediaToken.error ? (
          <p className="mt-3 text-sm text-red-400">
            {mediaError ??
              enter.error?.message ??
              leave.error?.message ??
              heartbeat.error?.message ??
              access.error?.message ??
              mediaToken.error?.message}
          </p>
        ) : null}

        {inside && mediaStatus === "connected" ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full"
            disabled={leave.isPending}
            onClick={() => void leaveRoom()}
          >
            {leave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
            Выйти из комнаты
          </Button>
        ) : (
          <Button
            type="button"
            className="mt-5 w-full"
            disabled={
              enter.isPending ||
              mediaToken.isPending ||
              mediaStatus === "connecting" ||
              room.isLoading ||
              (value?.status === "active" && value.accessMode === "locked" && !inside)
            }
            onClick={() => void enterAndConnect()}
          >
            {enter.isPending || mediaToken.isPending || mediaStatus === "connecting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            {inside
              ? "Подключить звук"
              : active
                ? "Войти в комнату"
                : isDirect
                  ? "Открыть комнату"
                  : "Начать комнату"}
          </Button>
        )}

        {inside && mediaStatus !== "connected" ? (
          <button
            type="button"
            disabled={leave.isPending}
            onClick={() => void leaveRoom()}
            className="mt-2 w-full rounded-xl py-2 text-sm text-[var(--app-muted)] transition hover:text-[var(--foreground)]"
          >
            Закрыть участие
          </button>
        ) : null}
      </Sheet>
    </>
  );
}
