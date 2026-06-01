export function formatDbError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);

  const e = err as {
    message?: string;
    code?: string;
    detail?: string;
    cause?: unknown;
  };

  const parts: string[] = [];
  if (e.code) parts.push(e.code);
  if (e.detail) parts.push(e.detail);
  if (e.message) parts.push(e.message);

  if (e.cause) {
    parts.push(formatDbError(e.cause));
  }

  return parts.filter(Boolean).join(" — ") || "Database error";
}
