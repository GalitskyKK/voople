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
  joinRoomAsGuest,
  previewRoomGuestInvite,
} from "@/server/services/room-guests.service";

const joinSchema = z.object({
  displayName: z.string().min(1).max(80),
  requestId: z.string().uuid(),
});

type GuestInviteRouteContext = {
  params: Promise<{ token: string }>;
};

function noStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request, context: GuestInviteRouteContext) {
  const ip = requestIp(request);
  if (!(await checkRateLimit(rateLimits.previewRoomGuestInvite, `guest-preview:${ip}`))) {
    return noStore({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
  }
  try {
    const { token } = await context.params;
    return noStore(await previewRoomGuestInvite(token));
  } catch {
    return noStore({ error: "Приглашение временно недоступно" }, { status: 503 });
  }
}

export async function POST(request: Request, context: GuestInviteRouteContext) {
  const ip = requestIp(request);
  if (!(await checkRateLimit(rateLimits.joinRoomAsGuest, `guest-join:${ip}`))) {
    return noStore({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  }
  try {
    const body = joinSchema.safeParse(await request.json());
    if (!body.success) return noStore({ error: "Введите имя до 40 символов" }, { status: 400 });
    const { token } = await context.params;
    const result = await joinRoomAsGuest({
      inviteToken: token,
      displayName: body.data.displayName,
      requestId: body.data.requestId,
    });
    const response = noStore({
      guestId: result.guestId,
      sessionId: result.sessionId,
      displayName: result.displayName,
      expiresAt: result.expiresAt,
    });
    response.cookies.set(ROOM_GUEST_COOKIE, result.accessToken, roomGuestCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось войти гостем";
    const status = message.includes("закрыта") || message.includes("истёк") ? 410
      : message.includes("мест") ? 409
        : 400;
    return noStore({ error: message }, { status });
  }
}
