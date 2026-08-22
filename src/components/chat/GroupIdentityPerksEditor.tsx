"use client";

import { Camera, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

import type { GroupCommunityView } from "@/types/chat";

type PendingKind = "save" | "boost" | "avatar" | "banner" | null;

function UploadControl({
  label,
  pending,
  kind,
  onFile,
}: {
  label: string;
  pending: PendingKind;
  kind: "avatar" | "banner";
  onFile: (file: File) => void;
}) {
  const Icon = kind === "avatar" ? Camera : ImagePlus;
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 text-xs font-medium transition hover:border-[var(--app-border-strong)]">
      {pending === kind ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={Boolean(pending)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

export function GroupIdentityPerksEditor({
  community,
  pending,
  tag,
  uploadAvatar,
  uploadBanner,
  onTagChange,
  onAvatarFile,
  onBannerFile,
  onRemoveAvatar,
  onRemoveBanner,
}: {
  community: GroupCommunityView;
  pending: PendingKind;
  tag: string;
  uploadAvatar?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  uploadBanner?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  onTagChange: (value: string) => void;
  onAvatarFile: (file: File) => void;
  onBannerFile: (file: File) => void;
  onRemoveAvatar: () => void;
  onRemoveBanner: () => void;
}) {
  return (
    <div className="space-y-3">
      {uploadAvatar ? (
        <div>
          <div className="flex items-center gap-2">
            <UploadControl label="Выбрать аватар" pending={pending} kind="avatar" onFile={onAvatarFile} />
            {community.avatarUrl ? (
              <button type="button" onClick={onRemoveAvatar} disabled={Boolean(pending)} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label="Удалить аватар группы">
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">
            {community.animatedIconEnabled
              ? "Поддерживаются статичные и анимированные изображения."
              : "Статичная иконка доступна всем, а анимация включается Boost-перком."}
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-2.5">
        <div
          className="h-20 rounded-lg border border-[var(--app-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-accent)_25%,var(--app-surface)),var(--app-surface))] bg-cover bg-center"
          style={community.bannerUrl ? { backgroundImage: `url("${community.bannerUrl}")` } : undefined}
          aria-label={community.bannerUrl ? "Предпросмотр баннера группы" : "Баннер группы не выбран"}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {uploadBanner ? (
            <UploadControl label="Выбрать баннер" pending={pending} kind="banner" onFile={onBannerFile} />
          ) : null}
          {community.bannerUrl ? (
            <button type="button" onClick={onRemoveBanner} disabled={Boolean(pending)} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label="Удалить баннер группы">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-[var(--app-muted)]">
          {community.animatedBannerEnabled
            ? "Статичные и анимированные баннеры доступны: perk активен."
            : "Статичный баннер доступен всем группам, а анимация — как Boost-перк."}
        </p>
      </div>

      <label className="block text-xs font-medium">
        Тег группы
        <input
          value={tag}
          onChange={(event) => onTagChange(event.target.value.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "").slice(0, 5))}
          className="voople-input mt-1 w-full uppercase"
          placeholder="ВУПЛ"
          minLength={2}
          maxLength={5}
          disabled={!community.boostUnlocksTag}
        />
        <span className="mt-1 block font-normal text-[11px] text-[var(--app-muted)]">
          2–5 букв или цифр. Базовый тег доступен всем группам.
        </span>
      </label>
    </div>
  );
}
