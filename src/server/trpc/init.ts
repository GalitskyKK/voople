import { initTRPC, TRPCError } from "@trpc/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import superjson from "superjson"

import { getVerifiedAuthIdentity, isTemporaryAuthError } from "@/lib/supabase/auth-claims"
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

async function getVerifiedUser(
  supabase: SupabaseClient,
  accessToken?: string,
): Promise<SessionUser | null> {
  try {
    return await getVerifiedAuthIdentity(supabase, accessToken)
  } catch (error) {
    if (isTemporaryAuthError(error)) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Сервис авторизации временно недоступен. Повторяем подключение.",
        cause: error,
      })
    }
    return null
  }
}

function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return undefined
  const token = authorization.slice("Bearer ".length).trim()
  return token || undefined
}

export const createTRPCContext = async (options?: {
  request?: Request
}): Promise<TRPCContext> => {
  const supabase = await createClient()
  const accessToken = getBearerToken(options?.request)
  let verifiedUserPromise: Promise<SessionUser | null> | null = null

  return {
    db,
    supabase,
    user: null,
    getVerifiedUser: () => {
      verifiedUserPromise ??= getVerifiedUser(supabase, accessToken)
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
