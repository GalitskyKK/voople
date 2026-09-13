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
  roomGuestUnavailableReason,
} from "@/server/services/room-guests.service";
import {
  recordRoomGuestJoined,
  recordRoomGuestPreview,
} from "@/server/services/room-guest-analytics.service";

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
    const preview = await previewRoomGuestInvite(token);
    await recordRoomGuestPreview(request, token, preview.reason);
    return noStore(preview);
  } catch {
    const { token } = await context.params;
    await recordRoomGuestPreview(request, token, "service_error");
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
    await recordRoomGuestJoined(request, token, result.guestId);
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
    const reason = roomGuestUnavailableReason(error);
    const status = reason === "full" ? 409 : reason ? 410 : 400;
    return noStore({ error: message, reason }, { status });
  }
}
