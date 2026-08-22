"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { GroupCommunityView, GroupCustomizationInput } from "@/types/chat";
import { reportProductEvent } from "@/lib/telemetry/client";

import { GroupAvatar } from "./GroupAvatar";
import { GroupIdentityPerksEditor } from "./GroupIdentityPerksEditor";
import { GroupRoleStylesEditor } from "./GroupRoleStylesEditor";

const DEFAULT_ACCENT = "#8b7bd8";

type Props = {
  canManage: boolean;
  groupName: string;
  load: () => Promise<GroupCommunityView>;
  save: (input: GroupCustomizationInput) => Promise<GroupCommunityView>;
  uploadAvatar?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  uploadBanner?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  onChanged?: () => void;
};

export function GroupCommunityPanel({
  canManage,
  groupName,
  load,
  save,
  uploadAvatar,
  uploadBanner,
  onChanged,
}: Props) {
  const [community, setCommunity] = useState<GroupCommunityView | null>(null);
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [tag, setTag] = useState("");
  const [vanityInviteSlug, setVanityInviteSlug] = useState("");
  const [roleColors, setRoleColors] = useState({ owner: "#f59e0b", admin: "#8b7bd8", member: "#94a3b8" });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<"save" | "avatar" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load()
      .then((value) => {
        if (!active) return;
        setCommunity(value);
        setDescription(value.description ?? "");
        setIcon(value.icon ?? "");
        setPublicSlug(value.publicSlug ?? "");
        setAccentColor(value.accentColor ?? DEFAULT_ACCENT);
        setTag(value.tag ?? "");
        setVanityInviteSlug(value.vanityInviteSlug ?? "");
        setRoleColors({
          owner: value.roleColors.owner ?? "#f59e0b",
          admin: value.roleColors.admin ?? "#8b7bd8",
          member: value.roleColors.member ?? "#94a3b8",
        });
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Не удалось загрузить оформление группы");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const draft = (media?: Pick<GroupCustomizationInput, "avatarKey" | "bannerKey">): GroupCustomizationInput => ({
    description: description.trim() || null,
    icon: icon.trim() || null,
    publicSlug: publicSlug.trim().toLowerCase() || null,
    accentColor: community?.boostUnlocksAccent ? accentColor : community?.accentColor ?? null,
    tag: tag.trim().toUpperCase() || null,
    vanityInviteSlug: vanityInviteSlug.trim().toLowerCase() || null,
    roleColors: community?.boostUnlocksRoleStyles
      ? roleColors
      : community?.roleColors ?? { owner: null, admin: null, member: null },
    ...media,
  });

  const persist = async (kind: "save" | "avatar" | "banner", media?: Pick<GroupCustomizationInput, "avatarKey" | "bannerKey">) => {
    if (pending || !community) return null;
    setPending(kind);
    setError(null);
    try {
      const value = await save(draft(media));
      setCommunity(value);
      reportProductEvent("appearance_changed", { surface: "group_settings" });
      onChanged?.();
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить оформление");
      return null;
    } finally {
      setPending(null);
    }
  };

  const changeMedia = async (kind: "avatar" | "banner", file: File) => {
    const upload = kind === "avatar" ? uploadAvatar : uploadBanner;
    if (!upload || pending || !community) return;
    setPending(kind);
    setError(null);
    try {
      const uploaded = await upload(file);
      const media = kind === "avatar" ? { avatarKey: uploaded.mediaKey } : { bannerKey: uploaded.mediaKey };
      const value = await save(draft(media));
      setCommunity(kind === "avatar"
        ? { ...value, avatarUrl: uploaded.previewUrl }
        : { ...value, bannerUrl: uploaded.previewUrl, effectiveBannerUrl: uploaded.previewUrl });
      reportProductEvent("appearance_changed", { kind, surface: "group_settings" });
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить оформление группы");
    } finally {
      setPending(null);
    }
  };

  if (loading) return <div className="mt-4 h-32 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />;
  if (!community) return error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null;

  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] p-3" aria-labelledby="group-community-title">
      <div className="flex items-start gap-3">
        <GroupAvatar name={groupName} avatarUrl={community.avatarUrl} icon={icon} accentColor={community.effectiveAccentColor} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="group-community-title" className="text-sm font-medium">Оформление сообщества</h3>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
            Баннер, аватар, описание и визуальные особенности группы.
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 space-y-3">
          <GroupIdentityPerksEditor
            community={community}
            pending={pending}
            tag={tag}
            uploadAvatar={uploadAvatar}
            uploadBanner={uploadBanner}
            onTagChange={setTag}
            onAvatarFile={(file) => void changeMedia("avatar", file)}
            onBannerFile={(file) => void changeMedia("banner", file)}
            onRemoveAvatar={() => void persist("avatar", { avatarKey: null })}
            onRemoveBanner={() => void persist("banner", { bannerKey: null })}
          />
          <label className="block text-xs font-medium">Иконка<input value={icon} onChange={(event) => setIcon(event.target.value.slice(0, 16))} className="voople-input mt-1 w-full" placeholder="Например, 🎮" /></label>
          <label className="block text-xs font-medium">Публичный адрес
            <div className="voople-input mt-1 flex items-center gap-1 focus-within:ring-2 focus-within:ring-[var(--theme-accent)]"><span className="text-[var(--app-muted)]">@</span><input value={publicSlug} onChange={(event) => setPublicSlug(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32))} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="my_group" minLength={5} maxLength={32} aria-label="Публичный адрес группы" /></div>
            <span className="mt-1 block font-normal text-[11px] text-[var(--app-muted)]">Используется в глобальном поиске открытых групп.</span>
          </label>
          <label className="block text-xs font-medium">Красивый адрес приглашения
            <div className="voople-input mt-1 flex items-center gap-1 focus-within:ring-2 focus-within:ring-[var(--theme-accent)]"><span className="text-[var(--app-muted)]">/invite/</span><input value={vanityInviteSlug} disabled={!community.boostUnlocksVanityInvite} onChange={(event) => setVanityInviteSlug(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32))} className="min-w-0 flex-1 bg-transparent outline-none disabled:opacity-50" placeholder="my_group" minLength={5} maxLength={32} aria-label="Постоянная ссылка-приглашение" /></div>
            <span className="mt-1 block font-normal text-[11px] text-[var(--app-muted)]">{community.boostUnlocksVanityInvite ? "Короткий vanity-адрес активен, пока доступен perk." : "Обычная постоянная ссылка доступна всем. Запоминающийся адрес — Boost-перк."}</span>
          </label>
          <GroupRoleStylesEditor enabled={community.boostUnlocksRoleStyles} value={roleColors} onChange={setRoleColors} />
          <label className="block text-xs font-medium">Описание<textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 160))} className="voople-input mt-1 min-h-20 w-full resize-none" placeholder="О чём эта группа" /></label>
          <label className="flex items-center justify-between gap-3 text-xs font-medium">Цвет группы<input type="color" value={accentColor} disabled={!community.boostUnlocksAccent} onChange={(event) => setAccentColor(event.target.value)} className="h-9 w-14 rounded-lg border border-[var(--app-border)] bg-transparent p-1 disabled:opacity-40" aria-label="Цвет группы" /></label>
          <Button type="button" variant="secondary" className="w-full" disabled={Boolean(pending)} onClick={() => void persist("save")}>
            {pending === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Сохранить оформление
          </Button>
        </div>
      ) : community.description ? <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{community.description}</p> : null}

      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
