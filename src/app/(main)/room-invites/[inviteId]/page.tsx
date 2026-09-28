import type { Metadata } from "next";

import { WebCoreRoomInvitePreview } from "@/components/chat/voice/WebCoreRoomInvitePreview";

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
  return <WebCoreRoomInvitePreview inviteId={inviteId} />;
}
