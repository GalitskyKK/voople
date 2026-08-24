"use client";

import { ImagePlus } from "lucide-react";
import type { ReactNode } from "react";

import { COPY } from "@/lib/constants/copy";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

import { PostComposer } from "./PostComposer";

export function CreatePostDialogView({
  open,
  text,
  busy,
  error,
  draftStatus,
  uploadControl,
  onClose,
  onTextChange,
  onPublish,
}: {
  open: boolean;
  text: string;
  busy: boolean;
  error: string | null;
  draftStatus?: string | null;
  uploadControl: ReactNode;
  onClose: () => void;
  onTextChange: (value: string) => void;
  onPublish: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      className="max-w-2xl p-4 sm:p-6"
      ariaLabel={COPY.newPost}
    >
      <div className="mb-5 pe-10">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
            <ImagePlus className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold">{COPY.newPost}</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--app-muted)]">
          Поделитесь мыслью, фотографией или видео.
        </p>
      </div>
      <PostComposer
        value={text}
        onChange={onTextChange}
        disabled={busy}
        autoFocus
      />
      <div className="mt-3">{uploadControl}</div>
      {draftStatus ? (
        <p className="mt-2 text-xs text-[var(--app-muted)]">{draftStatus}</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="primary"
        className="mt-4 w-full"
        disabled={busy}
        onClick={onPublish}
      >
        {busy ? "Публикуем…" : COPY.publish}
      </Button>
    </Sheet>
  );
}
