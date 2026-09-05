import { NextResponse } from "next/server";

import {
  ROOM_GUEST_COOKIE,
  roomGuestAccessToken,
  roomGuestCookieOptions,
} from "@/lib/chat/room-guest-session";
import { requestIp } from "@/lib/http/request-ip";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { createClient } from "@/lib/supabase/server";
import { convertRoomGuestAccount } from "@/server/services/room-guests.service";
import { recordServerProductEvent } from "@/server/services/client-telemetry.service";

function noStore<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(
    rateLimits.roomGuestSession,
    `guest-conversion:${requestIp(request)}`,
  );
  if (!allowed) return noStore({ error: "Слишком много запросов" }, { status: 429 });

  const accessToken = roomGuestAccessToken(request);
  if (!accessToken) {
    return noStore({ error: "Гостевое участие не найдено" }, { status: 410 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return noStore({ error: "Нужно войти или создать аккаунт" }, { status: 401 });
  }

  try {
    const result = await convertRoomGuestAccount({ accessToken, userId: user.id });
    await recordServerProductEvent({
      name: "room_guest_converted",
      actorId: user.id,
      route: "/api/room-guests/conversion",
      properties: { state: result.status },
    });
    const response = noStore(result);
    response.cookies.set(ROOM_GUEST_COOKIE, "", {
      ...roomGuestCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return noStore(
      { error: error instanceof Error ? error.message : "Не удалось сохранить участие" },
      { status: 409 },
    );
  }
}
