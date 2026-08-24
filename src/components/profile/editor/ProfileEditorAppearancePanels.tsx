"use client";

import { ImagePlus, RotateCcw } from "lucide-react";
import { useRef } from "react";

import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { Button } from "@/components/ui/Button";
import { FRAME_PRESETS } from "@/lib/customization/frames-registry";
import { cn } from "@/lib/utils";

import { ProfileEditorAssetGrid } from "./ProfileEditorAssetGrid";
import { ProfileEditorFeedPreview } from "./ProfileEditorPreview";
import { BANNER_ASSET_GROUPS, PROFILE_BASE_MODES } from "./profile-editor-models";
import type { ProfileEditorController } from "./useProfileEditorController";

type CommonProps = {
  controller: ProfileEditorController;
  hasVooplePlus: boolean;
  onOpenShop: () => boolean | void;
};

function AssetSection({ title, items, controller, onOpenShop }: CommonProps & { title: string; items: ProfileEditorController["allItems"] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ProfileEditorAssetGrid items={items} equipped={controller.equipped} busy={controller.cosmeticBusy} trialItemId={controller.trialItemId} onApply={controller.applyItem} onClear={controller.clearSlot} onOpenShop={onOpenShop} />
    </section>
  );
}

export function ProfileEditorBannerPanel(props: CommonProps) {
  const { controller, hasVooplePlus } = props;
  const input = useRef<HTMLInputElement>(null);
  const items = controller.allItems.filter((item) => ["banner", "profile_background"].includes(item.kind));
  return (
    <div className="mt-5 space-y-6">
      <section className="profile-editor-plus-zone space-y-3 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Своё изображение</h3><VooplePlusBadge locked={!hasVooplePlus} /></div>
            <p className="mt-1 text-xs text-[var(--app-muted)]">PNG, JPEG, WebP или GIF. Рекомендуемое соотношение 8:3.</p>
          </div>
          <Button type="button" size="sm" disabled={!hasVooplePlus || controller.bannerUpload.isUploading || controller.bannerPending} onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" />Загрузить</Button>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void controller.pickBanner(file); event.target.value = ""; }} />
        {!hasVooplePlus ? <p className="text-xs text-[var(--app-muted)]">С Вупл+ можно загрузить собственное изображение или рисунок.</p> : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Основа карточки</h3>
          {controller.equipped?.cardBaseMode && controller.equipped.cardBaseMode !== "mirror" ? <button type="button" className="profile-editor-reset" onClick={() => controller.clearSlot("card_base_mode")}><RotateCcw className="h-3.5 w-3.5" />Сбросить</button> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {PROFILE_BASE_MODES.map((mode) => {
            const active = (controller.equipped?.cardBaseMode ?? "mirror") === mode.id;
            const locked = mode.premium && !hasVooplePlus;
            return <button key={mode.id} type="button" disabled={controller.cosmeticBusy} aria-pressed={active} onClick={() => controller.commitPatch({ cardBaseMode: mode.id }, locked)} className={cn("profile-editor-choice", active && "profile-editor-choice--active")}>{mode.label}{locked ? " · Вупл+" : ""}</button>;
          })}
        </div>
      </section>
      {BANNER_ASSET_GROUPS.map((group) => <AssetSection key={group.kind} {...props} title={group.title} items={items.filter((item) => item.kind === group.kind)} />)}
    </div>
  );
}

export function ProfileEditorFramePanel(props: CommonProps) {
  const { controller, hasVooplePlus } = props;
  const items = controller.allItems.filter((item) => item.kind === "profile_frame");
  return (
    <div className="mt-5 space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold">Базовые рамки</h3><p className="mt-1 text-xs text-[var(--app-muted)]">Базовые варианты доступны без покупки; премиальные можно примерить.</p></div>
          {controller.equipped?.profileFrameId ? <button type="button" className="profile-editor-reset" onClick={() => controller.clearSlot("profile_frame_id")}><RotateCcw className="h-3.5 w-3.5" />Без рамки</button> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.values(FRAME_PRESETS).map((preset) => {
            const active = controller.equipped?.profileFrameId === preset.id;
            const locked = Boolean((preset.isPremium || preset.usesCustomColor) && !hasVooplePlus);
            return (
              <button key={preset.id} type="button" disabled={controller.cosmeticBusy} aria-pressed={active} onClick={() => controller.commitPatch({ profileFrameId: preset.id }, locked)} className={cn("profile-editor-frame-choice", active && "profile-editor-frame-choice--active")}>
                <span className="profile-editor-frame-choice__swatch" style={{ background: preset.kind === "gradient" ? `linear-gradient(135deg, ${preset.colors.join(", ")})` : preset.colors[0], boxShadow: preset.kind === "glow" ? `0 0 16px ${preset.colors[1] ?? preset.colors[0]}` : undefined }} />
                <span className="mt-2 block text-sm font-medium">{preset.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--app-muted)]">{locked ? <VooplePlusBadge locked /> : active ? "Используется" : "Применить"}</span>
              </button>
            );
          })}
        </div>
      </section>
      <AssetSection {...props} title="Рамки из магазина" items={items} />
    </div>
  );
}

export function ProfileEditorFeedPanel(props: CommonProps & { avatarUrl: string | null; name: string }) {
  const { controller, onOpenShop, avatarUrl, name } = props;
  const items = controller.allItems.filter((item) => item.kind === "feed_card");
  return (
    <div className="mt-5 space-y-6">
      <ProfileEditorFeedPreview customization={controller.previewCustomization} avatarUrl={avatarUrl} name={name} />
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold">Оформление автора</h3><p className="mt-1 text-xs text-[var(--app-muted)]">Отображается в шапке публикаций и сохраняет контраст в обеих темах.</p></div>
          {controller.equipped?.feedCardStyleId ? <button type="button" className="profile-editor-reset" onClick={() => controller.clearSlot("feed_card_style_id")}><RotateCcw className="h-3.5 w-3.5" />Без бейджа</button> : null}
        </div>
        <ProfileEditorAssetGrid items={items} equipped={controller.equipped} busy={controller.cosmeticBusy} trialItemId={controller.trialItemId} onApply={controller.applyItem} onClear={controller.clearSlot} onOpenShop={onOpenShop} />
      </section>
    </div>
  );
}
