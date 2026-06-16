"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { PostComposer } from "./PostComposer";

type PostEditSheetProps = {
  postId: string;
  initialText: string;
  open: boolean;
  onClose: () => void;
  profileUsername?: string;
  onSaved?: (text: string) => void;
};

export function PostEditSheet({
  postId,
  initialText,
  open,
  onClose,
  profileUsername,
  onSaved,
}: PostEditSheetProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // Сброс черновика при открытии (и при смене редактируемого поста) — без эффекта:
  // корректируем состояние во время рендера по изменению входных пропсов.
  const [prev, setPrev] = useState({ open, initialText });
  if (open !== prev.open || (open && initialText !== prev.initialText)) {
    setPrev({ open, initialText });
    if (open) {
      setText(initialText);
      setError(null);
    }
  }

  const update = trpc.post.update.useMutation({
    onSuccess: (_data, variables) => {
      void utils.feed.getPage.invalidate();
      void utils.post.getById.invalidate({ postId });
      if (profileUsername) {
        void utils.profile.getPostsByUsername.invalidate({ username: profileUsername });
      }
      onSaved?.(variables.text);
    },
    onError: (err) => setError(err.message),
  });

  const handleSave = () => {
    setError(null);
    update.mutate({ postId, text: text.trim() });
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="mb-4 pe-10 text-lg font-semibold">Редактировать пост</h2>
      <PostComposer value={text} onChange={setText} disabled={update.isPending} />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <Button
        type="button"
        variant="primary"
        className="mt-4 w-full"
        disabled={update.isPending || !text.trim()}
        onClick={handleSave}
      >
        {update.isPending ? "…" : "Сохранить"}
      </Button>
    </Sheet>
  );
}
