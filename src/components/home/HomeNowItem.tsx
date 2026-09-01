"use client";
/* eslint-disable @next/next/no-img-element -- shared CDN avatars for Next.js and Tauri. */

import { Gamepad2, Headphones, Pin } from "lucide-react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { resolveRingStyle } from "@/lib/customization/rings";
import { reportProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import type { HomeNowItem, HomeRoomTarget } from "@/types/home";

function RoomParticipantStack({ item }: { item: HomeNowItem }) {
  if (item.kind !== "room" || !item.participants?.length) return null;
  return (
    <span
      className="ml-auto flex shrink-0 -space-x-2"
      aria-label={`В комнате: ${item.participants.map((participant) => participant.displayName).join(", ")}`}
    >
      {item.participants.slice(0, 3).map((participant) => (
        <span
          key={participant.id}
          className="h-6 w-6 overflow-hidden rounded-full border-2 border-[var(--app-surface)] bg-[var(--app-surface-soft)]"
        >
          {participant.avatarUrl ? (
            <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[9px] font-semibold">
              {participant.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function HomeNowItemView({
  item,
  renderDestination,
  onMessageUser,
  onJoinRoom,
  messagePending,
  roomPending,
  compact = false,
}: {
  item: HomeNowItem;
  renderDestination: NavigationDestinationRenderer;
  onMessageUser?: (username: string) => void;
  onJoinRoom?: (target: HomeRoomTarget) => void;
  messagePending?: boolean;
  roomPending?: boolean;
  compact?: boolean;
}) {
  const { onlineUserIds } = useOnlineUsers();
  const online = item.userId ? onlineUserIds.has(item.userId) || item.online : item.online;
  const activityLabel = item.kind === "room"
    ? item.subtitle
    : item.activity === "listening"
      ? item.subtitle
      : item.activity === "playing"
        ? item.subtitle
        : "В сети";
  const ActivityIcon = item.activity === "listening" ? Headphones : item.activity === "playing" ? Gamepad2 : null;
  const children = <>
    <ProfileAvatarVisual
      displayName={item.title}
      size="sm"
      avatarImage={item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : undefined}
      decorationImage={item.avatarDecorationUrl ? <img src={item.avatarDecorationUrl} alt="" className="h-full w-full object-contain" /> : undefined}
      ringClassName={resolveRingStyle(item.avatarRingId)?.className}
      isOnline={online || item.kind === "room"}
    />
    <span className="min-w-0">
      <span className="flex items-center gap-1 truncate text-sm font-semibold">
        {item.pinned ? <Pin className="h-3 w-3 shrink-0 fill-current text-[var(--theme-accent)]" aria-label="Закреплён" /> : null}
        <span className="truncate">{item.title}</span>
      </span>
      {!compact ? (
        <>
          <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-[var(--app-muted)]">
            {ActivityIcon ? <ActivityIcon className="h-3 w-3 shrink-0 text-[var(--theme-accent)]" /> : null}
            <span className="truncate">{activityLabel}</span>
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold text-[var(--theme-accent)] opacity-0 transition group-hover:opacity-100">
            {item.kind === "room" ? "Зайти" : "Написать"}
          </span>
        </>
      ) : null}
    </span>
    {!compact ? <RoomParticipantStack item={item} /> : null}
  </>;
  const reportAction = () => {
    reportProductEvent("presence_clicked", {
      kind: item.kind,
      action: item.kind === "room" ? "join" : "message",
    });
    if (item.kind !== "room") {
      reportProductEvent("presence_message_started", { source: "home_now" });
    }
  };
  const className = cn(
    "group flex flex-1 items-center rounded-xl text-left transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
    compact ? "min-w-[7.5rem] gap-2 px-2 py-1" : "min-w-[8.75rem] gap-2.5 px-2 py-2",
  );

  if (item.roomTarget && onJoinRoom) {
    return (
      <button
        type="button"
        className={className}
        disabled={roomPending}
        onClick={() => {
          reportAction();
          onJoinRoom(item.roomTarget!);
        }}
        aria-label={`${item.title}: зайти в комнату ${item.roomTarget.room.name}`}
      >
        {children}
      </button>
    );
  }

  if (item.messageUsername && onMessageUser) {
    return <button type="button" className={className} disabled={messagePending} onClick={() => { reportAction(); onMessageUser(item.messageUsername!); }} aria-label={`${item.title}: написать`}>{children}</button>;
  }

  return renderDestination({
    href: item.href,
    label: `${item.title}: ${item.kind === "room" ? "зайти в комнату" : "написать"}`,
    active: false,
    onNavigate: reportAction,
    className,
    children,
  });
}
