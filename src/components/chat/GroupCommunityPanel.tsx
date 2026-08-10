"use client";

import { Camera, LoaderCircle, Rocket, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { GroupCommunityView } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";

const DEFAULT_ACCENT = "#8b7bd8";

type CustomizationInput = {
  description: string | null;
  icon: string | null;
  publicSlug: string | null;
  accentColor: string | null;
  avatarKey?: string | null;
};

type Props = {
  canManage: boolean;
  groupName: string;
  load: () => Promise<GroupCommunityView>;
  save: (input: CustomizationInput) => Promise<GroupCommunityView>;
  setBoost: (enabled: boolean) => Promise<GroupCommunityView>;
  uploadAvatar?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  onChanged?: () => void;
};

export function GroupCommunityPanel({
  canManage,
  groupName,
  load,
  save,
  setBoost,
  uploadAvatar,
  onChanged,
}: Props) {
  const [community, setCommunity] = useState<GroupCommunityView | null>(null);
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<"save" | "boost" | "avatar" | null>(null);
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

  const draft = (avatarKey?: string | null): CustomizationInput => ({
    description: description.trim() || null,
    icon: icon.trim() || null,
    publicSlug: publicSlug.trim().toLowerCase() || null,
    accentColor: community?.boostUnlocksAccent ? accentColor : null,
    ...(avatarKey !== undefined ? { avatarKey } : {}),
  });

  const persist = async (kind: "save" | "avatar", avatarKey?: string | null) => {
    if (pending || !community) return null;
    setPending(kind);
    setError(null);
    try {
      const value = await save(draft(avatarKey));
      setCommunity(value);
      onChanged?.();
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить оформление");
      return null;
    } finally {
      setPending(null);
    }
  };

  const changeAvatar = async (file: File) => {
    if (!uploadAvatar || pending || !community) return;
    setPending("avatar");
    setError(null);
    try {
      const uploaded = await uploadAvatar(file);
      const value = await save(draft(uploaded.mediaKey));
      setCommunity({ ...value, avatarUrl: uploaded.previewUrl });
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить аватарку");
    } finally {
      setPending(null);
    }
  };

  const toggleBoost = async () => {
    if (pending || !community) return;
    setPending("boost");
    setError(null);
    try {
      setCommunity(await setBoost(!community.boostedByMe));
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить буст");
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
          <h3 id="group-community-title" className="text-sm font-medium">Оформление и бусты</h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
            {community.boostCount} активных бустов. Первый открывает собственный цвет группы.
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 space-y-3">
          {uploadAvatar ? (
            <div className="flex items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 text-xs font-medium transition hover:border-[var(--app-border-strong)]">
                {pending === "avatar" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Выбрать аватарку
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={Boolean(pending)} onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void changeAvatar(file);
                }} />
              </label>
              {community.avatarUrl ? (
                <button type="button" onClick={() => void persist("avatar", null)} disabled={Boolean(pending)} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50" aria-label="Удалить аватарку группы">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ) : null}
          <label className="block text-xs font-medium">Иконка<input value={icon} onChange={(event) => setIcon(event.target.value.slice(0, 16))} className="voople-input mt-1 w-full" placeholder="Например, 🎮" /></label>
          <label className="block text-xs font-medium">Публичный адрес
            <div className="voople-input mt-1 flex items-center gap-1 focus-within:ring-2 focus-within:ring-[var(--theme-accent)]"><span className="text-[var(--app-muted)]">@</span><input value={publicSlug} onChange={(event) => setPublicSlug(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32))} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="my_group" minLength={5} maxLength={32} aria-label="Публичный адрес группы" /></div>
            <span className="mt-1 block font-normal text-[11px] text-[var(--app-muted)]">Используется в глобальном поиске открытых групп.</span>
          </label>
          <label className="block text-xs font-medium">Описание<textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 160))} className="voople-input mt-1 min-h-20 w-full resize-none" placeholder="О чём эта группа" /></label>
          <label className="flex items-center justify-between gap-3 text-xs font-medium">Цвет группы<input type="color" value={accentColor} disabled={!community.boostUnlocksAccent} onChange={(event) => setAccentColor(event.target.value)} className="h-9 w-14 rounded-lg border border-[var(--app-border)] bg-transparent p-1 disabled:opacity-40" aria-label="Цвет группы" /></label>
          {!community.boostUnlocksAccent ? <p className="text-[11px] text-[var(--app-muted)]">Цвет станет доступен после первого активного буста.</p> : null}
          <Button type="button" variant="secondary" className="w-full" disabled={Boolean(pending)} onClick={() => void persist("save")}>
            {pending === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Сохранить оформление
          </Button>
        </div>
      ) : community.description ? <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{community.description}</p> : null}

      <Button type="button" className="mt-3 w-full" variant={community.boostedByMe ? "secondary" : undefined} disabled={Boolean(pending) || (!community.canBoost && !community.boostedByMe)} onClick={() => void toggleBoost()}>
        {pending === "boost" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{community.boostedByMe ? "Снять мой буст" : "Бустить группу"}
      </Button>
      {!community.canBoost && !community.boostedByMe ? <p className="mt-2 text-[11px] leading-4 text-[var(--app-muted)]">Один буст входит в активную подписку Voople+. При переносе он снимается с прошлой группы.</p> : null}
      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
