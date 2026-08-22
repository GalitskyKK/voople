import { createHash } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { getAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
  deviceId: z.string().uuid(),
  captchaToken: z.string().min(1).max(4096).optional(),
});

function deviceHash(deviceId: string) {
  return createHash("sha256").update(deviceId).digest("hex");
}

export async function POST(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return respond(NextResponse.json({ error: "Проверьте email и пароль" }, { status: 400 }));
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
    const emailKey = createHash("sha256").update(parsed.data.email.trim().toLowerCase()).digest("hex").slice(0, 20);
    if (!(await checkRateLimit(rateLimits.passwordLogin, `password-login:${ip}:${emailKey}`))) {
      return respond(NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 }));
    }

    const supabaseUrl = process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) throw new Error("Auth is not configured");
    const auth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await auth.auth.signInWithPassword({
      email: parsed.data.email.trim(),
      password: parsed.data.password,
      options: { captchaToken: parsed.data.captchaToken },
    });
    if (error || !data.user || !data.session) {
      return respond(NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 }));
    }

    const hash = deviceHash(parsed.data.deviceId);
    const admin = getAdminClient();
    const { data: trusted, error: trustedError } = await admin
      .from("trusted_login_devices")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("device_hash", hash)
      .is("revoked_at", null)
      .maybeSingle();
    if (trustedError) throw new Error(trustedError.message);
    if (!trusted) {
      await auth.auth.signOut({ scope: "local" }).catch(() => undefined);
      return respond(NextResponse.json({ verificationRequired: true }, {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      }));
    }

    await admin.from("trusted_login_devices").update({ last_used_at: new Date().toISOString() }).eq("id", trusted.id);
    return respond(NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }, { headers: { "Cache-Control": "no-store" } }));
  } catch {
    return respond(NextResponse.json({ error: "Сервис входа временно недоступен" }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
