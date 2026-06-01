import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { usernameSchema } from "@/lib/validation/username"
import { ensurePublicUser } from "@/server/services/user-sync.service"

const bodySchema = z.object({
  username: usernameSchema.optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    let preferredUsername: string | undefined
    try {
      const json = await request.json()
      const parsed = bodySchema.safeParse(json)
      if (parsed.success) {
        preferredUsername = parsed.data.username
      }
    } catch {
      // пустое тело — ок для login
    }

    const result = await ensurePublicUser({
      id: user.id,
      email: user.email,
      preferredUsername
    })

    return NextResponse.json({
      ok: true,
      created: result.created,
      username: result.user.username
    })
  } catch (e) {
    console.error("[sync-user]", e)
    const raw = e instanceof Error ? e.message : "Sync failed"
    const message =
      raw.includes("ECONNRESET") || raw.includes("connect")
        ? "Нет связи с базой. Проверьте DATABASE_URL (Session pooler :5432) в .env.local и повторите вход."
        : raw
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
