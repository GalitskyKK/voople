import { NextResponse } from "next/server";
import { z } from "zod";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { createClient } from "@/lib/supabase/server";
import { heartbeatChatRoomRest } from "@/server/data/chat-rooms-rest";

const bodySchema = z.object({
  chatId: z.string().uuid(),
  micMuted: z.boolean(),
});

export async function POST(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : undefined;

  if (!accessToken) {
    return respond(NextResponse.json({ error: "Не авторизован" }, { status: 401 }));
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return respond(NextResponse.json({ error: "Некорректный heartbeat" }, { status: 400 }));
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return respond(NextResponse.json({ error: "Не авторизован" }, { status: 401 }));
  }

  try {
    await heartbeatChatRoomRest(parsed.data.chatId, user.id, parsed.data.micMuted);
    return respond(NextResponse.json({ ok: true }));
  } catch (heartbeatError) {
    return respond(
      NextResponse.json(
        {
          error:
            heartbeatError instanceof Error
              ? heartbeatError.message
              : "Не удалось обновить состояние разговора",
        },
        { status: 409 },
      ),
    );
  }
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
