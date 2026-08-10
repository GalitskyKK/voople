import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import type { GroupCommunityView } from "@/types/chat";

type CommunitySummary = Pick<
  GroupCommunityView,
  | "icon"
  | "avatarUrl"
  | "effectiveAccentColor"
  | "boostCount"
  | "boostedByMe"
>;

const activeAfter = () => new Date().toISOString();

async function activeBoostRows(chatIds: string[]) {
  if (chatIds.length === 0) return [];
  const admin = getAdminClient();
  const { data: boosts, error: boostsError } = await admin
    .from("group_boosts")
    .select("chat_id, user_id")
    .in("chat_id", chatIds);
  if (boostsError) throw new Error(boostsError.message);
  const userIds = [...new Set((boosts ?? []).map((row) => row.user_id as string))];
  if (userIds.length === 0) return [];
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("user_id")
    .in("user_id", userIds)
    .gt("expires_at", activeAfter());
  if (subscriptionsError) throw new Error(subscriptionsError.message);
  const activeUserIds = new Set(
    (subscriptions ?? []).map((row) => row.user_id as string),
  );
  return (boosts ?? []).filter((row) => activeUserIds.has(row.user_id as string));
}

export async function loadGroupCommunitySummariesRest(
  chatIds: string[],
  viewerId: string,
) {
  const uniqueIds = [...new Set(chatIds)];
  const admin = getAdminClient();
  if (uniqueIds.length === 0) return new Map<string, CommunitySummary>();
  const [{ data: customization, error }, boosts] = await Promise.all([
    admin
      .from("group_customization")
      .select("chat_id, icon, avatar_key, accent_color")
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
      return [
        chatId,
        {
          icon: (row?.icon as string | null | undefined) ?? null,
          avatarUrl: publicAssetUrl(
            (row?.avatar_key as string | null | undefined) ?? null,
          ),
          effectiveAccentColor:
            boostCount > 0
              ? ((row?.accent_color as string | null | undefined) ?? null)
              : null,
          boostCount,
          boostedByMe: boostedByViewer.has(chatId),
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
  const [{ data: customization, error }, summaries, { data: subscription }] =
    await Promise.all([
      admin
        .from("group_customization")
        .select("description, icon, avatar_key, public_slug, accent_color")
        .eq("chat_id", chatId)
        .maybeSingle(),
      loadGroupCommunitySummariesRest([chatId], userId),
      admin
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", userId)
        .gt("expires_at", activeAfter())
        .maybeSingle(),
    ]);
  if (error) throw new Error(error.message);
  const summary = summaries.get(chatId);
  return {
    description: (customization?.description as string | null | undefined) ?? null,
    icon: summary?.icon ?? null,
    avatarUrl: summary?.avatarUrl ?? null,
    publicSlug: (customization?.public_slug as string | null | undefined) ?? null,
    accentColor: (customization?.accent_color as string | null | undefined) ?? null,
    effectiveAccentColor: summary?.effectiveAccentColor ?? null,
    boostCount: summary?.boostCount ?? 0,
    boostedByMe: summary?.boostedByMe ?? false,
    canBoost: Boolean(subscription),
    boostUnlocksAccent: (summary?.boostCount ?? 0) > 0,
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
    avatarKey?: string | null;
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
  const avatarKey =
    patch.avatarKey === undefined
      ? undefined
      : patch.avatarKey;
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
  const summary = (await loadGroupCommunitySummariesRest([chatId], userId)).get(chatId);
  if (accentColor && !summary?.boostCount) {
    throw new Error("Свой цвет группы открывается после первого активного буста");
  }
  const { error } = await getAdminClient().from("group_customization").upsert({
    chat_id: chatId,
    description,
    icon,
    public_slug: publicSlug,
    accent_color: accentColor,
    ...(avatarKey !== undefined ? { avatar_key: avatarKey } : {}),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") throw new Error("Этот адрес группы уже занят");
    throw new Error(error.message);
  }
  return getGroupCommunityRest(chatId, userId);
}

export async function setGroupBoostRest(chatId: string, userId: string, enabled: boolean) {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Буст можно назначить основной группе");
  }
  const admin = getAdminClient();
  if (enabled) {
    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("user_id", userId)
      .gt("expires_at", activeAfter())
      .maybeSingle();
    if (subscriptionError) throw new Error(subscriptionError.message);
    if (!subscription) throw new Error("Для буста нужна активная подписка Voople+");
    const { error } = await admin.from("group_boosts").upsert({
      user_id: userId,
      chat_id: chatId,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("group_boosts")
      .delete()
      .eq("user_id", userId)
      .eq("chat_id", chatId);
    if (error) throw new Error(error.message);
  }
  return getGroupCommunityRest(chatId, userId);
}
