/** Публичный origin приложения (return_url ЮKassa, ссылки в письмах). */
export function getAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}
