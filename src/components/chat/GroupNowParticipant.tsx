"use client";

import { useRef, useState } from "react";
import { AudioLines, MicOff, Video } from "lucide-react";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import type { GroupNowUser } from "@/types/group-now";
import type { VoiceSessionParticipantDetail } from "@/types/voice-session-participants";
import { VoiceParticipantContextMenu } from "./voice/VoiceParticipantContextMenu";
import { GroupPersonPreview } from "./GroupPersonPreview";

export function GroupNowParticipant({ user, onOpenProfile, detail, onVolumeChange, onVoop, voopPending }: {
  user: GroupNowUser;
  onOpenProfile?: (user: GroupNowUser) => void;
  detail?: VoiceSessionParticipantDetail;
  onVolumeChange?: (volume: number) => void;
  onVoop?: (user: GroupNowUser) => void;
  voopPending?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const volumeAvailable = Boolean(detail && !detail.isMe && onVolumeChange);
  const menuAvailable = volumeAvailable || Boolean(onVoop);
  const openMenu = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) setPoint({ x: rect.left, y: rect.bottom });
  };
  const content = <>
    <ProfileAvatarVisual displayName={user.displayName} size="sm" shape="round"
      className={detail?.speaking ? "voople-avatar-speaking rounded-full" : undefined}
      avatarImage={user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- portable identity shared with Tauri
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : undefined} />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[13px] font-medium">{user.displayName}</span>
      <span className="block truncate text-xs text-[var(--app-muted)]">{user.guest ? "гость" : `@${user.username}`}</span>
    </span>
    {detail?.speaking ? <AudioLines className="h-3.5 w-3.5 shrink-0 text-[var(--material-ice)]" aria-label="Говорит" /> : null}
    {detail?.muted ? <MicOff className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-label="Микрофон выключен" /> : null}
    {detail?.camera ? <Video className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-label="Камера включена" /> : null}
  </>;
  const identity = <button ref={trigger} type="button" className="voople-group-now-participant" data-participant-id={user.id}
    aria-label={`${menuAvailable ? "Действия участника" : "Просмотреть профиль"} ${user.displayName}`}
    aria-haspopup={menuAvailable ? "menu" : undefined} aria-expanded={menuAvailable ? Boolean(point) : undefined}
    onClick={menuAvailable ? openMenu : undefined}
    onContextMenu={(event) => { if (menuAvailable) { event.preventDefault(); setPoint({ x: event.clientX, y: event.clientY }); } }}
    onKeyDown={(event) => {
      if (menuAvailable && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
        event.preventDefault(); openMenu();
      }
    }}>{content}</button>;

  return <>
    {!user.guest ? <GroupPersonPreview id={user.id} username={user.username} displayName={user.displayName}
        onOpenProfile={onOpenProfile ? () => onOpenProfile(user) : undefined} previewOnClick={!menuAvailable} focusPreview={!menuAvailable}>
        {identity}
      </GroupPersonPreview> : menuAvailable ? identity : <div className="voople-group-now-participant" data-participant-id={user.id}>{content}</div>}
    {menuAvailable ? <VoiceParticipantContextMenu participant={user} open={Boolean(point)} anchorPoint={point}
      volume={detail?.volume ?? 1} onVolumeChange={volumeAvailable ? onVolumeChange : undefined}
      onOpenProfile={!user.guest && onOpenProfile ? () => onOpenProfile(user) : undefined}
      onVoop={onVoop ? () => onVoop(user) : undefined} voopPending={voopPending}
      onOpenChange={(open) => { if (!open) { setPoint(null); trigger.current?.focus({ preventScroll: true }); } }} /> : null}
  </>;
}
