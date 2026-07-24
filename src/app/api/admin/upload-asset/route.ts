import { NextResponse } from "next/server";
import sharp from "sharp";

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

    if (!isAdminUserId(user.id)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (!(await checkRateLimit(rateLimits.adminUpload, `admin-asset-upload:${user.id}`))) {
      return NextResponse.json({ error: "Слишком много загрузок" }, { status: 429 });
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

    const sourceBody = Buffer.from(await file.arrayBuffer());
    const normalizeFeedCard = assetFolder === "feed-cards" && contentType.startsWith("image/");
    if (normalizeFeedCard) {
      const metadata = await sharp(sourceBody, { animated: false }).metadata();
      if (metadata.width !== 1200 || metadata.height !== 240) {
        return NextResponse.json(
          { error: "Бейдж ленты должен иметь точный размер 1200×240 px" },
          { status: 400 },
        );
      }
    }
    const effectiveTargetFileName = normalizeFeedCard
      ? `${targetFileName.replace(/\.[a-z0-9]{2,5}$/i, "")}.webp`
      : targetFileName;
    const storageKey = buildCustomizationStorageKey(assetFolder, effectiveTargetFileName);
    const outputBody = normalizeFeedCard
      ? await sharp(sourceBody, { animated: false })
          .resize(1200, 240, { fit: "fill" })
          .webp({ quality: 94, alphaQuality: 100 })
          .toBuffer()
      : sourceBody;
    const outputContentType = normalizeFeedCard ? "image/webp" : contentType;

    await putObject({
      key: storageKey,
      body: new Uint8Array(outputBody),
      contentType: outputContentType,
      bucket: "public",
    });

    const publicUrl = publicAssetUrl(storageKey);
    if (!publicUrl) {
      return NextResponse.json({ error: "CDN не настроен" }, { status: 500 });
    }

    return NextResponse.json({
      storageKey,
      assetFolder,
      assetId: effectiveTargetFileName,
      publicUrl,
      normalizedSize: normalizeFeedCard ? { width: 1200, height: 240 } : null,
    });
  } catch (e) {
    const config = getObjectStorageConfig();
    const message = formatStorageError(e, config?.publicBucket);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
