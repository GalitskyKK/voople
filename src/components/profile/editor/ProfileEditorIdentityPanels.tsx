"use client";

import { ImagePlus, Loader2, Upload } from "lucide-react";
import { useRef } from "react";

import { AvatarHistoryPicker } from "@/components/profile/AvatarHistoryPicker";
import { Button } from "@/components/ui/Button";

import { ProfileEditorAssetGrid } from "./ProfileEditorAssetGrid";
import { AVATAR_ASSET_GROUPS } from "./profile-editor-models";
import type { ProfileEditorController } from "./useProfileEditorController";

export function ProfileEditorProfilePanel({ controller }: { controller: ProfileEditorController }) {
  return (
    <div className="mt-5 space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Отображаемое имя</span>
        <input value={controller.draft.name} onChange={(event) => controller.setName(event.target.value)} maxLength={50} className="profile-editor-input" />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">О себе</span>
        <textarea value={controller.draft.bio} onChange={(event) => controller.setBio(event.target.value)} maxLength={100} rows={4} className="profile-editor-input resize-none" />
        <span className="block text-right text-xs text-[var(--app-muted)]">{controller.draft.bio.length}/100</span>
      </label>
      <p className="rounded-xl bg-[var(--app-surface-soft)] p-3 text-xs leading-5 text-[var(--app-muted)]">
        Имя и описание сохраняются кнопкой ниже. Оформление и тег применяются сразу и отдельно.
      </p>
    </div>
  );
}

export function ProfileEditorAvatarPanel({
  controller,
  profileHasPlus,
  onOpenShop,
}: {
  controller: ProfileEditorController;
  profileHasPlus: boolean;
  onOpenShop: () => boolean | void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const items = controller.allItems.filter((item) => ["decoration", "ring", "animated_avatar"].includes(item.kind));

  return (
    <div className="mt-5 space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={controller.avatarUpload.isUploading || controller.avatarPending} onClick={() => input.current?.click()}>
            {controller.avatarUpload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Загрузить аватар
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void controller.pickAvatar(file);
              event.target.value = "";
            }}
          />
        </div>
        <AvatarHistoryPicker avatars={controller.history.data} hasVooplePlus={profileHasPlus} pending={controller.avatarPending} onSelect={(key) => void controller.selectAvatar(key)} />
      </section>
      {AVATAR_ASSET_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.kind === group.kind);
        if (!groupItems.length) return null;
        return (
          <section key={group.kind} className="space-y-3">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <ProfileEditorAssetGrid items={groupItems} equipped={controller.equipped} busy={controller.cosmeticBusy} trialItemId={controller.trialItemId} onApply={controller.applyItem} onClear={controller.clearSlot} onOpenShop={onOpenShop} />
          </section>
        );
      })}
      {!items.length && !controller.overview.isLoading ? (
        <p className="rounded-xl border border-dashed border-[var(--app-border)] p-4 text-sm text-[var(--app-muted)]"><ImagePlus className="mr-2 inline h-4 w-4" />Украшения появятся здесь после добавления в каталог.</p>
      ) : null}
    </div>
  );
}
