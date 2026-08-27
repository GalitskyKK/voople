"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";
import { createClient } from "@/lib/supabase/client";
import { AccountMenuVisual } from "./AccountMenuVisual";

export function AppAccountMenu({
  compact = false,
  fill = true,
}: {
  compact?: boolean;
  fill?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const viewer = trpc.user.viewer.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  if (viewer.isLoading) {
    return (
      <span
        className="grid h-10 place-items-center text-[var(--app-muted)]"
        role="status"
        aria-label="Загружаем профиль"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  if (!viewer.data) return null;

  const navigate = (href: string) => {
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <AccountMenuVisual
      displayName={viewer.data.displayName}
      username={viewer.data.username}
      compact={compact}
      fill={fill}
      avatar={
        <ProfileAvatar
          displayName={viewer.data.displayName}
          size="sm"
          animatedAvatarUrl={viewer.data.avatarUrl}
          decorationUrl={viewer.data.avatarDecorationUrl}
          ringId={viewer.data.avatarRingId}
        />
      }
      onOpenProfile={() => navigate("/me")}
      onOpenHelp={() => navigate("/help")}
      onOpenSettings={() => navigate("/settings")}
      onLogout={async () => {
        const { error } = await createClient().auth.signOut();
        if (error) return;
        router.replace("/login");
        router.refresh();
      }}
    />
  );
}
