import type { Metadata } from "next";

import { CoreRoomInvitePreviewView } from "@/components/chat/voice/CoreRoomInvitePreviewView";

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
  return <CoreRoomInvitePreviewView inviteId={inviteId} />;
}
