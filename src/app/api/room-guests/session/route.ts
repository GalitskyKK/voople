import { NextResponse } from "next/server";
import { z } from "zod";

import { requestIp } from "@/lib/http/request-ip";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import {
  ROOM_GUEST_COOKIE,
  roomGuestAccessToken,
  roomGuestCookieOptions,
} from "@/lib/chat/room-guest-session";
import {
  heartbeatRoomGuest,
  leaveRoomGuest,
  resumeRoomGuestSession,
} from "@/server/services/room-guests.service";
import { recordServerProductEvent } from "@/server/services/client-telemetry.service";

const heartbeatSchema = z.object({
  micMuted: z.boolean(),
  milestone: z.literal("media_connected").optional(),
});

function noStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, "Cache-Control": "private, no-store" },
  });
}

async function allowed(request: Request) {
  return checkRateLimit(rateLimits.roomGuestSession, `guest-session:${requestIp(request)}`);
}

export async function GET(request: Request) {
  if (!(await allowed(request))) return noStore({ error: "Слишком много запросов" }, { status: 429 });
  const token = roomGuestAccessToken(request);
  if (!token) return noStore({ error: "Гостевая сессия не найдена" }, { status: 401 });
  try {
    return noStore(await resumeRoomGuestSession(token));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const ended = message.includes("сессия недоступна") || message.includes("Комната уже закрыта");
    return noStore(
      { error: ended ? "Гостевая сессия завершена" : "Не удалось восстановить гостевую сессию" },
      { status: ended ? 410 : 503 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await allowed(request))) return noStore({ error: "Слишком много запросов" }, { status: 429 });
  const token = roomGuestAccessToken(request);
  if (!token) return noStore({ error: "Гостевая сессия не найдена" }, { status: 401 });
  const body = heartbeatSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return noStore({ error: "Некорректное состояние микрофона" }, { status: 400 });
  try {
    const result = await heartbeatRoomGuest(token, body.data.micMuted);
    if (body.data.milestone === "media_connected") {
      await recordServerProductEvent({
        name: "room_guest_media_connected",
        actorId: result.guestId,
        dedupeId: result.guestId,
        route: "/api/room-guests/session",
        properties: { source: "room_guest_link" },
      });
    }
    if (result.usefulParticipation) {
      await recordServerProductEvent({
        name: "room_guest_useful_participation",
        actorId: result.guestId,
        dedupeId: result.guestId,
        route: "/api/room-guests/session",
        properties: { durationSeconds: 180, source: "room_guest_link" },
      });
    }
    return noStore({ ok: true });
  } catch {
    return noStore({ error: "Гостевая сессия завершена" }, { status: 410 });
  }
}

export async function DELETE(request: Request) {
  if (!(await allowed(request))) return noStore({ error: "Слишком много запросов" }, { status: 429 });
  const token = roomGuestAccessToken(request);
  const response = token
    ? await leaveRoomGuest(token).then(noStore).catch(() => noStore({ left: false }))
    : noStore({ left: false });
  response.cookies.set(ROOM_GUEST_COOKIE, "", {
    ...roomGuestCookieOptions(),
    maxAge: 0,
  });
  return response;
}
