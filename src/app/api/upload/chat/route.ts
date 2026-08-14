import { NextResponse } from "next/server";

import {
  buildUploadKey,
  getObjectStorageConfig,
  parseChatUploadMime,
  putObject,
  sniffUploadKind,
} from "@/lib/object-storage";
import { formatStorageError } from "@/lib/object-storage/errors";
import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { createClient } from "@/lib/supabase/server";
import { getChatUploadByteLimit } from "@/server/services/upload.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json = (body: object, init?: ResponseInit) =>
    withDesktopCors(request, NextResponse.json(body, init));

  try {
    const supabase = await createClient();
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : undefined;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!(await checkRateLimit(rateLimits.uploadChat, `chat-upload:${user.id}`))) {
      return json({ error: "Слишком много загрузок" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");
    const rawChatId = formData.get("chatId");
    const chatId = typeof rawChatId === "string" && /^[a-f0-9-]{36}$/i.test(rawChatId)
      ? rawChatId
      : undefined;
    if (!(file instanceof File)) {
      return json({ error: "Файл не передан" }, { status: 400 });
    }

    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!contentType) {
      return json({ error: "Неизвестный тип файла" }, { status: 400 });
    }

    let parsed: ReturnType<typeof parseChatUploadMime>;
    try {
      parsed = parseChatUploadMime(contentType);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Формат не поддерживается";
      return json({ error: message }, { status: 400 });
    }

    const limit = await getChatUploadByteLimit(user.id, chatId);
    if (file.size <= 0 || file.size > limit) {
      return json(
        { error: `Файл больше ${Math.round(limit / (1024 * 1024))} МБ` },
        { status: 400 },
      );
    }

    const body = new Uint8Array(await file.arrayBuffer());

    // Не доверяем заявленному Content-Type: сверяем магические байты.
    const sniffed = sniffUploadKind(body);
    const isContainerMatch = sniffed === "container" && (parsed.kind === "audio" || parsed.kind === "circle");
    if (sniffed !== parsed.kind && !isContainerMatch) {
      return json(
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

    return json({ key });
  } catch (e) {
    const config = getObjectStorageConfig();
    const message = formatStorageError(e, config?.privateBucket);
    return json({ error: message }, { status: 500 });
  }
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
