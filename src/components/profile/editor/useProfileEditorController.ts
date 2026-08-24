"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMediaUpload } from "@/hooks/useMediaUpload";
import { trpc } from "@/lib/trpc/client";
import { reportProductEvent } from "@/lib/telemetry/client";
import type { ProfileCustomizationView, ProfileViewModel } from "@/types/domain";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";

import {
  clearProfileSlot,
  customizationFromEquipped,
  equipProfileItem,
} from "./profile-editor-customization";
import type {
  EditorCustomizationPatch,
  ProfileEditorGroupTag,
  ProfileEditorPanel,
} from "./profile-editor-models";

type EditorDraft = { name: string; bio: string };

function initialDraft(profile: ProfileViewModel): EditorDraft {
  return { name: profile.displayName, bio: profile.bio ?? "" };
}

function selectedTagFromProfile(profile: ProfileViewModel): ProfileEditorGroupTag | null {
  if (!profile.groupTag) return null;
  return {
    ...profile.groupTag,
    avatarUrl: null,
    bannerUrl: null,
    memberCount: 0,
  };
}

export function useProfileEditorController({
  profile,
  onUpdated,
}: {
  profile: ProfileViewModel;
  onUpdated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [panel, setPanel] = useState<ProfileEditorPanel>("profile");
  const [editing, setEditing] = useState<"name" | "bio" | null>(null);
  const [draft, setDraft] = useState(() => initialDraft(profile));
  const [savedDraft, setSavedDraft] = useState(() => initialDraft(profile));
  const [avatarUrl, setAvatarUrl] = useState(profile.customization.assets.animatedAvatarUrl ?? null);
  const [customization, setCustomization] = useState(profile.customization);
  const [optimisticEquipped, setOptimisticEquipped] = useState<EquippedCustomizationView | null>(null);
  const [committedEquipped, setCommittedEquipped] = useState<EquippedCustomizationView | null>(null);
  const [trialItemId, setTrialItemId] = useState<string | null>(null);
  const [selectedGroupTag, setSelectedGroupTag] = useState<ProfileEditorGroupTag | null>(() => selectedTagFromProfile(profile));
  const [message, setMessage] = useState<string | null>(null);
  const [cosmeticBusy, setCosmeticBusy] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const editorSession = useRef(0);
  const cosmeticBusyRef = useRef(false);
  const tagBusyRef = useRef(false);
  const committedRef = useRef<EquippedCustomizationView | null>(null);
  const customizationRef = useRef(profile.customization);
  const utils = trpc.useUtils();

  const overview = trpc.shop.overview.useQuery(undefined, { enabled: open });
  const history = trpc.customization.avatarHistory.useQuery(undefined, { enabled: open });
  const chats = trpc.chat.list.useQuery(undefined, { enabled: open, staleTime: 5_000 });
  const avatarUpload = useMediaUpload("avatar");
  const bannerUpload = useMediaUpload("banner");

  const saveMutation = trpc.profile.update.useMutation();
  const equipMutation = trpc.customization.equip.useMutation();
  const clearMutation = trpc.customization.clearSlot.useMutation();
  const updateMutation = trpc.customization.update.useMutation();
  const setAvatarMutation = trpc.customization.setAvatarPhoto.useMutation();
  const setBannerMutation = trpc.customization.setCustomBanner.useMutation();
  const selectAvatarMutation = trpc.customization.selectAvatarFromHistory.useMutation();
  const setGroupTagMutation = trpc.chat.setGroupProfileTag.useMutation();

  const refresh = useCallback(async () => {
    await Promise.all([
      utils.profile.getByUsername.invalidate({ username: profile.username }),
      utils.shop.overview.invalidate(),
      utils.customization.getEquipped.invalidate(),
    ]);
    onUpdated?.();
  }, [onUpdated, profile.username, utils]);

  const syncPreview = useCallback((next: EquippedCustomizationView) => {
    setOptimisticEquipped(next);
    setCustomization((old) => {
      const resolved = customizationFromEquipped(next, old);
      customizationRef.current = resolved;
      return resolved;
    });
  }, []);

  const commitPreview = useCallback((next: EquippedCustomizationView) => {
    committedRef.current = next;
    setCommittedEquipped(next);
    setTrialItemId(null);
    syncPreview(next);
  }, [syncPreview]);

  const restoreCommittedPreview = useCallback(() => {
    const next = committedRef.current ?? overview.data?.equipped;
    if (next) syncPreview(next);
    setTrialItemId(null);
  }, [overview.data?.equipped, syncPreview]);

  useEffect(() => {
    if (!open || !overview.data?.equipped || committedRef.current) return;
    committedRef.current = overview.data.equipped;
    setCommittedEquipped(overview.data.equipped);
    setOptimisticEquipped(overview.data.equipped);
    setCustomization((old) => {
      const resolved = customizationFromEquipped(overview.data.equipped, old);
      customizationRef.current = resolved;
      return resolved;
    });
  }, [open, overview.data?.equipped]);

  const runCosmeticMutation = useCallback(async (
    optimistic: EquippedCustomizationView,
    operation: () => Promise<EquippedCustomizationView>,
    successMessage = "Изменение сохранено",
  ) => {
    if (cosmeticBusyRef.current) return;
    const session = editorSession.current;
    cosmeticBusyRef.current = true;
    setCosmeticBusy(true);
    setMessage(null);
    syncPreview(optimistic);
    try {
      const next = await operation();
      if (session !== editorSession.current) return;
      commitPreview(next);
      setMessage(successMessage);
      await refresh();
    } catch (error) {
      if (session !== editorSession.current) return;
      restoreCommittedPreview();
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить оформление");
    } finally {
      cosmeticBusyRef.current = false;
      setCosmeticBusy(false);
    }
  }, [commitPreview, refresh, restoreCommittedPreview, syncPreview]);

  const allItems = useMemo(
    () => (overview.data?.items ?? []).filter((item) => item.kind !== "effect" && item.kind !== "nickname_style"),
    [overview.data?.items],
  );

  const groupTags = useMemo<ProfileEditorGroupTag[]>(() =>
    (chats.data ?? [])
      .filter((chat) => chat.type === "group" && !chat.parentChatId && Boolean(chat.groupTag))
      .map((chat) => ({
        chatId: chat.id,
        tag: chat.groupTag!,
        groupName: chat.name ?? "Сообщество",
        accentColor: chat.groupAccentColor,
        avatarUrl: chat.groupAvatarUrl,
        bannerUrl: chat.groupBannerUrl,
        memberCount: chat.memberCount,
      })),
  [chats.data]);

  const equipped = optimisticEquipped ?? committedEquipped ?? overview.data?.equipped ?? null;
  const hydratedGroupTag = selectedGroupTag
    ? groupTags.find((tag) => tag.chatId === selectedGroupTag.chatId) ?? selectedGroupTag
    : null;
  const previewCustomization = !optimisticEquipped && overview.data?.equipped
    ? customizationFromEquipped(overview.data.equipped, customization)
    : customization;
  const dirty = draft.name !== savedDraft.name || draft.bio !== savedDraft.bio;

  const openEditor = useCallback(() => {
    const nextDraft = initialDraft(profile);
    editorSession.current += 1;
    committedRef.current = null;
    customizationRef.current = profile.customization;
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
    setAvatarUrl(profile.customization.assets.animatedAvatarUrl ?? null);
    setCustomization(profile.customization);
    setCommittedEquipped(null);
    setOptimisticEquipped(null);
    setSelectedGroupTag(selectedTagFromProfile(profile));
    setTrialItemId(null);
    setEditing(null);
    setMessage(null);
    setPanel("profile");
    setOpen(true);
  }, [profile]);

  const closeEditor = useCallback((force = false) => {
    if (!force && dirty) {
      setDiscardOpen(true);
      return;
    }
    editorSession.current += 1;
    setDiscardOpen(false);
    setOpen(false);
  }, [dirty]);

  const saveProfile = useCallback(async () => {
    if (!dirty || saveMutation.isPending) return;
    const next = { displayName: draft.name.trim() || profile.displayName, bio: draft.bio.trim() || null };
    const session = editorSession.current;
    setMessage(null);
    try {
      await saveMutation.mutateAsync(next);
      if (session !== editorSession.current) return;
      const saved = { name: next.displayName, bio: next.bio ?? "" };
      setDraft(saved);
      setSavedDraft(saved);
      setEditing(null);
      setMessage("Имя и описание сохранены");
      await refresh();
    } catch (error) {
      if (session !== editorSession.current) return;
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить профиль");
    }
  }, [dirty, draft.bio, draft.name, profile.displayName, refresh, saveMutation]);

  const applyItem = useCallback((item: ShopItemView) => {
    const base = committedRef.current ?? overview.data?.equipped;
    if (!base) return;
    if (!item.owned) {
      if (trialItemId === item.id) {
        restoreCommittedPreview();
        setMessage(null);
        return;
      }
      setTrialItemId(item.id);
      syncPreview(equipProfileItem(base, item));
      reportProductEvent("cosmetic_previewed", { itemKind: item.kind, surface: "profile_editor" });
      setMessage("Это примерка. Получите предмет в магазине, чтобы надеть его.");
      return;
    }
    setTrialItemId(null);
    void runCosmeticMutation(equipProfileItem(base, item), async () => {
      const next = await equipMutation.mutateAsync({ itemId: item.id });
      reportProductEvent("cosmetic_equipped", { surface: "profile_editor" });
      return next;
    });
  }, [equipMutation, overview.data?.equipped, restoreCommittedPreview, runCosmeticMutation, syncPreview, trialItemId]);

  const clearSlot = useCallback((slot: ShopItemView["equipSlot"] | "card_base_mode") => {
    const base = committedRef.current ?? overview.data?.equipped;
    if (!base) return;
    void runCosmeticMutation(clearProfileSlot(base, slot), () => clearMutation.mutateAsync({ slot }));
  }, [clearMutation, overview.data?.equipped, runCosmeticMutation]);

  const previewPatch = useCallback((patch: EditorCustomizationPatch, premium = false) => {
    const base = committedRef.current ?? overview.data?.equipped;
    if (!base) return;
    setTrialItemId(premium ? "premium-feature" : null);
    syncPreview({ ...base, ...patch });
    if (premium) setMessage("Это примерка Вупл+. Подпишитесь, чтобы сохранить изменение.");
  }, [overview.data?.equipped, syncPreview]);

  const commitPatch = useCallback((patch: EditorCustomizationPatch, premium = false) => {
    const base = committedRef.current ?? overview.data?.equipped;
    if (!base) return;
    if (premium) {
      previewPatch(patch, true);
      return;
    }
    setTrialItemId(null);
    void runCosmeticMutation({ ...base, ...patch }, () => updateMutation.mutateAsync(patch));
  }, [overview.data?.equipped, previewPatch, runCosmeticMutation, updateMutation]);

  const pickAvatar = useCallback(async (file: File) => {
    const session = editorSession.current;
    const previous = avatarUrl;
    const uploaded = await avatarUpload.uploadFile(file);
    if (!uploaded || session !== editorSession.current) return;
    setAvatarUrl(uploaded.previewUrl);
    try {
      await setAvatarMutation.mutateAsync({ mediaKey: uploaded.mediaKey });
      if (session !== editorSession.current) return;
      await refresh();
    } catch (error) {
      setAvatarUrl(previous);
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить аватар");
    }
  }, [avatarUpload, avatarUrl, refresh, setAvatarMutation]);

  const pickBanner = useCallback(async (file: File) => {
    const session = editorSession.current;
    const previous = customizationRef.current;
    const uploaded = await bannerUpload.uploadFile(file);
    if (!uploaded || session !== editorSession.current) return;
    const optimistic: ProfileCustomizationView = {
      ...previous,
      flags: { ...previous.flags, hasBanner: true, hasBannerMedia: true },
      assets: { ...previous.assets, bannerUrl: uploaded.previewUrl, bannerMedia: { kind: "image", imageUrl: uploaded.previewUrl } },
      bannerValue: { ...previous.bannerValue, url: uploaded.previewUrl },
    };
    customizationRef.current = optimistic;
    setCustomization(optimistic);
    try {
      const next = await setBannerMutation.mutateAsync({ mediaKey: uploaded.mediaKey });
      if (session !== editorSession.current) return;
      commitPreview(next);
      await refresh();
    } catch (error) {
      customizationRef.current = previous;
      setCustomization(previous);
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить баннер");
    }
  }, [bannerUpload, commitPreview, refresh, setBannerMutation]);

  const selectAvatar = useCallback(async (key: string) => {
    const session = editorSession.current;
    try {
      const avatar = await selectAvatarMutation.mutateAsync({ key });
      if (session !== editorSession.current) return;
      setAvatarUrl(avatar.url);
      await Promise.all([history.refetch(), refresh()]);
    } catch (error) {
      if (session !== editorSession.current) return;
      setMessage(error instanceof Error ? error.message : "Не удалось выбрать аватар");
    }
  }, [history, refresh, selectAvatarMutation]);

  const selectGroupTag = useCallback(async (tag: ProfileEditorGroupTag | null) => {
    if (tagBusyRef.current) return;
    const session = editorSession.current;
    const previous = selectedGroupTag;
    tagBusyRef.current = true;
    setTagBusy(true);
    setSelectedGroupTag(tag);
    setMessage(null);
    try {
      await setGroupTagMutation.mutateAsync({ chatId: tag?.chatId ?? null });
      if (session !== editorSession.current) return;
      setMessage(tag ? `Тег ${tag.tag} используется в профиле` : "Тег сообщества снят");
      await utils.profile.getByUsername.invalidate({ username: profile.username });
      onUpdated?.();
    } catch (error) {
      if (session !== editorSession.current) return;
      setSelectedGroupTag(previous);
      setMessage(error instanceof Error ? error.message : "Не удалось изменить тег");
    } finally {
      tagBusyRef.current = false;
      setTagBusy(false);
    }
  }, [onUpdated, profile.username, selectedGroupTag, setGroupTagMutation, utils.profile.getByUsername]);

  return {
    open, discardOpen, panel, editing, draft, avatarUrl, previewCustomization,
    equipped, trialItemId, selectedGroupTag: hydratedGroupTag, groupTags, allItems, message,
    cosmeticBusy, dirty, overview, history, chats, avatarUpload, bannerUpload,
    savePending: saveMutation.isPending,
    avatarPending: setAvatarMutation.isPending || selectAvatarMutation.isPending,
    bannerPending: setBannerMutation.isPending,
    tagBusy,
    openEditor,
    closeEditor,
    confirmDiscard: () => closeEditor(true),
    cancelDiscard: () => setDiscardOpen(false),
    setPanel: (next: ProfileEditorPanel) => { setPanel(next); setEditing(null); },
    setEditing,
    setName: (name: string) => setDraft((old) => ({ ...old, name })),
    setBio: (bio: string) => setDraft((old) => ({ ...old, bio })),
    saveProfile,
    applyItem,
    clearSlot,
    previewPatch,
    commitPatch,
    pickAvatar,
    pickBanner,
    selectAvatar,
    selectGroupTag,
    restoreCommittedPreview,
    notify: setMessage,
  };
}

export type ProfileEditorController = ReturnType<typeof useProfileEditorController>;
