import { NextResponse } from "next/server";

import {
  buildUploadKey,
  getObjectStorageConfig,
  parseChatUploadMime,
  putObject,
  sniffUploadKind,
  UPLOAD_LIMITS,
} from "@/lib/object-storage";
import { formatStorageError } from "@/lib/object-storage/errors";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!(await checkRateLimit(rateLimits.uploadChat, `chat-upload:${user.id}`))) {
      return NextResponse.json({ error: "Слишком много загрузок" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!contentType) {
      return NextResponse.json({ error: "Неизвестный тип файла" }, { status: 400 });
    }

    let parsed: ReturnType<typeof parseChatUploadMime>;
    try {
      parsed = parseChatUploadMime(contentType);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Формат не поддерживается";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const limit = UPLOAD_LIMITS.chat.maxBytes;
    if (file.size <= 0 || file.size > limit) {
      return NextResponse.json(
        { error: `Файл больше ${Math.round(limit / (1024 * 1024))} МБ` },
        { status: 400 },
      );
    }

    const body = new Uint8Array(await file.arrayBuffer());

    // Не доверяем заявленному Content-Type: сверяем магические байты.
    const sniffed = sniffUploadKind(body);
    const isContainerMatch = sniffed === "container" && (parsed.kind === "audio" || parsed.kind === "circle");
    if (sniffed !== parsed.kind && !isContainerMatch) {
      return NextResponse.json(
        { error: "Содержимое файла не соответствует его типу" },
        { status: 400 },
      );
    }

    const baseKey = buildUploadKey("chat", user.id, parsed.extension);
    const isVoice = purpose === "voice" && parsed.kind === "audio";
    const key = parsed.kind === "circle"
      ? baseKey.replace(/\.([a-z0-9]+)$/i, ".circle.$1")
      : isVoice
        ? baseKey.replace(/\.([a-z0-9]+)$/i, ".voice.$1")
        : baseKey;

    await putObject({
      key,
      body,
      contentType,
      bucket: "private",
    });

    return NextResponse.json({ key });
  } catch (e) {
    const config = getObjectStorageConfig();
    const message = formatStorageError(e, config?.privateBucket);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
