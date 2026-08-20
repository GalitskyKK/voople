import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
import {
  groupBannerEnabled,
  groupBoostLevel,
  groupTagEnabled,
  groupVanityInviteEnabled,
  groupRoleStylesEnabled,
} from "@/lib/group-perks";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import type { GroupCommunityView } from "@/types/chat";

type CommunitySummary = Pick<
  GroupCommunityView,
  | "icon"
  | "avatarUrl"
  | "effectiveBannerUrl"
  | "effectiveTag"
  | "effectiveAccentColor"
  | "boostCount"
  | "boostedByMe"
  | "groupLevel"
>;

const activeAfter = () => new Date().toISOString();
const perkEligibleAfter = () => new Date(Date.now() - BOOST_GRACE_MS).toISOString();
const BOOST_COOLDOWN_MS = 7 * 24 * 60 * 60_000;
const BOOST_GRACE_MS = 72 * 60 * 60_000;

async function activeBoostRows(chatIds: string[]) {
  if (chatIds.length === 0) return [];
  const admin = getAdminClient();
  const { data: boosts, error: boostsError } = await admin
    .from("group_boosts")
    .select("chat_id, user_id, slot, moved_at")
    .in("chat_id", chatIds);
  if (boostsError) throw new Error(boostsError.message);
  const userIds = [...new Set((boosts ?? []).map((row) => row.user_id as string))];
  if (userIds.length === 0) return [];
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("user_id, expires_at")
    .in("user_id", userIds)
    .gt("expires_at", perkEligibleAfter());
  if (subscriptionsError) throw new Error(subscriptionsError.message);
  const activeUserIds = new Set(
    (subscriptions ?? []).map((row) => row.user_id as string),
  );
  return (boosts ?? []).filter((row) => activeUserIds.has(row.user_id as string));
}

export async function loadGroupCommunitySummariesRest(
  chatIds: string[],
  viewerId?: string | null,
) {
  const uniqueIds = [...new Set(chatIds)];
  const admin = getAdminClient();
  if (uniqueIds.length === 0) return new Map<string, CommunitySummary>();
  const [{ data: customization, error }, boosts] = await Promise.all([
    admin
      .from("group_customization")
      .select("chat_id, icon, avatar_key, banner_key, tag, accent_color, boost_grace_until, boost_grace_level")
      .in("chat_id", uniqueIds),
    activeBoostRows(uniqueIds),
  ]);
  if (error) throw new Error(error.message);

  const customizationByChat = new Map(
    (customization ?? []).map((row) => [row.chat_id as string, row] as const),
  );
  const counts = new Map<string, number>();
  const boostedByViewer = new Set<string>();
  for (const boost of boosts) {
    const chatId = boost.chat_id as string;
    counts.set(chatId, (counts.get(chatId) ?? 0) + 1);
    if (boost.user_id === viewerId) boostedByViewer.add(chatId);
  }

  return new Map(
    uniqueIds.map((chatId) => {
      const row = customizationByChat.get(chatId);
      const boostCount = counts.get(chatId) ?? 0;
      const graceActive = Boolean(row?.boost_grace_until && new Date(row.boost_grace_until as string).getTime() > Date.now());
      const effectiveLevel = groupBoostLevel(Math.max(
        boostCount,
        graceActive ? Number(row?.boost_grace_level ?? 0) : 0,
      ));
      return [
        chatId,
        {
          icon: (row?.icon as string | null | undefined) ?? null,
          avatarUrl: publicAssetUrl(
            (row?.avatar_key as string | null | undefined) ?? null,
          ),
          effectiveBannerUrl: groupBannerEnabled(effectiveLevel)
            ? publicAssetUrl((row?.banner_key as string | null | undefined) ?? null)
            : null,
          effectiveTag: groupTagEnabled(effectiveLevel)
            ? ((row?.tag as string | null | undefined) ?? null)
            : null,
          effectiveAccentColor:
            effectiveLevel > 0
              ? ((row?.accent_color as string | null | undefined) ?? null)
              : null,
          boostCount,
          boostedByMe: boostedByViewer.has(chatId),
          groupLevel: effectiveLevel,
        },
      ] as const;
    }),
  );
}

