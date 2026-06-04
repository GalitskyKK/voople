"use client";

import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";

import { ProfileAvatar, type ProfileAvatarProps } from "./ProfileAvatar";

type ProfileAvatarWithPresenceProps = ProfileAvatarProps & {
  userId?: string | null;
};

export function ProfileAvatarWithPresence({ userId, ...props }: ProfileAvatarWithPresenceProps) {
  const { onlineUserIds } = useOnlineUsers();
  const isOnline = Boolean(userId && onlineUserIds.has(userId));

  return <ProfileAvatar {...props} isOnline={isOnline} />;
}
