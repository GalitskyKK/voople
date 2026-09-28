import { CoreRoomInvitePreview } from "@/components/chat/voice/CoreRoomInvitePreview";

import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";

export function DesktopRoomInviteAdapter({
  config,
  inviteId,
  onPendingPathPreserved,
}: {
  config: DesktopConfig;
  inviteId: string;
  onPendingPathPreserved: (path: string) => void;
}) {
  const invitePath = `/room-invites/${inviteId}`;
  const switchAccount = async () => {
    const { error } = await getSupabase(config).auth.signOut();
    if (error) throw error;
    // Supabase can emit SIGNED_OUT before this promise resolves. The parent
    // router stays mounted, so restoring the path here updates the login view
    // and carries the same protected preview into the next authenticated session.
    onPendingPathPreserved(invitePath);
  };

  return <CoreRoomInvitePreview inviteId={inviteId} onSwitchAccount={switchAccount} />;
}
