"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";
import { APPEARANCE_SCENES, ProfileAppearanceCard, type AppearanceSceneId } from "./ProfileAppearanceCard";

export function ProfileShareCardButton({ profile }: { profile: ProfileViewModel }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<AppearanceSceneId>("midnight");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const publish = trpc.post.create.useMutation({
    onSuccess: () => {
      setPublished(true);
      setCaption("");
      void Promise.all([
        utils.feed.getPage.invalidate(),
        utils.profile.getPostsByUsername.invalidate({ username: profile.username }),
      ]);
    },
  });

  const profileUrl = typeof window === "undefined" ? `https://voople.ru/${profile.username}` : `${window.location.origin}/${profile.username}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${profile.displayName} в Voople`, text: "Смотри мой новый образ в Voople", url: profileUrl }).catch(() => undefined);
    } else {
      await copyLink();
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-xs font-medium text-[var(--app-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--foreground)]">
        <Share2 className="h-3.5 w-3.5" /> Поделиться образом
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} className="max-w-4xl p-4 sm:p-5">
        <div className="pr-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Поделиться образом</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Опубликуйте живой образ в ленте или отправьте ссылку на профиль.</p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem]">
          <ProfileAppearanceCard profile={profile} scene={scene} className="max-w-[25rem]" />
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-muted)]">Сцена</p>
            <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-1">
              {APPEARANCE_SCENES.map((item) => (
                <button key={item.id} type="button" aria-pressed={scene === item.id} onClick={() => { setScene(item.id); setPublished(false); }} className={cn("rounded-xl border p-2 text-left text-xs font-medium transition", scene === item.id ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)] bg-[var(--app-surface-soft)] hover:border-[var(--app-border-strong)]")}>
                  <span className="mb-2 block h-7 rounded-lg" style={{ background: item.background }} />{item.label}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-[var(--app-muted)]">Подпись к посту</span>
              <textarea value={caption} onChange={(event) => { setCaption(event.target.value); setPublished(false); }} maxLength={280} rows={2} placeholder="Например: обновил свой образ" className="voople-input mt-1.5 w-full resize-none text-sm" />
            </label>

            <div className="mt-4 space-y-2 md:mt-auto">
              <Button type="button" className="w-full" disabled={publish.isPending || published} onClick={() => publish.mutate({ text: caption.trim() || undefined, appearanceScene: scene })}>
                {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : published ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {published ? "Опубликовано" : "Опубликовать в ленте"}
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => void shareLink()}><Share2 className="h-4 w-4" /> Отправить ссылку</Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => void copyLink()}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Ссылка скопирована" : "Скопировать ссылку"}</Button>
              {publish.error ? <p className="text-xs text-red-400">{publish.error.message}</p> : null}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}
