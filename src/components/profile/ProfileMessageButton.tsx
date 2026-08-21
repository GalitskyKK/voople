"use client";

import { useRouter } from "next/navigation";
import { ProfileMessageAction } from "./ProfileMessageAction";

type ProfileMessageButtonProps = {
  username: string;
  size?: "sm" | "md";
};

export function ProfileMessageButton({ username, size = "md" }: ProfileMessageButtonProps) {
  const router = useRouter();
  return (
    <ProfileMessageAction
      username={username}
      size={size}
      onNavigate={(href) => router.push(href)}
    />
  );
}
