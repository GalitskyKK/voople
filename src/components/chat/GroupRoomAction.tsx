"use client";

import { Radio } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

import { GroupNowVoicePanel } from "./GroupNowVoicePanel";
import { VoiceRoomButton } from "./voice/VoiceRoomButton";

export function GroupRoomAction({
  groupId,
  groupName,
  canCreatePinned = false,
  display = "icon",
  onBeforeOpen,
  onOpenProfile,
}: {
  groupId: string;
  groupName: string;
  canCreatePinned?: boolean;
  display?: "icon" | "label";
  onBeforeOpen?: () => void;
  onOpenProfile?: (username: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const availability = trpc.chat.coreRoomAvailability.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!availability.data?.enabled) {
    return (
      <VoiceRoomButton
        chatId={groupId}
        chatName={groupName}
        chatType="group"
        display={display}
      />
    );
  }

  const showRooms = () => {
    onBeforeOpen?.();
    setOpen(true);
  };

  return (
    <>
      <IconButton
        label={`Комнаты группы ${groupName}`}
        tooltipSide="bottom"
        onClick={showRooms}
        className={cn(
          "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] text-xs font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
          display === "icon" ? "w-9" : "gap-2 px-3",
        )}
      >
        <Radio className="h-4 w-4" aria-hidden="true" />
        {display === "label" ? <span>Комнаты</span> : null}
      </IconButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        ariaLabel={`Комнаты группы ${groupName}`}
        className="max-w-[min(34rem,100vw)] px-0 pt-8"
      >
        <GroupNowVoicePanel
          enabled={open}
          groupId={groupId}
          groupName={groupName}
          canCreatePinned={canCreatePinned}
          onRoomOpened={() => setOpen(false)}
          onOpenProfile={onOpenProfile
            ? (user) => {
                setOpen(false);
                onOpenProfile(user.username);
              }
            : undefined}
        />
      </Sheet>
    </>
  );
}
