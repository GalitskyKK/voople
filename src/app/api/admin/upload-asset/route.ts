import { NextResponse } from "next/server";

import { isAdminUserId } from "@/lib/admin/auth";
import {
  buildCustomizationStorageKey,
  CUSTOMIZATION_ALLOWED_MIME,
  CUSTOMIZATION_UPLOAD_MAX_BYTES,
  getObjectStorageConfig,
  publicAssetUrl,
  putObject,
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

    if (!isAdminUserId(user.id)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    if (!getObjectStorageConfig()) {
      return NextResponse.json({ error: "S3 не настроен" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const assetFolder = String(formData.get("assetFolder") ?? "").trim();
    const targetFileName = String(formData.get("targetFileName") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
    }
    if (!assetFolder || !targetFileName) {
      return NextResponse.json({ error: "Укажите папку и имя файла" }, { status: 400 });
    }

    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!CUSTOMIZATION_ALLOWED_MIME.has(contentType)) {
      return NextResponse.json({ error: "Формат не поддерживается" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > CUSTOMIZATION_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: `Файл больше ${Math.round(CUSTOMIZATION_UPLOAD_MAX_BYTES / (1024 * 1024))} МБ` },
        { status: 400 },
      );
    }

    const storageKey = buildCustomizationStorageKey(assetFolder, targetFileName);
    const body = new Uint8Array(await file.arrayBuffer());

    await putObject({
      key: storageKey,
      body,
      contentType,
      bucket: "public",
    });

    const publicUrl = publicAssetUrl(storageKey);
    if (!publicUrl) {
      return NextResponse.json({ error: "CDN не настроен" }, { status: 500 });
    }

    return NextResponse.json({
      storageKey,
      assetFolder,
      assetId: targetFileName,
      publicUrl,
    });
  } catch (e) {
    const config = getObjectStorageConfig();
    const message = formatStorageError(e, config?.publicBucket);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
