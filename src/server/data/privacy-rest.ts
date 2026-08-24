import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { PrivacyScope, UserPrivacySettingsView } from "@/types/privacy";

export type PrivacyScopeField = keyof Pick<
  UserPrivacySettingsView,
  | "onlineScope"
  | "gamingScope"
  | "musicScope"
  | "roomsScope"
  | "inviteScope"
  | "connectionRequestScope"
>;

const DEFAULTS: UserPrivacySettingsView = {
  onlineScope: "contacts_and_groups",
  gamingScope: "contacts_and_groups",
  musicScope: "contacts_and_groups",
  roomsScope: "contacts_and_groups",
  inviteScope: "contacts_and_groups",
  connectionRequestScope: "everyone",
  appearInRecommendations: true,
  showInterests: true,
};

type PrivacyRow = {
  online_scope: PrivacyScope;
  gaming_scope: PrivacyScope;
  music_scope: PrivacyScope;
  rooms_scope: PrivacyScope;
  invite_scope: PrivacyScope;
  connection_request_scope: PrivacyScope;
  appear_in_recommendations: boolean;
  show_interests: boolean;
};

function mapPrivacy(row: PrivacyRow | null): UserPrivacySettingsView {
  if (!row) return { ...DEFAULTS };
  return {
    onlineScope: row.online_scope,
    gamingScope: row.gaming_scope,
    musicScope: row.music_scope,
    roomsScope: row.rooms_scope,
    inviteScope: row.invite_scope,
    connectionRequestScope: row.connection_request_scope,
    appearInRecommendations: row.appear_in_recommendations,
    showInterests: row.show_interests,
  };
}

async function getPrivacySettingsByUserIdsRest(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  const settings = new Map<string, UserPrivacySettingsView>();
  if (!uniqueIds.length) return settings;
  const { data, error } = await getAdminClient()
    .from("user_privacy_settings")
    .select("user_id, online_scope, gaming_scope, music_scope, rooms_scope, invite_scope, connection_request_scope, appear_in_recommendations, show_interests")
    .in("user_id", uniqueIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    settings.set(String(row.user_id), mapPrivacy(row as PrivacyRow));
  }
  for (const userId of uniqueIds) {
    if (!settings.has(userId)) settings.set(userId, { ...DEFAULTS });
  }
  return settings;
}

export async function getUserPrivacySettingsRest(userId: string) {
  const { data, error } = await getAdminClient()
    .from("user_privacy_settings")
    .select("online_scope, gaming_scope, music_scope, rooms_scope, invite_scope, connection_request_scope, appear_in_recommendations, show_interests")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mapPrivacy(data as PrivacyRow | null);
}

export async function setUserPrivacySettingsRest(userId: string, settings: UserPrivacySettingsView) {
  const { error } = await getAdminClient().rpc("set_user_privacy_settings", {
    p_user_id: userId,
    p_online_scope: settings.onlineScope,
    p_gaming_scope: settings.gamingScope,
    p_music_scope: settings.musicScope,
    p_rooms_scope: settings.roomsScope,
    p_invite_scope: settings.inviteScope,
    p_connection_request_scope: settings.connectionRequestScope,
    p_appear_in_recommendations: settings.appearInRecommendations,
    p_show_interests: settings.showInterests,
  });
  if (error) throw new Error(error.message);
  return settings;
}

export async function canViewPrivateFieldRest(ownerId: string, viewerId: string | null, scope: PrivacyScope) {
  if (ownerId === viewerId) return true;
  const { data, error } = await getAdminClient().rpc("privacy_scope_allows", {
    p_owner_id: ownerId,
    p_viewer_id: viewerId,
    p_scope: scope,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function filterUserIdsByPrivacyFieldRest(
  ownerIds: string[],
  viewerId: string | null,
  field: PrivacyScopeField,
) {
  const uniqueIds = [...new Set(ownerIds)];
  const settings = await getPrivacySettingsByUserIdsRest(uniqueIds);
  const decisions = await Promise.all(uniqueIds.map(async (ownerId) => ({
    ownerId,
    allowed: await canViewPrivateFieldRest(
      ownerId,
      viewerId,
      settings.get(ownerId)?.[field] ?? DEFAULTS[field],
    ),
  })));
  return decisions.filter((decision) => decision.allowed).map((decision) => decision.ownerId);
}

export async function filterRecommendationEligibleUserIdsRest(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  const settings = await getPrivacySettingsByUserIdsRest(uniqueIds);
  return uniqueIds.filter((userId) => settings.get(userId)?.appearInRecommendations !== false);
}

export async function listVisibleOnlineUserIdsRest(viewerId: string) {
  const { data, error } = await getAdminClient().rpc("list_visible_online_user_ids", {
    p_viewer_id: viewerId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { user_id: string }) => String(row.user_id));
}
