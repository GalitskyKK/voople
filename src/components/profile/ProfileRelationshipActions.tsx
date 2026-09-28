"use client";

import { Ban, Ellipsis, LockOpen } from "lucide-react";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateContext";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ProfileFriendAction } from "./ProfileFriendAction";
import { ProfileMessageAction } from "./ProfileMessageAction";
import { ProfileMessageButton } from "./ProfileMessageButton";

type ProfileRelationshipActionsProps = {
  userId: string;
  username: string;
  canFollow: boolean;
  layout?: "default" | "compact";
  onNavigate?: (href: string) => void;
};

export function ProfileRelationshipActions({
  userId,
  username,
  canFollow,
  layout = "default",
  onNavigate,
}: ProfileRelationshipActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { authenticated, requireAuth } = useAuthGate();
  const utils = trpc.useUtils();
  const blockState = trpc.social.blockState.useQuery(
    { userId },
    { enabled: authenticated && canFollow, staleTime: 30_000 },
  );
  const setBlock = trpc.social.setUserBlock.useMutation({
    onSuccess: (result) => {
      utils.social.blockState.setData({ userId }, { blockedByMe: result.blocked });
      void utils.social.friendState.invalidate({ userId });
      void utils.social.myPinnedContacts.invalidate();
      void utils.feed.getPage.invalidate();
    },
  });

  if (!canFollow) return null;

  const blocked = blockState.data?.blockedByMe === true;
  const pending = setBlock.isPending || (authenticated && blockState.isLoading);
  const updateBlock = (nextBlocked: boolean) => {
    if (!requireAuth({ title: nextBlocked ? "Заблокировать пользователя" : "Разблокировать пользователя" })) {
      return;
    }
    if (nextBlocked && !window.confirm(
      `Заблокировать @${username}? Дружба, запросы, подписки и активные приглашения между вами будут удалены.`,
    )) return;
    setMenuOpen(false);
    setBlock.mutate({ userId, blocked: nextBlocked });
  };

  if (blocked) {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5", layout === "default" && "flex-1")}>
        {layout === "compact" ? (
          <IconButton
            label="Разблокировать пользователя"
            className="grid h-11 w-11 place-items-center rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--app-surface-soft)_80%,white)] sm:h-8 sm:w-8"
            disabled={pending}
            onClick={() => updateBlock(false)}
          >
            <LockOpen className="h-4 w-4" aria-hidden />
          </IconButton>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-11 w-full sm:h-8"
            disabled={pending}
            onClick={() => updateBlock(false)}
          >
            <LockOpen className="h-4 w-4" aria-hidden />
            {pending ? "Сохранение…" : "Разблокировать"}
          </Button>
        )}
        {setBlock.error ? (
          <p role="alert" className="text-xs text-red-400">{setBlock.error.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ProfileFriendAction userId={userId} />
      {onNavigate ? (
        <ProfileMessageAction username={username} size="sm" onNavigate={onNavigate} />
      ) : (
        <ProfileMessageButton username={username} size="sm" />
      )}
      <DropdownMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        align="end"
        trigger={
          <IconButton
            label="Действия с пользователем"
            className="grid h-11 w-11 place-items-center rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--app-surface-soft)_80%,white)] sm:h-8 sm:w-8"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={setBlock.isPending}
          >
            <Ellipsis className="h-4 w-4" aria-hidden />
          </IconButton>
        }
      >
        <button
          type="button"
          role="menuitem"
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-red-300 disabled:opacity-50 sm:min-h-0"
          disabled={setBlock.isPending}
          onClick={() => updateBlock(true)}
        >
          <Ban className="h-4 w-4 shrink-0" aria-hidden />
          Заблокировать
        </button>
      </DropdownMenu>
      {setBlock.error ? (
        <p role="alert" className="basis-full text-xs text-red-400">{setBlock.error.message}</p>
      ) : null}
    </>
  );
}
