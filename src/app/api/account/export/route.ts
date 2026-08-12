import { NextResponse } from "next/server";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { createClient } from "@/lib/supabase/server";
import { buildAccountDataExport } from "@/server/data/account-export-rest";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return undefined;
  return authorization.slice("Bearer ".length).trim() || undefined;
}

export async function GET(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(getBearerToken(request));
  const user = data.user;

  if (error || !user) {
    return respond(jsonError("Не авторизован", 401));
  }
  if (!(await checkRateLimit(rateLimits.accountExport, `account-export:${user.id}`))) {
    return respond(jsonError("Экспорт можно запрашивать не более трёх раз в сутки", 429));
  }

  try {
    const payload = await buildAccountDataExport({
      userId: user.id,
      email: user.email ?? null,
      authCreatedAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    });
    const date = new Date().toISOString().slice(0, 10);
    return respond(new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="voople-account-${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    }));
  } catch (exportError) {
    console.error("[account-export]", exportError instanceof Error ? exportError.message : "failed");
    return respond(jsonError("Не удалось подготовить экспорт. Попробуйте позже.", 500));
  }
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
