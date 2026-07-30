"use client";

import { Check, Copy, Loader2, Send, Share2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import {
  APPEARANCE_SCENES,
  type AppearanceSceneId,
} from "./ProfileAppearanceCardVisual";

type ProfileShareViewProps = {
  open: boolean;
  scene: AppearanceSceneId;
  caption: string;
  preview: ReactNode;
  publishing: boolean;
  published: boolean;
  copied: boolean;
  error?: string | null;
  onOpen: () => void;
  onClose: () => void;
  onSceneChange: (scene: AppearanceSceneId) => void;
  onCaptionChange: (caption: string) => void;
  onPublish: () => void;
  onShare: () => void;
  onCopy: () => void;
};

export function ProfileShareView({
  open,
  scene,
  caption,
  preview,
  publishing,
  published,
  copied,
  error,
  onOpen,
  onClose,
  onSceneChange,
  onCaptionChange,
  onPublish,
  onShare,
  onCopy,
}: ProfileShareViewProps) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-xs font-medium text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--foreground)]"
      >
        <Share2 className="h-3.5 w-3.5" />
        Поделиться образом
      </button>
      <Sheet open={open} onClose={onClose} className="max-w-4xl p-4 sm:p-5">
        <div className="pr-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">
            Поделиться образом
          </h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Опубликуйте живой образ в ленте или отправьте ссылку на профиль.
          </p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem]">
          {preview}
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)]">
              Сцена
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-1">
              {APPEARANCE_SCENES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={scene === item.id}
                  onClick={() => onSceneChange(item.id)}
                  className={cn(
                    "rounded-xl border p-2 text-left text-xs font-medium transition",
                    scene === item.id
                      ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]"
                      : "border-[var(--app-border)] bg-[var(--app-surface-soft)] hover:border-[var(--app-border-strong)]",
                  )}
                >
                  <span
                    className="mb-2 block h-7 rounded-lg"
                    style={{ background: item.background }}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-[var(--app-muted)]">
                Подпись к посту
              </span>
              <textarea
                value={caption}
                onChange={(event) => onCaptionChange(event.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Например: обновил свой образ"
                className="voople-input mt-1.5 w-full resize-none text-sm"
              />
            </label>

            <div className="mt-4 space-y-2 md:mt-auto">
              <Button
                type="button"
                className="w-full"
                disabled={publishing || published}
                onClick={onPublish}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : published ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {published ? "Опубликовано" : "Опубликовать в ленте"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onShare}
              >
                <Share2 className="h-4 w-4" />
                Отправить ссылку
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
              </Button>
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}
