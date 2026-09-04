import type { Metadata } from "next";

import { CoreRoomInvitePreview } from "@/components/chat/voice/CoreRoomInvitePreview";

export const metadata: Metadata = {
  title: "Приглашение в комнату",
  robots: { index: false, follow: false },
};

export default async function RoomInvitePage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  return <CoreRoomInvitePreview inviteId={inviteId} />;
}
