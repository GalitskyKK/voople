"use client";

import { useRouter } from "next/navigation";

import { authEntryHref } from "@/lib/auth/continuation";
import { createClient } from "@/lib/supabase/client";

import { CoreRoomInvitePreview } from "./CoreRoomInvitePreview";

export function WebCoreRoomInvitePreview({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const invitePath = `/room-invites/${inviteId}`;

  const switchAccount = async () => {
    const { error } = await createClient().auth.signOut();
    if (error) throw error;
    router.replace(authEntryHref("/login", invitePath));
    router.refresh();
  };

  return <CoreRoomInvitePreview inviteId={inviteId} onSwitchAccount={switchAccount} />;
}
