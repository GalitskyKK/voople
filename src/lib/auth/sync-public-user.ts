import { normalizeUsername } from "@/lib/validation/username";

/** Вызов после login/register — создаёт public.users из auth.users */
export async function syncPublicUser(options?: { username?: string }) {
  const res = await fetch("/api/auth/sync-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      options?.username ? { username: normalizeUsername(options.username) } : {},
    ),
  });
  const data = (await res.json()) as { ok?: boolean; username?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось создать профиль");
  }
  return data;
}
