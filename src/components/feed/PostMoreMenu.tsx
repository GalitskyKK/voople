"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Link2, MoreHorizontal, Pencil } from "lucide-react";

import { canEditPostByAge } from "@/lib/posts/edit-window";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { PostEditSheet } from "./PostEditSheet";

type PostMoreMenuProps = {
  postId: string;
  createdAt: string;
  authorUsername: string;
  kind?: "text" | "status";
  text?: string;
  repostComment?: string;
  hasRepostTarget?: boolean;
  viewerUsername?: string | null;
  profileUsername?: string;
  className?: string;
  onTextUpdated?: (text: string, isRepostComment: boolean) => void;
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
  className,
  onTextUpdated,
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
    reportPost.mutate({ postId });
  };

  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10 disabled:opacity-50";

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
            className="text-white/50 hover:text-white"
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
          <Link2 className="h-4 w-4 shrink-0 text-white/50" />
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
            <Pencil className="h-4 w-4 shrink-0 text-white/50" />
            Редактировать
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
            <Flag className="h-4 w-4 shrink-0 text-white/50" />
            Пожаловаться
          </button>
        )}
      </DropdownMenu>
      {toast && (
        <p
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white shadow-lg"
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
