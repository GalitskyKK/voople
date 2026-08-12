export async function downloadAccountExport(url: string, accessToken?: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "Не удалось скачать данные аккаунта");
  }

  const blob = await response.blob();
  const match = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/i);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = match?.[1] ?? "voople-account.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
