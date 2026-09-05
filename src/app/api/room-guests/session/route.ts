import { NextResponse } from "next/server";
import { z } from "zod";

import { requestIp } from "@/lib/http/request-ip";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import {
  ROOM_GUEST_COOKIE,
  roomGuestCookieOptions,
} from "@/lib/chat/room-guest-session";
import {
  createRoomGuestMediaToken,
  heartbeatRoomGuest,
  leaveRoomGuest,
} from "@/server/services/room-guests.service";

const heartbeatSchema = z.object({ micMuted: z.boolean() });

function accessToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${ROOM_GUEST_COOKIE}=`),
  )?.slice(ROOM_GUEST_COOKIE.length + 1);
  return value ? decodeURIComponent(value) : null;
}

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
  const token = accessToken(request);
  if (!token) return noStore({ error: "Гостевая сессия не найдена" }, { status: 401 });
  try {
    return noStore(await createRoomGuestMediaToken(token));
  } catch {
    return noStore({ error: "Гостевая сессия завершена" }, { status: 410 });
  }
}

export async function PATCH(request: Request) {
  if (!(await allowed(request))) return noStore({ error: "Слишком много запросов" }, { status: 429 });
  const token = accessToken(request);
  if (!token) return noStore({ error: "Гостевая сессия не найдена" }, { status: 401 });
  const body = heartbeatSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return noStore({ error: "Некорректное состояние микрофона" }, { status: 400 });
  try {
    return noStore(await heartbeatRoomGuest(token, body.data.micMuted));
  } catch {
    return noStore({ error: "Гостевая сессия завершена" }, { status: 410 });
  }
}

export async function DELETE(request: Request) {
  if (!(await allowed(request))) return noStore({ error: "Слишком много запросов" }, { status: 429 });
  const token = accessToken(request);
  const response = token
    ? await leaveRoomGuest(token).then(noStore).catch(() => noStore({ left: false }))
    : noStore({ left: false });
  response.cookies.set(ROOM_GUEST_COOKIE, "", {
    ...roomGuestCookieOptions(),
    maxAge: 0,
  });
  return response;
}
