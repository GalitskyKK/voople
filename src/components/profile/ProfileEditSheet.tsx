"use client";
import { useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { FeedAuthorChipBackdrop } from "@/components/feed/FeedAuthorChipBackdrop";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import {
  frameLayerProps,
  ProfileCardFrameDivider,
  ProfileCardFrameOverlay,
} from "@/components/profile/ProfileCardFrame";
import { profileCardThemeStyle } from "@/components/profile/profile-card-style";
import { ProfileCardVideoSections } from "@/components/profile/ProfileCardVideoSections";
import { ProfileMeta } from "@/components/profile/ProfileMeta";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ShopCatalogPreview } from "@/components/shop/ShopCatalogPreview";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { FRAME_PRESETS } from "@/lib/customization/frames-registry";
import {
  displayNamePresentation,
  NICKNAME_EFFECTS,
  NICKNAME_FONTS,
} from "@/lib/customization/display-name-style";
import { FREE_NICKNAME_COLORS } from "@/lib/customization/nickname-options";
import { resolveCustomization } from "@/lib/customization/resolve";
import type { CardBaseMode, NicknameEffect, NicknameFont } from "@/lib/customization/types";
import { trpc } from "@/lib/trpc/client";
import { reportProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView, ProfileViewModel } from "@/types/domain";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";
import { ProfileEditTrigger } from "./ProfileEditTrigger";
import { ProfileEditorShopLink } from "./ProfileEditorShopLink";
import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { AvatarHistoryPicker } from "@/components/profile/AvatarHistoryPicker";
type Panel = "profile" | "avatar" | "banner" | "frame" | "feed" | "name";
type EditorCustomizationPatch = {
  profileFrameId?: string | null;
  frameColor?: string | null;
  cardBaseMode?: CardBaseMode | null;
  nicknameColor?: string | null;
  nicknameGradient?: boolean;
  nicknameFont?: NicknameFont | null;
  nicknameEffect?: NicknameEffect | null;
};
const PANELS: Array<{ id: Panel; label: string; hint: string }> = [
  { id: "profile", label: "Основной профиль", hint: "Имя и описание" },
  { id: "avatar", label: "Аватар и украшение", hint: "Фото, украшение и кольцо" },
  { id: "banner", label: "Баннер и фон", hint: "Верх и основа карточки" },
  { id: "frame", label: "Рамка карточки", hint: "Оформление по периметру" },
  { id: "feed", label: "Бейдж в ленте", hint: "Табличка автора публикации" },
  { id: "name", label: "Стиль имени", hint: "Цвет и градиент" },
];

const PANEL_KINDS: Record<Exclude<Panel, "profile">, ShopItemView["kind"][]> = {
  avatar: ["decoration", "ring", "animated_avatar"],
  banner: ["banner", "profile_background"],
  frame: ["profile_frame"],
  feed: ["feed_card"],
  name: [],
};
const AVATAR_GROUPS: Array<{ kind: ShopItemView["kind"]; title: string }> = [
  { kind: "decoration", title: "Украшения и кольца" },
  { kind: "ring", title: "CSS-кольца" },
  { kind: "animated_avatar", title: "Анимированные аватары" },
];

const BANNER_GROUPS: Array<{ kind: ShopItemView["kind"]; title: string }> = [
  { kind: "banner", title: "Баннер" },
  { kind: "profile_background", title: "Фон основной части" },
];

const BASE_MODES: Array<{ id: CardBaseMode; label: string; premium: boolean }> = [
  { id: "mirror", label: "Продолжение баннера", premium: false },
  { id: "theme", label: "Цвета профиля", premium: true },
  { id: "plain", label: "Спокойный фон", premium: true },
];

function fromEquipped(
  equipped: EquippedCustomizationView,
  fallback: ProfileCustomizationView,
): ProfileCustomizationView {
  const value = resolveCustomization({
    bannerId: equipped.bannerId,
    avatarRingId: equipped.avatarRingId,
    profileFrameId: equipped.profileFrameId,
    frameColor: equipped.frameColor,
    cardBaseMode: equipped.cardBaseMode,
    avatarDecorationId: equipped.avatarDecorationId,
    feedCardStyleId: equipped.feedCardStyleId,
    animatedAvatarId: equipped.animatedAvatarId,
    animatedAvatarUrl: equipped.animatedAvatarId ? null : fallback.assets.animatedAvatarUrl,
    profileBackgroundId: equipped.profileBackgroundId,
    nicknameColor: equipped.nicknameColor,
    nicknameGradient: equipped.nicknameGradient,
    nicknameFont: equipped.nicknameFont,
    nicknameEffect: equipped.nicknameEffect,
    themePrimary: equipped.themePrimary,
    themeAccent: equipped.themeAccent,
  });

  return {
    ...value,
    bannerValue: {
      color: fallback.bannerValue.color,
      url: value.assets.bannerUrl ?? undefined,
    },
  };
}