export async function getGroupCommunityRest(
  chatId: string,
  userId: string,
): Promise<GroupCommunityView> {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Кастомизация доступна в основной группе");
  }
  const admin = getAdminClient();
  const [{ data: customization, error }, summaries, { data: subscription }, { data: boostRows, error: boostRowsError }] =
    await Promise.all([
      admin
        .from("group_customization")
        .select("description, icon, avatar_key, banner_key, tag, vanity_invite_slug, owner_role_color, admin_role_color, member_role_color, public_slug, accent_color, boost_grace_until, boost_grace_level")
        .eq("chat_id", chatId)
        .maybeSingle(),
      loadGroupCommunitySummariesRest([chatId], userId),
      admin
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", userId)
        .gt("expires_at", activeAfter())
        .maybeSingle(),
      admin
        .from("group_boosts")
        .select("slot, chat_id, moved_at")
        .eq("user_id", userId),
    ]);
  if (error) throw new Error(error.message);
  if (boostRowsError) throw new Error(boostRowsError.message);
  const summary = summaries.get(chatId);
  const boosts = summary?.boostCount ?? 0;
  const graceUntil = (customization?.boost_grace_until as string | null | undefined) ?? null;
  const graceActive = Boolean(graceUntil && new Date(graceUntil).getTime() > Date.now());
  const effectiveLevel = groupBoostLevel(Math.max(
    boosts,
    graceActive ? Number(customization?.boost_grace_level ?? 0) : 0,
  ));
  const roleColors = {
    owner: (customization?.owner_role_color as string | null | undefined) ?? null,
    admin: (customization?.admin_role_color as string | null | undefined) ?? null,
    member: (customization?.member_role_color as string | null | undefined) ?? null,
  };
  const bySlot = new Map((boostRows ?? []).map((row) => [Number(row.slot), row]));
  return {
    description: (customization?.description as string | null | undefined) ?? null,
    icon: summary?.icon ?? null,
    avatarUrl: summary?.avatarUrl ?? null,
    bannerUrl: publicAssetUrl(
      (customization?.banner_key as string | null | undefined) ?? null,
    ),
    effectiveBannerUrl: summary?.effectiveBannerUrl ?? null,
    tag: (customization?.tag as string | null | undefined) ?? null,
    effectiveTag: summary?.effectiveTag ?? null,
    vanityInviteSlug: (customization?.vanity_invite_slug as string | null | undefined) ?? null,
    roleColors,
    effectiveRoleColors: groupRoleStylesEnabled(effectiveLevel)
      ? roleColors
      : { owner: null, admin: null, member: null },
    publicSlug: (customization?.public_slug as string | null | undefined) ?? null,
    accentColor: (customization?.accent_color as string | null | undefined) ?? null,
    effectiveAccentColor: summary?.effectiveAccentColor ?? null,
    boostCount: boosts,
    boostedByMe: summary?.boostedByMe ?? false,
    canBoost: Boolean(subscription),
    boostUnlocksAccent: effectiveLevel > 0,
    boostUnlocksBanner: groupBannerEnabled(effectiveLevel),
    boostUnlocksTag: groupTagEnabled(effectiveLevel),
    boostUnlocksVanityInvite: groupVanityInviteEnabled(effectiveLevel),
    boostUnlocksRoleStyles: groupRoleStylesEnabled(effectiveLevel),
    boostSlots: ([1, 2, 3] as const).map((slot) => {
      const row = bySlot.get(slot);
      const movedAt = row?.moved_at ? new Date(row.moved_at as string).getTime() : 0;
      const cooldown = movedAt + BOOST_COOLDOWN_MS;
      return {
        slot,
        chatId: (row?.chat_id as string | null | undefined) ?? null,
        assignedHere: row?.chat_id === chatId,
        cooldownUntil: cooldown > Date.now() ? new Date(cooldown).toISOString() : null,
      };
    }),
    groupLevel: effectiveLevel,
    graceUntil: graceActive ? graceUntil : null,
  };
}

