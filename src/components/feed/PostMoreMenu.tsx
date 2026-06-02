"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Link2, MoreHorizontal, Pencil } from "lucide-react";

import { canEditPostByAge } from "@/lib/posts/edit-window";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
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
  const menuRef = useRef<HTMLDivElement>(null);

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

  useDismissOnOutsideClick(menuRef, () => setOpen(false), open);

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

  return (
    <>
      <div ref={menuRef} className={cn("relative shrink-0", className)}>
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
        {open && (
          <div
            role="menu"
            className="absolute end-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a24] py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
              onClick={() => void copyLink()}
            >
              <Link2 className="h-4 w-4 shrink-0 text-white/50" />
              Скопировать ссылку
            </button>
            {canEdit && (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
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
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10 disabled:opacity-50"
                onClick={handleReport}
              >
                <Flag className="h-4 w-4 shrink-0 text-white/50" />
                Пожаловаться
              </button>
            )}
          </div>
        )}
      </div>
      {toast && (
        <p
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white shadow-lg"
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
