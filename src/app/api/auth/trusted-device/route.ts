import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  deviceId: z.string().uuid(),
  label: z.string().trim().min(1).max(80),
});
const deleteSchema = z.object({ deviceRecordId: z.string().uuid() });

async function getRequestUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  return error ? null : user;
}

export async function GET(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  const user = await getRequestUser(request);
  if (!user) return respond(NextResponse.json({ error: "Не авторизован" }, { status: 401 }));
  const currentDeviceId = z.string().uuid().safeParse(request.headers.get("x-voople-device"));
  const currentHash = currentDeviceId.success
    ? createHash("sha256").update(currentDeviceId.data).digest("hex")
    : null;
  const { data, error } = await getAdminClient()
    .from("trusted_login_devices")
    .select("id, device_hash, label, created_at, last_used_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("last_used_at", { ascending: false })
    .limit(20);
  if (error) return respond(NextResponse.json({ error: "Не удалось загрузить устройства" }, { status: 500 }));
  return respond(NextResponse.json({
    devices: (data ?? []).map((device) => ({
      id: device.id,
      label: device.label,
      createdAt: device.created_at,
      lastUsedAt: device.last_used_at,
      current: currentHash === device.device_hash,
    })),
  }, { headers: { "Cache-Control": "no-store" } }));
}

export async function POST(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  const user = await getRequestUser(request);
  if (!user) return respond(NextResponse.json({ error: "Не авторизован" }, { status: 401 }));
  if (!(await checkRateLimit(rateLimits.trustDevice, `trust-device:${user.id}`))) {
    return respond(NextResponse.json({ error: "Слишком много изменений устройств" }, { status: 429 }));
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return respond(NextResponse.json({ error: "Некорректное устройство" }, { status: 400 }));
  const hash = createHash("sha256").update(parsed.data.deviceId).digest("hex");
  const { error: upsertError } = await getAdminClient().from("trusted_login_devices").upsert({
    user_id: user.id,
    device_hash: hash,
    label: parsed.data.label,
    last_used_at: new Date().toISOString(),
    revoked_at: null,
  }, { onConflict: "user_id,device_hash" });
  if (upsertError) return respond(NextResponse.json({ error: "Не удалось запомнить устройство" }, { status: 500 }));
  return respond(NextResponse.json({ ok: true }));
}

export async function DELETE(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  const user = await getRequestUser(request);
  if (!user) return respond(NextResponse.json({ error: "Не авторизован" }, { status: 401 }));
  if (!(await checkRateLimit(rateLimits.trustDevice, `revoke-device:${user.id}`))) {
    return respond(NextResponse.json({ error: "Слишком много изменений устройств" }, { status: 429 }));
  }
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return respond(NextResponse.json({ error: "Некорректное устройство" }, { status: 400 }));
  const { error } = await getAdminClient()
    .from("trusted_login_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.deviceRecordId)
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if (error) return respond(NextResponse.json({ error: "Не удалось удалить устройство" }, { status: 500 }));
  return respond(NextResponse.json({ ok: true }));
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
