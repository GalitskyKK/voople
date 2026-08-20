"use client";

import { Trash2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { CommentViewModel } from "@/types/domain";

type PostCommentsViewProps = {
  comments: CommentViewModel[];
  text: string;
  canComment: boolean;
  loading?: boolean;
  submitting?: boolean;
  deletingCommentId?: string | null;
  hasMedia?: boolean;
  error?: string | null;
  badgeUrl?: string;
  uploadControl?: ReactNode;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onDelete: (comment: CommentViewModel) => void;
  renderMedia: (comment: CommentViewModel) => ReactNode;
};

export function PostCommentsView({
  comments,
  text,
  canComment,
  loading = false,
  submitting = false,
  deletingCommentId = null,
  hasMedia = false,
  error,
  badgeUrl,
  uploadControl,
  onTextChange,
  onSubmit,
  onDelete,
  renderMedia,
}: PostCommentsViewProps) {
  const submitDisabled =
    !canComment || (!text.trim() && !hasMedia) || submitting;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!submitDisabled) onSubmit();
  };

  return (
    <section className="voople-post-comments mt-4 space-y-3 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-3">
      <form className="space-y-2" onSubmit={submit}>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            disabled={!canComment || submitting}
            maxLength={280}
            placeholder={
              canComment
                ? "Комментарий"
                : "Войдите, чтобы комментировать"
            }
            className="voople-input min-w-0 flex-1 py-2 text-sm disabled:cursor-default disabled:opacity-60"
            aria-label="Текст комментария"
          />
          <Button type="submit" variant="secondary" disabled={submitDisabled}>
            {submitting ? "Отправляем…" : "Ответить"}
          </Button>
        </div>
        {canComment ? uploadControl : null}
      </form>

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div
          className="h-12 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          aria-label="Загрузка комментариев"
        />
      ) : null}

      {!loading && comments.length === 0 ? (
        <p className="py-2 text-center text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
          Пока нет комментариев
        </p>
      ) : null}

      {comments.map((comment) => (
        <article
          key={comment.id}
          className="rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DisplayNameWithPin
                hasVooplePlus={comment.author.hasVooplePlus}
                badgeUrl={badgeUrl}
                className="text-sm font-medium text-[var(--foreground)]"
              >
                {comment.author.displayName}
              </DisplayNameWithPin>
              {comment.text ? (
                <p className="whitespace-pre-wrap break-words text-sm text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]">
                  <RichText text={comment.text} />
                </p>
              ) : null}
              {comment.mediaUrl ? renderMedia(comment) : null}
              <RelativeTime
                iso={comment.createdAt}
                className="mt-1 block text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]"
              />
            </div>
            {comment.canDelete ? (
              <button
                type="button"
                disabled={deletingCommentId !== null}
                onClick={() => onDelete(comment)}
                className="rounded-lg p-1.5 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[var(--foreground)] disabled:opacity-50"
                aria-label="Удалить комментарий"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
