import { NextResponse } from "next/server"
import { z } from "zod"

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors"
import { createClient } from "@/lib/supabase/server"
import { usernameSchema } from "@/lib/validation/username"
import { ensurePublicUser } from "@/server/services/user-sync.service"
import {
  recordServerProductEvent,
  registerAnalyticsActor,
} from "@/server/services/client-telemetry.service"

const bodySchema = z.object({
  username: usernameSchema.optional()
})

export async function POST(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response)

  try {
    const supabase = await createClient()
    const authorization = request.headers.get("authorization")
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : undefined
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return respond(NextResponse.json({ error: "Не авторизован" }, { status: 401 }))
    }

    let preferredUsername: string | undefined
    try {
      const json = await request.json()
      const parsed = bodySchema.safeParse(json)
      if (parsed.success) {
        preferredUsername = parsed.data.username
      }
    } catch {
      // Пустое тело допустимо для входа.
    }

    if (!preferredUsername) {
      const metadataUsername = user.user_metadata?.username
      const parsed = usernameSchema.safeParse(metadataUsername)
      if (parsed.success) preferredUsername = parsed.data
    }

    const result = await ensurePublicUser({
      id: user.id,
      email: user.email,
      preferredUsername
    })
    await registerAnalyticsActor(user.id, result.user.createdAt)
    if (result.created) {
      await recordServerProductEvent({
        name: "signup_completed",
        actorId: user.id,
        route: "/api/auth/sync-user",
        properties: { source: accessToken ? "desktop" : "web" },
      })
    }

    return respond(
      NextResponse.json({
        ok: true,
        created: result.created,
        username: result.user.username
      })
    )
  } catch (error) {
    console.error("[sync-user]", error)
    const raw = error instanceof Error ? error.message : "Sync failed"
    const message =
      raw.includes("ECONNRESET") || raw.includes("connect")
        ? "Нет связи с базой. Проверьте DATABASE_URL (Session pooler :5432) в .env.local и повторите вход."
        : raw
    return respond(NextResponse.json({ error: message }, { status: 500 }))
  }
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request)
}
