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
    return `Access Denied${target}: у S3-ключей нет PutObject на этот путь. Для админки нужен доступ к customization/* в voople-assets (посты пишут в uploads/*). См. docs/admin.md`;
  }

  if (code === "NoSuchBucket" || base.includes("NoSuchBucket")) {
    return `Бакет не найден: проверьте S3_BUCKET_PRIVATE в .env.local`;
  }

  return base;
}
