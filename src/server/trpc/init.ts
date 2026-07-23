import { initTRPC, TRPCError } from "@trpc/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import superjson from "superjson"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/server/db"
import { db } from "@/server/db"

export type SessionUser = {
  id: string
  email?: string
}

export type TRPCContext = {
  db: Database | null
  supabase: SupabaseClient
  user: SessionUser | null
  getVerifiedUser: () => Promise<SessionUser | null>
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Supabase auth timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      })
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function getVerifiedUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  try {
    const {
      data: { user }
    } = await withTimeout(supabase.auth.getUser(), 4_000)
    return user ? { id: user.id, email: user.email } : null
  } catch {
    return null
  }
}

export const createTRPCContext = async (): Promise<TRPCContext> => {
  const supabase = await createClient()
  let verifiedUserPromise: Promise<SessionUser | null> | null = null

  return {
    db,
    supabase,
    user: null,
    getVerifiedUser: () => {
      verifiedUserPromise ??= getVerifiedUser(supabase)
      return verifiedUserPromise
    }
  }
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson
})

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const publicProcedure = t.procedure

// Public pages may still need the signed-in viewer's state (likes, reactions,
// follows). Authentication stays optional, but the verified user is exposed to
// the resolver when a session exists.
export const optionalAuthProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = await ctx.getVerifiedUser()
  return next({
    ctx: {
      ...ctx,
      user
    }
  })
})

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = await ctx.getVerifiedUser()
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      user
    }
  })
})

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { isAdminUserId, assertAdminConfigured } = await import("@/lib/admin/auth")
  assertAdminConfigured()
  if (!isAdminUserId(ctx.user.id)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к админке" })
  }
  return next({ ctx })
})
