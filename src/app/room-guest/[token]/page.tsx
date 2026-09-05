import type { Metadata } from "next";

import { RoomGuestPage } from "@/components/chat/RoomGuestPage";

export const metadata: Metadata = {
  title: "Гостевой вход в комнату",
  robots: { index: false, follow: false },
};

type RoomGuestRouteProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ convert?: string | string[] }>;
};

export default async function RoomGuestRoute({ params, searchParams }: RoomGuestRouteProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  return <RoomGuestPage token={token} conversionRequested={query.convert === "1"} />;
}
