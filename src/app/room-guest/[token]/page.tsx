import type { Metadata } from "next";

import { RoomGuestPage } from "@/components/chat/RoomGuestPage";

export const metadata: Metadata = {
  title: "Гостевой вход в комнату",
  robots: { index: false, follow: false },
};

type RoomGuestRouteProps = {
  params: Promise<{ token: string }>;
};

export default async function RoomGuestRoute({ params }: RoomGuestRouteProps) {
  const { token } = await params;
  return <RoomGuestPage token={token} />;
}