export async function updateGroupCustomizationRest(
  chatId: string,
  userId: string,
  patch: {
    description: string | null;
    icon: string | null;
    publicSlug: string | null;
    accentColor: string | null;
    tag: string | null;
    vanityInviteSlug: string | null;
    roleColors: Record<"owner" | "admin" | "member", string | null>;
    avatarKey?: string | null;
    bannerKey?: string | null;
  },
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Кастомизация доступна в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Кастомизацию могут менять владелец и администраторы");
  }
  const description = patch.description?.trim() || null;
  const icon = patch.icon?.trim() || null;
  const publicSlug = patch.publicSlug?.trim().toLowerCase() || null;
  const accentColor = patch.accentColor?.trim() || null;
  const tag = patch.tag?.trim().toUpperCase() || null;
  const vanityInviteSlug = patch.vanityInviteSlug?.trim().toLowerCase() || null;
  const roleColors = {
    owner: patch.roleColors.owner?.trim() || null,
    admin: patch.roleColors.admin?.trim() || null,
    member: patch.roleColors.member?.trim() || null,
  };
  const avatarKey =
    patch.avatarKey === undefined
      ? undefined
      : patch.avatarKey;
  const bannerKey =
    patch.bannerKey === undefined
      ? undefined
      : patch.bannerKey;
  if (description && description.length > 160) throw new Error("Описание слишком длинное");
  if (icon && icon.length > 16) throw new Error("Иконка слишком длинная");
  if (publicSlug && !/^[a-z0-9_]{5,32}$/.test(publicSlug)) {
    throw new Error("Адрес группы: 5–32 латинских символа, цифры или подчёркивания");
  }
  if (publicSlug && ["admin", "api", "auth", "desktop", "legal", "messages", "settings", "shop", "support", "voople"].includes(publicSlug)) {
    throw new Error("Этот адрес зарезервирован");
  }
  if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    throw new Error("Некорректный цвет группы");
  }
  if (tag && !/^[\p{L}\p{N}]{2,5}$/u.test(tag)) {
    throw new Error("Тег группы: 2–5 букв или цифр без пробелов");
  }
  if (vanityInviteSlug && !/^[a-z0-9_]{5,32}$/.test(vanityInviteSlug)) {
    throw new Error("Короткая ссылка: 5–32 латинских символа, цифры или подчёркивания");
  }
  if (Object.values(roleColors).some((color) => color && !/^#[0-9a-fA-F]{6}$/.test(color))) {
    throw new Error("Некорректный цвет роли группы");
  }
  const currentCommunity = await getGroupCommunityRest(chatId, userId);
  if (accentColor && accentColor !== currentCommunity.accentColor && !currentCommunity.boostUnlocksAccent) {
    throw new Error("Свой цвет группы открывается после первого активного буста");
  }
  if (bannerKey && !currentCommunity.boostUnlocksBanner) {
    throw new Error("Баннер группы открывается на 6-м уровне");
  }
  if (tag && tag !== currentCommunity.tag && !currentCommunity.boostUnlocksTag) {
    throw new Error("Тег группы открывается на 12-м уровне");
  }
  if (vanityInviteSlug && vanityInviteSlug !== currentCommunity.vanityInviteSlug && !currentCommunity.boostUnlocksVanityInvite) {
    throw new Error("Постоянная короткая ссылка открывается на 24-м уровне");
  }
  const roleStylesChanged = (Object.keys(roleColors) as Array<keyof typeof roleColors>)
    .some((role) => roleColors[role] !== currentCommunity.roleColors[role]);
  if (roleStylesChanged && !currentCommunity.boostUnlocksRoleStyles) {
    throw new Error("Расширенные стили ролей открываются на 24-м уровне");
  }
  const { error } = await getAdminClient().from("group_customization").upsert({
    chat_id: chatId,
    description,
    icon,
    public_slug: publicSlug,
    accent_color: accentColor,
    tag,
    vanity_invite_slug: vanityInviteSlug,
    owner_role_color: roleColors.owner,
    admin_role_color: roleColors.admin,
    member_role_color: roleColors.member,
    ...(avatarKey !== undefined ? { avatar_key: avatarKey } : {}),
    ...(bannerKey !== undefined ? { banner_key: bannerKey } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") throw new Error("Этот адрес группы уже занят");
    throw new Error(error.message);
  }
  return getGroupCommunityRest(chatId, userId);
}

export async function setGroupBoostRest(
  chatId: string,
  userId: string,
  enabled: boolean,
  requestedSlot?: 1 | 2 | 3,
  idempotencyKey = crypto.randomUUID(),
) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Буст можно назначить основной группе");
  }
  const admin = getAdminClient();
  const { data: rows, error: rowsError } = await admin
    .from("group_boosts")
    .select("slot, chat_id")
    .eq("user_id", userId);
  if (rowsError) throw new Error(rowsError.message);
  const existingForGroup = (rows ?? []).find((row) => row.chat_id === chatId);
  const firstFree = ([1, 2, 3] as const).find(
    (slot) => !(rows ?? []).some((row) => Number(row.slot) === slot && row.chat_id),
  );
  const slot = requestedSlot ?? (existingForGroup
    ? Number(existingForGroup.slot) as 1 | 2 | 3
    : firstFree);
  if (!slot) throw new Error("Все три буста уже распределены. Выберите слот для переноса.");
  const { error } = await admin.rpc("assign_group_boost_slot", {
    p_user_id: userId,
    p_slot: slot,
    p_chat_id: enabled ? chatId : null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    if (error.message.includes("boost_slot_cooldown")) {
      throw new Error("Этот слот можно перенести только раз в 7 дней");
    }
    if (error.message.includes("active_subscription_required")) {
      throw new Error("Для буста нужна активная подписка Вупл+");
    }
    throw new Error(error.message);
  }
  return getGroupCommunityRest(chatId, userId);
}
