"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Link2, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";

import { canEditPostByAge } from "@/lib/posts/edit-window";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { PostEditSheet } from "./PostEditSheet";

type PostMoreMenuProps = {
  postId: string;
  createdAt: string;
  authorUsername: string;
  kind?: "text" | "status" | "appearance";
  text?: string;
  repostComment?: string;
  hasRepostTarget?: boolean;
  viewerUsername?: string | null;
  profileUsername?: string;
  isPinned?: boolean;
  className?: string;
  onTextUpdated?: (text: string, isRepostComment: boolean) => void;
  onDeleted?: () => void;
};

export function PostMoreMenu({
  postId,
  createdAt,
  authorUsername,
  kind = "text",
  text,
  repostComment,
  hasRepostTarget = false,
  viewerUsername = null,
  profileUsername,
  isPinned = false,
  className,
  onTextUpdated,
  onDeleted,
}: PostMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isOwner = Boolean(viewerUsername && viewerUsername === authorUsername);
  const editableText = repostComment ?? text ?? "";
  const canEdit =
    isOwner &&
    kind !== "status" &&
    canEditPostByAge(createdAt) &&
    Boolean(editableText.trim()) &&
    (!hasRepostTarget || Boolean(repostComment?.trim()));

  const reportPost = trpc.post.report.useMutation({
    onSuccess: () => {
      setToast("Жалоба отправлена");
      setOpen(false);
    },
    onError: (err) => setToast(err.message),
  });
  const utils = trpc.useUtils();
  const deletePost = trpc.post.delete.useMutation({
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        utils.feed.getPage.invalidate(),
        utils.post.getById.invalidate({ postId }),
        profileUsername
          ? utils.profile.getPostsByUsername.invalidate({ username: profileUsername })
          : Promise.resolve(),
      ]);
      onDeleted?.();
    },
    onError: (err) => setToast(err.message),
  });
  const setPinnedPost = trpc.profile.setPinnedPost.useMutation({
    onSuccess: async () => {
      setOpen(false);
      if (profileUsername) {
        await utils.profile.getPinnedPostByUsername.invalidate({ username: profileUsername });
      }
      setToast(isPinned ? "Пост откреплён" : "Пост закреплён");
    },
    onError: (err) => setToast(err.message),
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Ссылка скопирована");
    } catch {
      setToast(url);
    }
    setOpen(false);
  }, [postId]);

  const handleReport = () => {
    if (!viewerUsername || isOwner || reportPost.isPending) return;
    reportPost.mutate({ postId, reasonCode: "other" });
  };

  const handleDelete = () => {
    if (!isOwner || deletePost.isPending) return;
    if (!window.confirm("Удалить пост навсегда? Это действие нельзя отменить.")) return;
    deletePost.mutate({ postId });
  };

  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[color-mix(in_srgb,var(--foreground)_90%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] disabled:opacity-50";

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        align="end"
        className={className}
        trigger={
          <button
            type="button"
            className="text-[color-mix(in_srgb,var(--foreground)_50%,transparent)] hover:text-[var(--foreground)]"
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
          <Link2 className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
          Скопировать ссылку
        </button>
        {canEdit && (
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              setEditOpen(true);
              setOpen(false);
            }}
          >
            <Pencil className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
            Редактировать
          </button>
        )}
        {isOwner && profileUsername && (
          <button
            type="button"
            role="menuitem"
            disabled={setPinnedPost.isPending}
            className={menuItemClass}
            onClick={() => setPinnedPost.mutate({ postId: isPinned ? null : postId })}
          >
            {isPinned ? (
              <PinOff className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
            ) : (
              <Pin className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
            )}
            {setPinnedPost.isPending
              ? "Сохранение…"
              : isPinned
                ? "Открепить от профиля"
                : "Закрепить в профиле"}
          </button>
        )}
        {isOwner && (
          <button
            type="button"
            role="menuitem"
            disabled={deletePost.isPending}
            className={cn(menuItemClass, "text-red-400 hover:text-red-300")}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            {deletePost.isPending ? "Удаление…" : "Удалить"}
          </button>
        )}
        {viewerUsername && !isOwner && (
          <button
            type="button"
            role="menuitem"
            disabled={reportPost.isPending}
            className={cn(menuItemClass)}
            onClick={handleReport}
          >
            <Flag className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
            Пожаловаться
          </button>
        )}
      </DropdownMenu>
      {toast && (
        <p
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-[var(--foreground)] shadow-lg"
        >
          {toast}
        </p>
      )}
      <PostEditSheet
        postId={postId}
        initialText={editableText}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profileUsername={profileUsername}
        onSaved={(nextText) => {
          setEditOpen(false);
          setToast("Пост обновлён");
          onTextUpdated?.(nextText, Boolean(repostComment));
        }}
      />
    </>
  );
}
