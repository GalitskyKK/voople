import { normalizeUsername } from "@/lib/validation/username";
import { readJsonResponse } from "@/lib/http/json-response";

type SyncPublicUserResult = {
  ok?: boolean;
  created?: boolean;
  username?: string;
  error?: string;
};

const SYNC_ATTEMPTS = 2;

/** Вызов после login/register — создаёт public.users из auth.users */
export async function syncPublicUser(options?: { username?: string }) {
  for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt += 1) {
    let response: Response;
    let data: SyncPublicUserResult | null;
    try {
      response = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          options?.username ? { username: normalizeUsername(options.username) } : {},
        ),
      });
      data = await readJsonResponse<SyncPublicUserResult>(response);
    } catch (error) {
      if (attempt === SYNC_ATTEMPTS - 1) {
        throw new Error("Ответ сервера оборвался. Повторите вход.", { cause: error });
      }
      continue;
    }

    if (response.ok && data?.ok) return data;
    if (data && response.status < 500) {
      throw new Error(data.error ?? "Не удалось подготовить профиль");
    }
    if (attempt === SYNC_ATTEMPTS - 1) {
      throw new Error(data?.error ?? "Ответ сервера оборвался. Повторите вход.");
    }
  }
  throw new Error("Не удалось подготовить профиль");
}
