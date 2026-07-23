import {
  buildCustomizationStorageKey,
  createPresignedPutUrl,
  CUSTOMIZATION_ALLOWED_MIME,
  CUSTOMIZATION_UPLOAD_MAX_BYTES,
  extensionForCustomizationMime,
  publicAssetUrl,
} from "@/lib/object-storage";
import { defaultAssetFolderForKind, slugifyAssetId } from "@/lib/shop/defaults";
import type { ShopItemKind } from "@/lib/shop/catalog";
import {
  createAdminShopItemRest,
  deleteAdminShopItemRest,
  listAdminShopItemsRest,
  updateAdminShopItemRest,
  validateShopItemInput,
} from "@/server/data/admin-shop-rest";
import type { AdminAssetUploadView, AdminShopItemInput, AdminShopItemRecord } from "@/types/admin-shop";

export async function listAdminShopItems(): Promise<AdminShopItemRecord[]> {
  return listAdminShopItemsRest();
}

export async function createAdminShopItem(input: AdminShopItemInput): Promise<AdminShopItemRecord> {
  validateShopItemInput(input);
  return createAdminShopItemRest(input);
}

export async function updateAdminShopItem(
  itemId: string,
  input: AdminShopItemInput,
): Promise<AdminShopItemRecord> {
  validateShopItemInput({ ...input, id: itemId });
  return updateAdminShopItemRest(itemId, input);
}

export async function deleteAdminShopItem(itemId: string, options?: { confirmInventoryRemoval?: boolean }): Promise<void> {
  return deleteAdminShopItemRest(itemId, options);
}

export async function createCustomizationAssetUpload(input: {
  kind: ShopItemKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  assetFolder?: string;
  assetId?: string;
  targetFileName?: string;
}): Promise<AdminAssetUploadView> {
  const contentType = input.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!CUSTOMIZATION_ALLOWED_MIME.has(contentType)) {
    throw new Error("Допустимы WebP, PNG, JPEG, GIF, MP4, WebM");
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > CUSTOMIZATION_UPLOAD_MAX_BYTES) {
    throw new Error(`Файл больше ${Math.round(CUSTOMIZATION_UPLOAD_MAX_BYTES / (1024 * 1024))} МБ`);
  }

  const folder = input.assetFolder?.trim() || defaultAssetFolderForKind(input.kind);
  if (!folder) {
    throw new Error("Для этого типа предмета загрузка файла не нужна");
  }

  const rawName = input.fileName.trim();
  if (!rawName) throw new Error("Укажите имя файла");

  let fileName: string;
  if (input.targetFileName?.trim()) {
    fileName = input.targetFileName.trim();
  } else {
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(rawName);
    const ext = extensionForCustomizationMime(contentType);
    const assetId =
      input.assetId?.trim() ||
      (hasExt ? slugifyAssetId(rawName) : `${slugifyAssetId(rawName.replace(/\.[^.]+$/, ""))}.${ext}`);
    fileName = assetId.includes(".") ? assetId : `${assetId}.${ext}`;
  }

  const storageKey = buildCustomizationStorageKey(folder, fileName);
  const { uploadUrl, expiresIn } = await createPresignedPutUrl({
    key: storageKey,
    contentType,
    bucket: "public",
  });

  const publicUrl = publicAssetUrl(storageKey);
  if (!publicUrl) throw new Error("CDN не настроен");

  return {
    storageKey,
    uploadUrl,
    publicUrl,
    assetFolder: folder,
    assetId: fileName,
    expiresIn,
  };
}
