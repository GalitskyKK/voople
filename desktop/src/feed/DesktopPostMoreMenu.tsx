import type { Session } from "@supabase/supabase-js";
import { Link2, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

const menuItemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[color-mix(in_srgb,var(--foreground)_90%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] disabled:opacity-50";

export function DesktopPostMoreMenu({
  postId,
  isPinned,
  config,
  session,
  onChanged,
}: {
  postId: string;
  isPinned: boolean;
  config: DesktopConfig;
  session: Session;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"pin" | "delete" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const togglePinned = async () => {
    setPending("pin");
    setStatus(null);
    try {
      await client.mutation("profile.setPinnedPost", {
        postId: isPinned ? null : postId,
      });
      setOpen(false);
      onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось закрепить пост");
    } finally {
      setPending(null);
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Удалить пост навсегда? Это действие нельзя отменить.")) return;
    setPending("delete");
    setStatus(null);
    try {
      await client.mutation("post.delete", { postId });
      setOpen(false);
      onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось удалить пост");
    } finally {
      setPending(null);
    }
  };

  const copyLink = async () => {
    const url = new URL(`/post/${postId}`, config.apiUrl).toString();
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Ссылка скопирована");
      setOpen(false);
    } catch {
      setStatus(url);
    }
  };

  return (
    <div className="relative">
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        align="end"
        trigger={
          <button
            type="button"
            className="text-[var(--app-muted)] hover:text-[var(--foreground)]"
            aria-label="Действия с постом"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((value) => !value)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        }
      >
        <button type="button" role="menuitem" className={menuItemClass} onClick={() => void copyLink()}>
          <Link2 className="h-4 w-4 shrink-0" />
          Скопировать ссылку
        </button>
        <button
          type="button"
          role="menuitem"
          className={menuItemClass}
          disabled={pending !== null}
          onClick={() => void togglePinned()}
        >
          {isPinned ? <PinOff className="h-4 w-4 shrink-0" /> : <Pin className="h-4 w-4 shrink-0" />}
          {pending === "pin" ? "Сохранение…" : isPinned ? "Открепить от профиля" : "Закрепить в профиле"}
        </button>
        <button
          type="button"
          role="menuitem"
          className={cn(menuItemClass, "text-red-400 hover:text-red-300")}
          disabled={pending !== null}
          onClick={() => void deletePost()}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          {pending === "delete" ? "Удаление…" : "Удалить"}
        </button>
      </DropdownMenu>
      {status ? (
        <p className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl bg-[var(--app-surface)] p-2 text-xs shadow-lg" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
