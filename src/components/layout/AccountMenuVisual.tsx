"use client";

import { CircleHelp, LogOut, Settings, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";
import { AccountChipVisual } from "./AccountChipVisual";

type AccountMenuVisualProps = {
  displayName: string;
  username: string;
  avatar: ReactNode;
  compact?: boolean;
  fill?: boolean;
  onOpenProfile: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onLogout: () => void | Promise<void>;
};

const itemClassName =
  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-surface-soft)] focus-visible:outline-none";

export function AccountMenuVisual({
  displayName,
  username,
  avatar,
  compact = false,
  fill = true,
  onOpenProfile,
  onOpenHelp,
  onOpenSettings,
  onLogout,
}: AccountMenuVisualProps) {
  const [open, setOpen] = useState(false);

  const run = (action: () => void | Promise<void>) => {
    setOpen(false);
    void action();
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      side="right"
      align="start"
      className={fill ? "w-full" : undefined}
      menuClassName="w-[min(17rem,calc(100vw-1rem))]"
      trigger={
        <button
          type="button"
          className="block w-full rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
          aria-label="Открыть меню аккаунта"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <AccountChipVisual
            displayName={displayName}
            username={username}
            compact={compact}
            avatar={avatar}
          />
        </button>
      }
    >
      <div className="border-b border-[var(--app-border)] px-3 py-2.5">
        <p className="truncate text-sm font-semibold">{displayName}</p>
        <p className="truncate text-xs text-[var(--app-muted)]">@{username}</p>
      </div>
      <button role="menuitem" type="button" className={itemClassName} onClick={() => run(onOpenProfile)}>
        <UserRound className="h-4 w-4 shrink-0" aria-hidden />
        Профиль
      </button>
      <button role="menuitem" type="button" className={itemClassName} onClick={() => run(onOpenSettings)}>
        <Settings className="h-4 w-4 shrink-0" aria-hidden />
        Настройки
      </button>
      <button role="menuitem" type="button" className={itemClassName} onClick={() => run(onOpenHelp)}>
        <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
        Помощь
      </button>
      <div className="my-1 border-t border-[var(--app-border)]" role="separator" />
      <button
        role="menuitem"
        type="button"
        className={cn(itemClassName, "text-red-400 hover:text-red-300")}
        onClick={() => run(onLogout)}
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden />
        Выйти
      </button>
    </DropdownMenu>
  );
}
