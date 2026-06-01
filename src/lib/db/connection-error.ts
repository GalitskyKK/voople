export function isConnectionError(err: unknown): boolean {
  const codes = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EPIPE"];
  const parts: string[] = [];

  if (err instanceof Error) {
    parts.push(err.message);
    const cause = err.cause;
    if (cause instanceof Error) parts.push(cause.message);
    const pgCode = (err as { code?: string }).code;
    if (pgCode) parts.push(pgCode);
  } else {
    parts.push(String(err));
  }

  const text = parts.join(" ");
  return codes.some((c) => text.includes(c));
}