function isSelected(item: ShopItemView, value: EquippedCustomizationView | null) {
  if (!value || !item.equipValue) return false;
  const slots: Partial<Record<ShopItemView["equipSlot"], string | null>> = {
    avatar_decoration_id: value.avatarDecorationId,
    avatar_ring_id: value.avatarRingId,
    animated_avatar_id: value.animatedAvatarId,
    banner: value.bannerId,
    profile_background_id: value.profileBackgroundId,
    profile_frame_id: value.profileFrameId,
    feed_card_style_id: value.feedCardStyleId,
    nickname_style: value.nicknameColor,
  };
  return slots[item.equipSlot] === item.equipValue;
}

function withItem(
  current: EquippedCustomizationView,
  item: ShopItemView,
): EquippedCustomizationView {
  if (!item.equipValue) return current;
  const next = { ...current };
  if (item.equipSlot === "avatar_decoration_id") next.avatarDecorationId = item.equipValue;
  if (item.equipSlot === "avatar_ring_id") next.avatarRingId = item.equipValue;
  if (item.equipSlot === "animated_avatar_id") next.animatedAvatarId = item.equipValue;
  if (item.equipSlot === "banner") next.bannerId = item.equipValue;
  if (item.equipSlot === "profile_background_id") next.profileBackgroundId = item.equipValue;
  if (item.equipSlot === "profile_frame_id") next.profileFrameId = item.equipValue;
  if (item.equipSlot === "feed_card_style_id") next.feedCardStyleId = item.equipValue;
  if (item.equipSlot === "nickname_style") {
    next.nicknameColor = item.equipValue;
    next.nicknameGradient = true;
  }
  return next;
}

function withoutSlot(
  current: EquippedCustomizationView,
  slot: ShopItemView["equipSlot"] | "card_base_mode",
): EquippedCustomizationView {
  const next = { ...current };
  if (slot === "avatar_decoration_id") next.avatarDecorationId = null;
  if (slot === "avatar_ring_id") next.avatarRingId = null;
  if (slot === "animated_avatar_id") next.animatedAvatarId = null;
  if (slot === "banner") next.bannerId = null;
  if (slot === "profile_background_id") next.profileBackgroundId = null;
  if (slot === "profile_frame_id") {
    next.profileFrameId = null;
    next.frameColor = null;
  }
  if (slot === "feed_card_style_id") next.feedCardStyleId = null;
  if (slot === "nickname_style") {
    next.nicknameColor = null;
    next.nicknameGradient = false;
  }
  if (slot === "card_base_mode") next.cardBaseMode = "mirror";
  return next;
}

type AssetGridProps = {
  items: ShopItemView[];
  equipped: EquippedCustomizationView | null;
  busy: boolean;
  onApply: (item: ShopItemView) => void;
  onClear: (slot: ShopItemView["equipSlot"]) => void;
};

