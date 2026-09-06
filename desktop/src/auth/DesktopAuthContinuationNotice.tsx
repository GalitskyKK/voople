import { DoorOpen } from "lucide-react";

import { roomInviteIdFromPath } from "@/lib/chat/core-room-invite-preview";

export function DesktopAuthContinuationNotice({ path }: { path: string | null }) {
  if (!path || !roomInviteIdFromPath(path)) return null;

  return (
    <div
      className="auth-continuation"
      data-voople-continuation-path={path}
      role="status"
    >
      <DoorOpen aria-hidden="true" size={18} strokeWidth={1.8} />
      <p>
        <strong>Приглашение сохранено</strong>
        <span>После входа откроем комнату — подтверждать участие заранее не будем.</span>
      </p>
    </div>
  );
}
