"use client";

import { Check, LoaderCircle, UserPlus, X } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import type { CoreRoomInviteCandidate, CoreRoomInviteStatus } from "@/types/room-invitations";

const STATUS_LABELS: Record<CoreRoomInviteStatus, string> = {
  pending: "Ожидает ответа", accepted: "Принято", declined: "Отклонено",
  expired: "Истекло", cancelled: "Отменено",
};

export function CoreRoomInviteCandidateRow({ candidate, activity, now, onInvite, onCancel }: {
  candidate: CoreRoomInviteCandidate;
  activity: "idle" | "sending" | "cancelling" | "busy" | "disabled";
  now: number;
  onInvite: () => void;
  onCancel: (inviteId: string) => void;
}) {
  const record = candidate.invite;
  const status = record?.status === "pending" && !(Date.parse(record.expiresAt) > now) ? "expired" : record?.status;
  const pending = status === "pending";
  const disabled = activity !== "idle";
  return (
    <li className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <ProfileAvatarVisual displayName={candidate.displayName} size="sm" avatarImage={candidate.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : undefined} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{candidate.displayName}</p>
            <p className="truncate text-xs text-[var(--app-muted)]">@{candidate.username}</p>
            {status ? <p className="mt-0.5 text-xs text-[var(--app-muted)]">{STATUS_LABELS[status]}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={pending ? "ghost" : "secondary"} disabled={pending || disabled} onClick={onInvite}>
            {activity === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : pending ? <Check className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
            {activity === "sending" ? "Отправляем" : pending ? "Отправлено" : record ? "Позвать снова" : "Позвать"}
          </Button>
          {pending && record ? <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onCancel(record.id)}>
            {activity === "cancelling" ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
            {activity === "cancelling" ? "Отменяем" : "Отменить"}
          </Button> : null}
        </div>
      </div>
      {pending && record?.shareUrl && activity !== "disabled" ? (
        <div className="mt-3 border-t border-[var(--app-border)] pt-3">
          <p className="mb-2 text-xs text-[var(--app-muted)] [overflow-wrap:anywhere]">Адресная ссылка для @{candidate.username}. Другим аккаунтам она не даст доступ.</p>
          <div className="flex flex-wrap gap-2">
            <ShareButton url={record.shareUrl} mode="copy" label="Скопировать ссылку" disabled={disabled} />
            <ShareButton url={record.shareUrl} title="Приглашение в Voople" label="Поделиться" disabled={disabled} />
          </div>
        </div>
      ) : null}
    </li>
  );
}
