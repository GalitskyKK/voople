import { NextResponse } from "next/server";

import {
  buildUploadKey,
  getObjectStorageConfig,
  parseChatUploadMime,
  putObject,
  UPLOAD_LIMITS,
} from "@/lib/object-storage";
import { formatStorageError } from "@/lib/object-storage/errors";
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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }

    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!contentType) {
      return NextResponse.json({ error: "Неизвестный тип файла" }, { status: 400 });
    }

    let extension: string;
    try {
      extension = parseChatUploadMime(contentType).extension;
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

    const key = buildUploadKey("chat", user.id, extension);
    const body = new Uint8Array(await file.arrayBuffer());

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
