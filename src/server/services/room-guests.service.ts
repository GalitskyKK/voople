import "server-only";

import { z } from "zod";

import { isRoomGuestInviteToken, roomGuestInviteUrl } from "@/lib/chat/room-guest-invite-url";
import { getSiteUrl } from "@/lib/seo/site";
import { issueRoomGuestMediaTokenRest } from "@/server/data/chat-room-media-rest";
import {
  createRoomGuestInviteRest,
  heartbeatRoomGuestRest,
  joinRoomAsGuestRest,
  leaveRoomGuestRest,
  previewRoomGuestInviteRest,
  resolveRoomGuestRest,
} from "@/server/data/room-guests-rest";

function requireOpaqueToken(token: string, errorMessage: string) {
  if (!isRoomGuestInviteToken(token)) throw new Error(errorMessage);
  return token;
}

function requireInviteToken(token: string) {
  return requireOpaqueToken(token, "Приглашение не найдено");
}

function normalizeGuestName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("Имя должно содержать от 1 до 40 символов");
  }
  return name;
}

export async function createRoomGuestInvite(input: {
  sessionId: string;
  userId: string;
}) {
  const invite = await createRoomGuestInviteRest(input);
  const shareUrl = roomGuestInviteUrl(invite.token, getSiteUrl());
  if (!shareUrl) throw new Error("Публичный адрес Voople настроен некорректно");
  return {
    id: invite.id,
    shareUrl,
    expiresAt: invite.expiresAt,
    maxGuests: invite.maxGuests,
  };
}

export function previewRoomGuestInvite(token: string) {
  return previewRoomGuestInviteRest(requireInviteToken(token));
}

export function joinRoomAsGuest(input: {
  inviteToken: string;
  displayName: string;
  requestId: string;
}) {
  return joinRoomAsGuestRest({
    inviteToken: requireInviteToken(input.inviteToken),
    displayName: normalizeGuestName(input.displayName),
    requestId: z.string().uuid().parse(input.requestId),
  });
}

export async function createRoomGuestMediaToken(accessToken: string) {
  const guest = await resolveRoomGuestRest(requireOpaqueToken(accessToken, "Гостевая сессия недоступна"));
  return issueRoomGuestMediaTokenRest(guest);
}

export function heartbeatRoomGuest(accessToken: string, micMuted: boolean) {
  return heartbeatRoomGuestRest(requireOpaqueToken(accessToken, "Гостевая сессия недоступна"), micMuted);
}

export function leaveRoomGuest(accessToken: string) {
  return leaveRoomGuestRest(requireOpaqueToken(accessToken, "Гостевая сессия недоступна"));
}
