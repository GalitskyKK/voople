import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import type {
  GroupDiscoveryProfileView,
  InterestCatalogView,
  UserInterestSettingsView,
} from "@/types/social";

export async function loadInterestCatalogRest(): Promise<InterestCatalogView> {
  const admin = getAdminClient();
  const [{ data: categories, error: categoriesError }, { data: interests, error: interestsError }] = await Promise.all([
    admin.from("interest_categories").select("slug, name, sort_order").order("sort_order"),
    admin.from("interests").select("slug, name, category_slug, sort_order").order("sort_order"),
  ]);
  if (categoriesError) throw new Error(categoriesError.message);
  if (interestsError) throw new Error(interestsError.message);
  return {
    categories: (categories ?? []).map((category) => ({
      slug: String(category.slug),
      name: String(category.name),
      interests: (interests ?? [])
        .filter((interest) => interest.category_slug === category.slug)
        .map((interest) => ({
          slug: String(interest.slug),
          name: String(interest.name),
          categorySlug: String(interest.category_slug),
        })),
    })),
  };
}

export async function getUserInterestSettingsRest(userId: string): Promise<UserInterestSettingsView> {
  const { data, error } = await getAdminClient()
    .from("user_interests")
    .select("interest_slug")
    .eq("user_id", userId)
    .order("selected_at");
  if (error) throw new Error(error.message);
  return { selectedSlugs: (data ?? []).map((row) => String(row.interest_slug)), limit: 10 };
}

export async function getPublicUserInterestsRest(userId: string) {
  const { data, error } = await getAdminClient()
    .from("user_interests")
    .select("interest_slug, interests(name)")
    .eq("user_id", userId)
    .order("selected_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const interest = Array.isArray(row.interests) ? row.interests[0] : row.interests;
    return {
      slug: String(row.interest_slug),
      name: typeof interest?.name === "string" ? interest.name : String(row.interest_slug),
    };
  });
}

export async function setUserInterestsRest(userId: string, selectedSlugs: string[]) {
  const before = await getUserInterestSettingsRest(userId);
  const { error } = await getAdminClient().rpc("set_user_interests", {
    p_user_id: userId,
    p_interest_slugs: selectedSlugs,
  });
  if (error) throw new Error(error.message);
  const selected = new Set(selectedSlugs);
  const previous = new Set(before.selectedSlugs);
  return {
    selectedSlugs: [...selected],
    limit: 10 as const,
    added: [...selected].filter((slug) => !previous.has(slug)),
    removed: [...previous].filter((slug) => !selected.has(slug)),
  };
}

export async function getGroupDiscoveryProfileRest(
  chatId: string,
  userId: string,
): Promise<GroupDiscoveryProfileView> {
  await assertChatMemberRest(chatId, userId);
  const admin = getAdminClient();
  const [{ data: profile, error: profileError }, { data: topics, error: topicsError }] = await Promise.all([
    admin.from("group_discovery_profiles").select("primary_category_slug, language, region").eq("chat_id", chatId).maybeSingle(),
    admin.from("group_interests").select("interest_slug").eq("chat_id", chatId).order("selected_at"),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (topicsError) throw new Error(topicsError.message);
  return {
    primaryCategorySlug: profile?.primary_category_slug ? String(profile.primary_category_slug) : null,
    topicSlugs: (topics ?? []).map((row) => String(row.interest_slug)),
    language: typeof profile?.language === "string" ? profile.language : "ru",
    region: typeof profile?.region === "string" ? profile.region : null,
    topicLimit: 5,
  };
}

export async function setGroupDiscoveryProfileRest(input: {
  chatId: string;
  userId: string;
  primaryCategorySlug: string | null;
  topicSlugs: string[];
  language: string;
  region: string | null;
}) {
  const membership = await assertChatMemberRest(input.chatId, input.userId);
  if (membership.parentChatId || membership.type !== "group") throw new Error("Параметры доступны только основной группе");
  if (membership.role !== "owner" && membership.role !== "admin") throw new Error("Недостаточно прав для настройки сообщества");
  const { error } = await getAdminClient().rpc("set_group_discovery_profile", {
    p_chat_id: input.chatId,
    p_primary_category_slug: input.primaryCategorySlug,
    p_topic_slugs: input.topicSlugs,
    p_language: input.language,
    p_region: input.region,
  });
  if (error) throw new Error(error.message);
  return getGroupDiscoveryProfileRest(input.chatId, input.userId);
}
