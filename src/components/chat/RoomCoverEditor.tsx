"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";
import type { RoomCoverDraft } from "@/lib/chat/room-cover";
import type { GroupNowRoom } from "@/types/group-now";
import { RoomCoverPicker } from "./RoomCoverPicker";

export function RoomCoverEditor({ room, onClose, focusOwnerId }: { room: GroupNowRoom; onClose: () => void; focusOwnerId?: string }) {
  const [draft, setDraft] = useState<RoomCoverDraft>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = trpc.chat.coreUpdateRoomCover.useMutation();
  const utils = trpc.useUtils();
  const busy = uploading || mutation.isPending;
  const save = async () => {
    if (!draft || busy) return;
    setError(null);
    try {
      await mutation.mutateAsync({ roomId: room.id, cover: draft });
      await utils.chat.coreGroupNow.invalidate();
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить обложку"); }
  };
  return <Sheet open onClose={() => { if (!busy) onClose(); }} closeOnEscape={!busy} focusOwnerId={focusOwnerId} ariaLabel={`Обложка комнаты ${room.name}`} className="max-w-md">
    <h2 className="pr-10 text-xl font-semibold">Обложка комнаты</h2>
    <p className="mt-2 truncate text-sm text-[var(--app-muted)]">{room.name}</p>
    <RoomCoverPicker value={draft} onChange={setDraft} disabled={mutation.isPending} onUploadingChange={setUploading} />
    {error ? <p className="mt-3 text-sm text-[var(--voople-danger)]" role="alert">{error}</p> : null}
    <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={onClose}>Отмена</Button><Button disabled={!draft || busy} onClick={() => void save()}>{mutation.isPending ? "Сохраняем…" : "Сохранить"}</Button></div>
  </Sheet>;
}
