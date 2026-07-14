export type AdminCustomizationUploadResult = {
  assetFolder: string;
  assetId: string;
  publicUrl: string;
  storageKey: string;
};

export async function uploadAdminCustomizationAsset(input: {
  file: File;
  assetFolder: string;
  targetFileName: string;
}): Promise<AdminCustomizationUploadResult> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("assetFolder", input.assetFolder);
  formData.append("targetFileName", input.targetFileName);

  const response = await fetch("/api/admin/upload-asset", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { error?: string } & Partial<AdminCustomizationUploadResult>;

  if (!response.ok) {
    throw new Error(payload.error ?? "Не удалось загрузить файл");
  }

  if (!payload.assetFolder || !payload.assetId || !payload.publicUrl || !payload.storageKey) {
    throw new Error("Некорректный ответ сервера");
  }

  return {
    assetFolder: payload.assetFolder,
    assetId: payload.assetId,
    publicUrl: payload.publicUrl,
    storageKey: payload.storageKey,
  };
}