function AssetGrid({ items, equipped, busy, onApply, onClear }: AssetGridProps) {
  return (
    <div className="profile-editor-assets">
      {items.map((item) => {
        const active = isSelected(item, equipped);
        return (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => active && item.owned ? onClear(item.equipSlot) : onApply(item)}
            aria-pressed={active}
            className={cn(
              "profile-editor-asset",
              active && "profile-editor-asset--active",
              !item.owned && "profile-editor-asset--trial",
            )}
          >
            <div className="profile-editor-asset__preview">
              <ShopCatalogPreview catalog={item.previewMeta} previewUrl={item.previewUrl} />
              {item.requiresSubscription ? (
                <VooplePlusBadge className="absolute bottom-2 right-2" />
              ) : null}
            </div>
            <span className="block truncate text-sm font-medium">{item.name}</span>
            <span className={cn("mt-1 flex items-center gap-1 text-xs", active ? "text-(--theme-accent)" : "text-[var(--app-muted)]")}>
              {active ? <Check className="h-3.5 w-3.5" /> : null}
              {item.owned ? (active ? "Снять" : "Применить") : active ? "Убрать примерку" : "Примерить"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FeedBadgePreview({
  customization,
  avatarUrl,
  name,
}: {
  customization: ProfileCustomizationView;
  avatarUrl: string | null;
  name: string;
}) {
  const nickname = displayNamePresentation(customization.displayName);

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--app-muted)]">
        Предпросмотр в публикации
      </p>
      <div className="voople-author-nameplate relative h-14 min-w-0 overflow-hidden rounded-xl">
        <FeedAuthorChipBackdrop backgroundUrl={customization.assets.feedCardBackgroundUrl} />
        <div className="absolute inset-0 z-10 flex min-w-0 items-center">
          <span className="absolute left-10 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ProfileAvatar
              displayName={name}
              size="sm"
              ring={customization.flags.hasAvatarRing}
              ringId={customization.avatarRingId}
              decorationUrl={customization.assets.avatarDecorationUrl}
              animatedAvatarUrl={avatarUrl ?? customization.assets.animatedAvatarUrl}
            />
          </span>
          <span
            className={cn(
              "ml-20 min-w-0 max-w-[calc(100%_-_6rem)] truncate text-sm font-semibold",
              customization.flags.hasDisplayNameStyle
                ? nickname.className
                : "text-[var(--foreground)]",
            )}
            style={
              customization.flags.hasDisplayNameStyle ? nickname.style : undefined
            }
          >
            {name}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--app-muted)]">
        Аватар и имя накладываются интерфейсом — рисовать круг или текст внутри ассета не нужно.
      </p>
    </div>
  );
}

type PreviewProps = {
  profile: ProfileViewModel;
  customization: ProfileCustomizationView;
  avatarUrl: string | null;
  name: string;
  bio: string;
  editing: "name" | "bio" | null;
  onEditingChange: (editing: "name" | "bio" | null) => void;
  onNameChange: (name: string) => void;
  onBioChange: (bio: string) => void;
  onAvatarClick: () => void;
};

function ProfileEditorPreview({
  profile,
  customization,
  avatarUrl,
  name,
  bio,
  editing,
  onEditingChange,
  onNameChange,
  onBioChange,
  onAvatarClick,
}: PreviewProps) {
  const frame = frameLayerProps(customization.assets.frame);
  const hasMedia = customization.flags.hasBannerMedia && customization.assets.bannerMedia.kind !== "none";
  const themeStyle = profileCardThemeStyle(customization);
  const nickname = displayNamePresentation(customization.displayName);

  const identity = (
    <div className="relative z-10 px-5">
      <button
        type="button"
        onClick={onAvatarClick}
        className="-mt-10 block rounded-full focus:outline-none focus:ring-2 focus:ring-(--theme-accent)"
        aria-label="Открыть настройки аватара"
      >
        <ProfileAvatar
          displayName={name}
          size="lg"
          ring={customization.flags.hasAvatarRing}
          ringId={customization.avatarRingId}
          decorationUrl={customization.assets.avatarDecorationUrl}
          animatedAvatarUrl={avatarUrl ?? customization.assets.animatedAvatarUrl}
        />
      </button>
      {editing === "name" ? (
        <input
          autoFocus
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onBlur={() => onEditingChange(null)}
          className="mt-4 w-full rounded-lg bg-black/25 px-2 py-1 text-2xl font-bold outline-none ring-1 ring-(--theme-accent)"
          maxLength={50}
        />
      ) : (
        <button
          type="button"
          className={cn("mt-4 block max-w-full text-left text-2xl font-bold hover:underline", nickname.className)}
          style={customization.flags.hasDisplayNameStyle ? nickname.style : undefined}
          onClick={() => onEditingChange("name")}
        >
          {name}
        </button>
      )}
      <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
        @{profile.username}
      </p>
    </div>
  );

  const details = (
    <div className="relative z-10 px-5 pb-6">
      {editing === "bio" ? (
        <textarea
          autoFocus
          value={bio}
          onChange={(event) => onBioChange(event.target.value)}
          onBlur={() => onEditingChange(null)}
          className="mt-5 w-full resize-none rounded-lg bg-black/25 p-2 text-sm outline-none ring-1 ring-(--theme-accent)"
          rows={3}
          maxLength={100}
        />
      ) : (
        <button
          type="button"
          className="mt-5 block min-h-12 w-full text-left text-sm text-[color-mix(in_srgb,var(--foreground)_72%,transparent)] hover:underline"
          onClick={() => onEditingChange("bio")}
        >
          {bio || "Нажмите, чтобы рассказать о себе"}
        </button>
      )}
      <div className="mt-5 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-4">
        <ProfileMeta createdAt={profile.createdAt} subscriptionStartedAt={profile.subscriptionStartedAt} />
      </div>
      <div className="mt-5">
        <ProfileStats {...profile.stats} />
      </div>
    </div>
  );

  const body = (
    <div className="profile-card__body" style={themeStyle}>
      <ProfileCardFrameDivider frame={customization.assets.frame} />
      {identity}
      {details}
    </div>
  );

  return (
    <article
      className={cn(
        "profile-card voople-profile-card profile-card--split relative h-fit w-full",
        frame.className,
      )}
      style={{ ...themeStyle, ...frame.style }}
    >
      {hasMedia ? (
        <ProfileCardVideoSections
          media={customization.assets.bannerMedia}
          baseMode={customization.cardBaseMode}
          themePrimary={customization.themePrimary}
          themeAccent={customization.themeAccent}
          frame={customization.assets.frame}
          header={identity}
        >
          {details}
        </ProfileCardVideoSections>
      ) : (
        <div className="flex flex-col gap-[var(--profile-section-gap)]">
          <div className="relative z-[2] overflow-hidden rounded-[var(--profile-section-radius)]">
            <ProfileBanner customization={customization} className="h-[var(--profile-banner-height)] aspect-auto" />
          </div>
          {body}
        </div>
      )}
      <ProfileCardFrameOverlay frame={customization.assets.frame} />
    </article>
  );
}

export function ProfileEditSheet({
  profile,
  onUpdated,
  onNavigate,
  triggerVariant = "icon",
}: {
  profile: ProfileViewModel;
  onUpdated?: () => void;
  onNavigate?: (href: string) => void;
  triggerVariant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("profile");
  const [editing, setEditing] = useState<"name" | "bio" | null>(null);
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.customization.assets.animatedAvatarUrl ?? null);
  const [customization, setCustomization] = useState(profile.customization);
  const [optimisticEquipped, setOptimisticEquipped] = useState<EquippedCustomizationView | null>(null);
  const [committedEquipped, setCommittedEquipped] = useState<EquippedCustomizationView | null>(null);
  const [trialItemId, setTrialItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const overview = trpc.shop.overview.useQuery(undefined, { enabled: open });
  const history = trpc.customization.avatarHistory.useQuery(undefined, { enabled: open });
  const avatarUpload = useMediaUpload("avatar");
  const bannerUpload = useMediaUpload("banner");

  const syncPreview = (next: EquippedCustomizationView) => {
    setOptimisticEquipped(next);
    setCustomization((old) => fromEquipped(next, old));
  };

  const equipped = optimisticEquipped ?? committedEquipped ?? overview.data?.equipped ?? null;
  const previewCustomization =
    !optimisticEquipped && overview.data?.equipped
      ? fromEquipped(overview.data.equipped, customization)
      : customization;

  const commitPreview = (next: EquippedCustomizationView) => {
    setTrialItemId(null);
    setCommittedEquipped(next);
    syncPreview(next);
  };

  const restoreCommittedPreview = () => {
    const next = committedEquipped ?? overview.data?.equipped;
    if (!next) return;
    setTrialItemId(null);
    syncPreview(next);
    setMessage(null);
  };

  const refresh = async () => {
    await Promise.all([
      utils.profile.getByUsername.invalidate({ username: profile.username }),
      utils.shop.overview.invalidate(),
      utils.customization.getEquipped.invalidate(),
    ]);
    onUpdated?.();
  };

  const save = trpc.profile.update.useMutation({
    onSuccess: async () => {
      setEditing(null);
      setMessage("Профиль сохранён");
      await refresh();
    },
  });
  const equip = trpc.customization.equip.useMutation({
    onSuccess: async (next) => {
      commitPreview(next);
      reportProductEvent("cosmetic_equipped", { surface: "profile_editor" });
      await refresh();
    },
    onError: (error) => {
      setMessage(error.message);
      restoreCommittedPreview();
    },
  });
  const clearSlot = trpc.customization.clearSlot.useMutation({
    onSuccess: async (next) => {
      commitPreview(next);
      await refresh();
    },
    onError: (error) => {
      setMessage(error.message);
      restoreCommittedPreview();
    },
  });
  const update = trpc.customization.update.useMutation({
    onSuccess: async (next) => {
      commitPreview(next);
      await refresh();
    },
    onError: (error) => {
      setMessage(error.message);
      restoreCommittedPreview();
    },
  });
  const setAvatar = trpc.customization.setAvatarPhoto.useMutation({ onSuccess: refresh });
  const setBanner = trpc.customization.setCustomBanner.useMutation({
    onSuccess: async (next) => {
      commitPreview(next);
      await refresh();
    },
  });
  const selectAvatar = trpc.customization.selectAvatarFromHistory.useMutation({
    onSuccess: async (avatar) => {
      setAvatarUrl(avatar.url);
      await history.refetch();
      await refresh();
    },
  });

  const allItems = useMemo(
    () => (overview.data?.items ?? []).filter(
      (item) => item.kind !== "effect" && item.kind !== "nickname_style",
    ),
    [overview.data?.items],
  );
  const panelItems = panel === "profile" ? [] : allItems.filter((item) => PANEL_KINDS[panel].includes(item.kind));
  const busy = equip.isPending || clearSlot.isPending || update.isPending;

  const apply = (item: ShopItemView) => {
    if (item.requiresSubscription && !profile.hasVooplePlus) {
      const base = committedEquipped ?? overview.data?.equipped;
      if (!base) return;
      setTrialItemId(item.id);
      syncPreview(withItem(base, item));
      reportProductEvent("cosmetic_previewed", { itemKind: item.kind, surface: "profile_editor" });
      setMessage("Режим примерки Voople+: изменение видно только в предпросмотре.");
      return;
    }
    if (!item.owned) {
      if (trialItemId === item.id) {
        restoreCommittedPreview();
        return;
      }
      const base = committedEquipped ?? overview.data?.equipped;
      if (!base) return;
      setTrialItemId(item.id);
      syncPreview(withItem(base, item));
      reportProductEvent("cosmetic_previewed", { itemKind: item.kind, surface: "profile_editor" });
      setMessage("Режим примерки: изменение видно только в предпросмотре.");
      return;
    }
    const current = committedEquipped ?? overview.data?.equipped;
    if (!current) return;
    setMessage(null);
    setTrialItemId(null);
    syncPreview(withItem(current, item));
    equip.mutate({ itemId: item.id });
  };

  const clear = (slot: ShopItemView["equipSlot"] | "card_base_mode") => {
    const current = equipped ?? overview.data?.equipped;
    if (!current) return;
    setMessage(null);
    setTrialItemId(null);
    syncPreview(withoutSlot(current, slot));
    clearSlot.mutate({ slot });
  };

  const updatePreview = (patch: EditorCustomizationPatch, previewOnly = false) => {
    const current = committedEquipped ?? overview.data?.equipped;
    if (!current) return;
    const next = { ...current, ...patch };
    setMessage(previewOnly ? "Режим примерки Voople+: изменение видно только в предпросмотре." : null);
    setTrialItemId(previewOnly ? "premium-feature" : null);
    syncPreview(next);
    if (!previewOnly) update.mutate(patch);
  };

  const pickAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await avatarUpload.uploadFile(file);
    if (uploaded) {
      setAvatarUrl(uploaded.previewUrl);
      setAvatar.mutate({ mediaKey: uploaded.mediaKey });
    }
    event.target.value = "";
  };

  const pickBanner = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await bannerUpload.uploadFile(file);
    if (uploaded) {
      setCustomization((old) => ({
        ...old,
        flags: { ...old.flags, hasBanner: true, hasBannerMedia: true },
        assets: {
          ...old.assets,
          bannerUrl: uploaded.previewUrl,
          bannerMedia: { kind: "image", imageUrl: uploaded.previewUrl },
        },
        bannerValue: { ...old.bannerValue, url: uploaded.previewUrl },
      }));
      setBanner.mutate({ mediaKey: uploaded.mediaKey });
    }
    event.target.value = "";
  };

  const openEditor = () => {
    setName(profile.displayName);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.customization.assets.animatedAvatarUrl ?? null);
    setCustomization(profile.customization);
    const initialEquipped = overview.data?.equipped ?? null;
    setCommittedEquipped(initialEquipped);
    setOptimisticEquipped(initialEquipped);
    setTrialItemId(null);
    setEditing(null);
    setMessage(null);
    setPanel("profile");
    setOpen(true);
  };

  const renderGroup = (title: string, items: ShopItemView[]) => {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <AssetGrid items={items} equipped={equipped} busy={busy} onApply={apply} onClear={clear} />
      </section>
    );
  };

  const activePanel = PANELS.find((entry) => entry.id === panel) ?? PANELS[0];

  return (
    <>
      <ProfileEditTrigger variant={triggerVariant} onClick={openEditor} />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        className="profile-editor-dialog max-w-[1240px] overflow-hidden p-0"
      >
        <div className="profile-editor-layout">
          <aside className="profile-editor-sidebar">
            <p className="profile-editor-title">Редактор профиля</p>
            <nav className="profile-editor-tabs" aria-label="Разделы редактора">
              {PANELS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setPanel(entry.id);
                    setEditing(null);
                  }}
                  aria-current={panel === entry.id ? "page" : undefined}
                  className={cn("profile-editor-tab", panel === entry.id && "profile-editor-tab--active")}
                >
                  <span>
                    <span className="block text-sm font-medium">{entry.label}</span>
                    <span className="profile-editor-tab__hint">{entry.hint}</span>
                  </span>
                  <ChevronRight className="hidden h-4 w-4 opacity-40 lg:block" />
                </button>
              ))}
            </nav>
            <ProfileEditorShopLink onNavigate={onNavigate} onBeforeNavigate={() => setOpen(false)} />
          </aside>

          <main className="profile-editor-main voople-scroll">
            <div className="profile-editor-content">
              <div className="profile-editor-preview-column">
                <ProfileEditorPreview
                  profile={profile}
                  customization={previewCustomization}
                  avatarUrl={avatarUrl}
                  name={name}
                  bio={bio}
                  editing={editing}
                  onEditingChange={(next) => {
                    setPanel("profile");
                    setEditing(next);
                  }}
                  onNameChange={setName}
                  onBioChange={setBio}
                  onAvatarClick={() => setPanel("avatar")}
                />
                <p className="mt-3 text-xs leading-5 text-[var(--app-muted)]">
                  Это та же структура карточки, которая используется на странице профиля.
                  Изменения ассетов появляются здесь сразу.
                </p>
              </div>

              <section className="profile-editor-controls">
                <header className="pr-10">
                  <h2 className="text-xl font-semibold">{activePanel.label}</h2>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">{activePanel.hint}</p>
                </header>

                {panel === "profile" ? (
                  <div className="mt-5 space-y-4">
                    <label className="block space-y-1.5 text-sm">
                      <span className="font-medium">Отображаемое имя</span>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={50}
                        className="profile-editor-input"
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm">
                      <span className="font-medium">О себе</span>
                      <textarea
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        maxLength={100}
                        rows={4}
                        className="profile-editor-input resize-none"
                      />
                      <span className="block text-right text-xs text-[var(--app-muted)]">{bio.length}/100</span>
                    </label>
                  </div>
                ) : null}

                {panel === "avatar" ? (
                  <div className="mt-5 space-y-6">
                    <section className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          disabled={avatarUpload.isUploading || setAvatar.isPending}
                          onClick={() => avatarInput.current?.click()}
                        >
                          {avatarUpload.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Загрузить аватар
                        </Button>
                        <input
                          ref={avatarInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={pickAvatar}
                        />
                      </div>
                      <AvatarHistoryPicker
                        avatars={history.data}
                        hasVooplePlus={Boolean(profile.hasVooplePlus)}
                        pending={selectAvatar.isPending}
                        onSelect={(key) => selectAvatar.mutate({ key })}
                      />
                    </section>
                    {AVATAR_GROUPS.map((group) =>
                      renderGroup(group.title, panelItems.filter((item) => item.kind === group.kind)),
                    )}
                  </div>
                ) : null}

                {panel === "banner" ? (
                  <div className="mt-5 space-y-6">
                    <section className="profile-editor-plus-zone space-y-3 rounded-2xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Своё изображение</h3><VooplePlusBadge locked={!profile.hasVooplePlus} /></div>
                          <p className="mt-1 text-xs text-[var(--app-muted)]">PNG, JPEG, WebP или GIF. Рекомендуемое соотношение 8:3.</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!profile.hasVooplePlus || bannerUpload.isUploading || setBanner.isPending}
                          onClick={() => bannerInput.current?.click()}
                        >
                          <ImagePlus className="h-4 w-4" />
                          Загрузить
                        </Button>
                      </div>
                      <input
                        ref={bannerInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={pickBanner}
                      />
                      {!profile.hasVooplePlus ? (
                        <p className="text-xs text-[var(--app-muted)]">С Вупл+ можно загрузить собственное изображение или рисунок для баннера.</p>
                      ) : null}
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">Основа карточки</h3>
                        {equipped?.cardBaseMode && equipped.cardBaseMode !== "mirror" ? (
                          <button type="button" className="profile-editor-reset" onClick={() => clear("card_base_mode")}>
                            <RotateCcw className="h-3.5 w-3.5" /> Сбросить
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {BASE_MODES.map((mode) => {
                          const active = (equipped?.cardBaseMode ?? "mirror") === mode.id;
                          const locked = mode.premium && !profile.hasVooplePlus;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              disabled={busy}
                              aria-pressed={active}
                              onClick={() => updatePreview({ cardBaseMode: mode.id }, locked)}
                              className={cn("profile-editor-choice", active && "profile-editor-choice--active")}
                            >
                              {mode.label}{locked ? " · Voople+" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    {BANNER_GROUPS.map((group) =>
                      renderGroup(group.title, panelItems.filter((item) => item.kind === group.kind)),
                    )}
                  </div>
                ) : null}

                {panel === "frame" ? (
                  <div className="mt-5 space-y-6">
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Базовые рамки</h3>
                          <p className="mt-1 text-xs text-[var(--app-muted)]">Slate и Стекло доступны без подписки и покупки.</p>
                        </div>
                        {equipped?.profileFrameId ? (
                          <button type="button" className="profile-editor-reset" onClick={() => clear("profile_frame_id")}>
                            <RotateCcw className="h-3.5 w-3.5" /> Без рамки
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {Object.values(FRAME_PRESETS).map((preset) => {
                          const active = equipped?.profileFrameId === preset.id;
                          const locked = Boolean((preset.isPremium || preset.usesCustomColor) && !profile.hasVooplePlus);
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              disabled={busy}
                              aria-pressed={active}
                              onClick={() => updatePreview({ profileFrameId: preset.id }, locked)}
                              className={cn("profile-editor-frame-choice", active && "profile-editor-frame-choice--active")}
                            >
                              <span
                                className="profile-editor-frame-choice__swatch"
                                style={{
                                  background:
                                    preset.kind === "gradient"
                                      ? `linear-gradient(135deg, ${preset.colors.join(", ")})`
                                      : preset.colors[0],
                                  boxShadow: preset.kind === "glow" ? `0 0 16px ${preset.colors[1] ?? preset.colors[0]}` : undefined,
                                }}
                              />
                              <span className="mt-2 block text-sm font-medium">{preset.name}</span>
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-[var(--app-muted)]">{locked ? <VooplePlusBadge locked /> : active ? "Выбрано" : "Применить"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    {renderGroup("Рамки из магазина", panelItems)}
                  </div>
                ) : null}

                {panel === "feed" ? (
                  <div className="mt-5 space-y-6">
                    <FeedBadgePreview
                      customization={previewCustomization}
                      avatarUrl={avatarUrl}
                      name={name}
                    />
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Оформление автора</h3>
                          <p className="mt-1 text-xs text-[var(--app-muted)]">
                            Бейдж отображается в шапке ваших публикаций и не зависит от светлой или тёмной темы.
                          </p>
                        </div>
                        {equipped?.feedCardStyleId ? (
                          <button
                            type="button"
                            className="profile-editor-reset"
                            onClick={() => clear("feed_card_style_id")}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Без бейджа
                          </button>
                        ) : null}
                      </div>
                      <AssetGrid
                        items={panelItems}
                        equipped={equipped}
                        busy={busy}
                        onApply={apply}
                        onClear={clear}
                      />
                    </section>
                  </div>
                ) : null}

                {panel === "name" ? (
                  <div className="mt-5 space-y-6">
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Шрифт</h3><VooplePlusBadge locked={!profile.hasVooplePlus} /></div>
                          <p className="mt-1 text-xs text-[var(--app-muted)]">Варианты Вупл+ можно примерить до подписки.</p>
                        </div>
                        {equipped && (equipped.nicknameColor || equipped.nicknameFont !== "sans" || equipped.nicknameEffect !== "plain") ? (
                          <button type="button" className="profile-editor-reset" onClick={() => clear("nickname_style")}>
                            <RotateCcw className="h-3.5 w-3.5" /> Сбросить
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {NICKNAME_FONTS.map((font) => {
                          const active = (equipped?.nicknameFont ?? "sans") === font.id;
                          const locked = font.id !== "sans" && !profile.hasVooplePlus;
                          const sample = displayNamePresentation({
                            color: equipped?.nicknameColor,
                            gradient: false,
                            font: font.id,
                            effect: "plain",
                          });
                          return (
                            <button
                              key={font.id}
                              type="button"
                              disabled={busy}
                              aria-pressed={active}
                              onClick={() => updatePreview({ nicknameFont: font.id }, locked)}
                              className={cn("profile-editor-name-effect", active && "profile-editor-name-effect--active")}
                              title={font.label}
                            >
                              <span className="text-xl font-semibold" style={sample.style}>{font.sample}</span>
                              <span className="mt-1 block text-[11px] text-[var(--app-muted)]">{font.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Эффект</h3>
                        <p className="mt-1 text-xs text-[var(--app-muted)]">Эффект сразу виден на полноценной карточке слева.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {NICKNAME_EFFECTS.map((effect) => {
                          const active = (equipped?.nicknameEffect ?? (equipped?.nicknameGradient ? "gradient" : "plain")) === effect.id;
                          const locked = effect.id !== "plain" && !profile.hasVooplePlus;
                          const sample = displayNamePresentation({
                            color: equipped?.nicknameColor ?? "#a78bfa",
                            gradient: effect.id === "gradient",
                            font: (equipped?.nicknameFont as NicknameFont | undefined) ?? "sans",
                            effect: effect.id,
                          });
                          return (
                            <button
                              key={effect.id}
                              type="button"
                              disabled={busy}
                              aria-pressed={active}
                              onClick={() => updatePreview({ nicknameEffect: effect.id, nicknameGradient: effect.id === "gradient" }, locked)}
                              className={cn("profile-editor-name-effect", active && "profile-editor-name-effect--active")}
                            >
                              <span className={sample.className} style={sample.style}>{effect.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold">Цвет</h3>
                        <p className="mt-1 text-xs text-[var(--app-muted)]">
                          Базовая палитра доступна всем. Точный оттенок можно примерить с Voople+.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          aria-label="Цвет темы"
                          aria-pressed={!equipped?.nicknameColor}
                          onClick={() => updatePreview({ nicknameColor: null })}
                          className={cn(
                            "grid h-10 w-10 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]",
                            !equipped?.nicknameColor && "ring-2 ring-[var(--theme-accent)]",
                          )}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        {FREE_NICKNAME_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            disabled={busy}
                            aria-label={`Цвет имени ${color}`}
                            aria-pressed={equipped?.nicknameColor?.toLowerCase() === color}
                            onClick={() => updatePreview({ nicknameColor: color })}
                            className={cn(
                              "h-10 w-10 rounded-xl border border-black/10 shadow-inner transition hover:scale-105",
                              equipped?.nicknameColor?.toLowerCase() === color && "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--app-surface)]",
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <label
                          className={cn(
                            "relative grid h-10 min-w-24 cursor-pointer place-items-center overflow-hidden rounded-xl border border-[var(--app-border)] px-3 text-xs font-medium",
                            !profile.hasVooplePlus && "after:absolute after:inset-0 after:bg-[color-mix(in_srgb,var(--app-surface)_30%,transparent)]",
                          )}
                          style={{
                            background: `linear-gradient(120deg, ${equipped?.nicknameColor ?? "#8b5cf6"}, #22d3ee)`,
                            color: "#fff",
                          }}
                        >
                          Свой цвет
                          <input
                            type="color"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            value={equipped?.nicknameColor ?? "#8b5cf6"}
                            onChange={(event) => updatePreview(
                              { nicknameColor: event.target.value },
                              !profile.hasVooplePlus,
                            )}
                          />
                        </label>
                      </div>
                    </section>
                  </div>
                ) : null}

                {panel !== "profile" && panelItems.length === 0 && panel !== "frame" && panel !== "name" ? (
                  <p className="mt-5 rounded-xl border border-dashed border-[var(--app-border)] p-4 text-sm text-[var(--app-muted)]">
                    В этой категории пока нет предметов. Их можно добавить через магазин или админку.
                  </p>
                ) : null}

                <div className="profile-editor-footer">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={save.isPending}
                    onClick={() => save.mutate({ displayName: name.trim() || profile.displayName, bio: bio.trim() || null })}
                  >
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Сохранить профиль
                  </Button>
                  {message ? <p className="mt-2 text-center text-sm text-[var(--app-muted)]">{message}</p> : null}
                  {save.error ? <p className="mt-2 text-center text-sm text-red-400">{save.error.message}</p> : null}
                  {avatarUpload.error || bannerUpload.error ? (
                    <p className="mt-2 text-center text-sm text-red-400">{avatarUpload.error ?? bannerUpload.error}</p>
                  ) : null}
                </div>
              </section>
            </div>
          </main>
        </div>
      </Sheet>
    </>
  );
}
