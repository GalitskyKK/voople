type S3LikeError = {
  name?: string;
  Code?: string;
  message?: string;
};

export function formatStorageError(error: unknown, bucket?: string): string {
  const err = error as S3LikeError;
  const code = err.Code ?? err.name ?? "";
  const base = err.message ?? "Ошибка S3";

  if (code === "AccessDenied" || base.includes("Access Denied")) {
    const target = bucket ? ` (${bucket})` : "";
    return `Access Denied${target}: у S3-ключей нет прав PutObject/GetObject на этот бакет. В Selectel выдайте пользователю ключей доступ к voople-uploads (не только к voople-assets). Политику с публичным чтением с assets сюда копировать нельзя — см. docs/chat-uploads.md`;
  }

  if (code === "NoSuchBucket" || base.includes("NoSuchBucket")) {
    return `Бакет не найден: проверьте S3_BUCKET_PRIVATE в .env.local`;
  }

  return base;
}
