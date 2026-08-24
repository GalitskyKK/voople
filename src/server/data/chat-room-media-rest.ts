import "server-only";

import { AccessToken, TrackSource } from "livekit-server-sdk";

import { screenShareQualityForEntitlements } from "@/lib/group-perks";
import { getAdminClient } from "@/lib/supabase/admin";
import { getChatMembershipRest } from "@/server/data/chat-access-rest";
import { getGroupCommunityRest } from "@/server/data/chat-community-rest";
import { hasActiveSubscriptionRest } from "@/server/data/subscription-rest";

const MEDIA_LEASE_MS = 6 * 60 * 60_000;
const MEDIA_REFRESH_AFTER_MS = 5 * 60 * 60_000;
const SCREEN_AUDIO_REFRESH_AFTER_MS = 90 * 60_000;

function normalizeLiveKitUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "wss:" && url.protocol !== "ws:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getLiveKitEndpoints() {
  const primary = normalizeLiveKitUrl(
    process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "",
  );
  const fallbacks = (process.env.LIVEKIT_FALLBACK_URLS ?? "")
    .split(/[\n,;]/)
    .map(normalizeLiveKitUrl)
    .filter((url): url is string => Boolean(url));
  return [...new Set([primary, ...fallbacks].filter((url): url is string => Boolean(url)))].map(
    (url, index) => ({ url, label: index === 0 ? "Авто" : new URL(url).hostname }),
  );
}

function createMediaLease(refreshAfterMs: number) {
  const issuedAt = Date.now();
  return {
    expiresAt: new Date(issuedAt + MEDIA_LEASE_MS).toISOString(),
    refreshAfter: new Date(issuedAt + refreshAfterMs).toISOString(),
  };
}

export async function createChatRoomMediaTokenRest(chatId: string, userId: string) {
  const membership = await getChatMembershipRest(chatId, userId);
  const [hasVooplePlus, community] = await Promise.all([
    hasActiveSubscriptionRest(userId),
    membership.type === "group"
      ? getGroupCommunityRest(membership.accessChatId, userId)
      : Promise.resolve(null),
  ]);
  const screenShareQuality = screenShareQualityForEntitlements(
    hasVooplePlus,
    community?.groupLevel ?? 0,
    community?.hdRoomEnabled ?? false,
  );
  const endpoints = getLiveKitEndpoints();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!endpoints.length || !apiKey || !apiSecret) {
    return { enabled: false as const, screenShareQuality, expiresAt: null, refreshAfter: null };
  }

  const admin = getAdminClient();
  const [{ data: participant, error: participantError }, { data: user, error: userError }] = await Promise.all([
    admin.from("chat_room_participants").select("user_id").eq("chat_id", chatId).eq("user_id", userId).maybeSingle(),
    admin.from("users").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  if (participantError) throw new Error(participantError.message);
  if (!participant) throw new Error("Сначала войдите в комнату");
  if (userError) throw new Error(userError.message);

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: user?.display_name ?? "Участник",
    ttl: "6h",
  });
  token.addGrant({
    roomJoin: true,
    room: `chat-${chatId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return {
    enabled: true as const,
    url: endpoints[0]!.url,
    endpoints,
    token: await token.toJwt(),
    screenShareQuality,
    ...createMediaLease(MEDIA_REFRESH_AFTER_MS),
  };
}

export async function createChatRoomScreenAudioTokenRest(
  chatId: string,
  userId: string,
  screenSessionId: string,
) {
  if (process.env.DESKTOP_NATIVE_PROCESS_AUDIO_ENABLED === "false") {
    throw new Error("Звук выбранного приложения временно отключён; демонстрация продолжит работать без аудио");
  }
  if (!/^[a-f0-9-]{36}$/i.test(screenSessionId)) throw new Error("Некорректная сессия демонстрации");
  const endpoints = getLiveKitEndpoints();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!endpoints.length || !apiKey || !apiSecret) throw new Error("Медиасервер недоступен");
  await getChatMembershipRest(chatId, userId);

  const admin = getAdminClient();
  const [{ data: participant, error: participantError }, { data: user, error: userError }] = await Promise.all([
    admin.from("chat_room_participants").select("user_id").eq("chat_id", chatId).eq("user_id", userId).maybeSingle(),
    admin.from("users").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  if (participantError) throw new Error(participantError.message);
  if (!participant) throw new Error("Сначала войдите в комнату");
  if (userError) throw new Error(userError.message);

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `screen-audio:${userId}:${screenSessionId}`,
    name: user?.display_name ?? "Звук демонстрации",
    ttl: "6h",
    metadata: JSON.stringify({ kind: "screen-audio", ownerId: userId, screenSessionId }),
    attributes: { "voople.kind": "screen-audio", "voople.ownerId": userId, "voople.screenSessionId": screenSessionId },
  });
  token.addGrant({
    roomJoin: true,
    room: `chat-${chatId}`,
    canPublish: true,
    canSubscribe: false,
    canPublishData: false,
    canPublishSources: [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
  });
  return {
    url: endpoints[0]!.url,
    token: await token.toJwt(),
    screenSessionId,
    ...createMediaLease(SCREEN_AUDIO_REFRESH_AFTER_MS),
  };
}
