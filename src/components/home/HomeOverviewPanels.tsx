"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import type { HomeOverviewView } from "@/types/home";
import { trpc } from "@/lib/trpc/client";
import { useHomeActiveRooms } from "@/hooks/useHomeActiveRooms";

import { HomeNowConnectedPanel } from "./HomeNowConnectedPanel";
import { HomeSecondaryRailView } from "./HomeOverviewPanelsView";

const renderDestination: NavigationDestinationRenderer = ({ href, label, className, active, children, onNavigate }) => (
  <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={className} onClick={onNavigate}>{children}</Link>
);

export function HomeNowPanel({ overview }: { overview: HomeOverviewView }) {
  const router = useRouter();
  const live = useHomeActiveRooms(overview);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messagingUsername, setMessagingUsername] = useState<string | null>(null);
  const openDirect = trpc.chat.openDirect.useMutation({
    onMutate: ({ username }) => {
      setMessageError(null);
      setMessagingUsername(username);
    },
    onSuccess: ({ chatId }) => router.push(`/messages/${chatId}`),
    onError: (error) => setMessageError(error.message),
    onSettled: () => setMessagingUsername(null),
  });

  return (
    <HomeNowConnectedPanel
      overview={live.overview}
      renderDestination={renderDestination}
      onMessageUser={(username) => openDirect.mutate({ username })}
      messagingUsername={messagingUsername}
      messageError={messageError}
      refreshing={live.refreshing}
      refreshPaused={live.paused}
      refreshError={live.error}
      onRetryRefresh={() => void live.retry()}
    />
  );
}

export function HomeSecondaryRail({ overview }: { overview: HomeOverviewView }) {
  const live = useHomeActiveRooms(overview);
  return <HomeSecondaryRailView overview={live.overview} renderDestination={renderDestination} />;
}
