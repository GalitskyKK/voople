import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isTemporaryAuthError } from "@/lib/supabase/auth-claims"
import { createFetchWithRetry } from "@/lib/supabase/fetch-retry"

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/feed",
  "/group",
  "/explore",
  "/hashtag",
  "/post",
  "/shop",
  "/legal",
  "/invite",
  "/download",
  "/api",
]

function isPublicPath(pathname: string) {
  if (pathname === "/") {
    return true
  }
  if (pathname === "/favicon.ico" || pathname.startsWith("/favicon/")) {
    return true
  }
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true
  }
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 1 && !["messages", "notifications"].includes(segments[0]!)) {
    return true
  }
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const publicPath = isPublicPath(pathname)

  // Auth endpoints perform their own token rotation. Running getClaims() here could
  // refresh the same token before the proxied request reaches Supabase.
  if (pathname.startsWith("/api/supabase/auth/")) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      }
    },
    global: { fetch: createFetchWithRetry(2, 8_000) },
  })

  let hasVerifiedSession = false
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (error) {
      if (isTemporaryAuthError(error)) return response
    } else {
      hasVerifiedSession = Boolean(data?.claims?.sub)
    }
  } catch (error) {
    if (isTemporaryAuthError(error)) return response
    throw error
  }

  if (!hasVerifiedSession && !publicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico)$).*)",
  ],
}
