import type { Session } from "@supabase/supabase-js";

import type { DesktopConfig } from "../config";
import { readJsonResponse } from "@/lib/http/json-response";

type SyncUserResult = {
  created?: boolean;
  error?: string;
  ok?: boolean;
  username?: string;
};

export async function syncDesktopUser(
  config: DesktopConfig,
  session: Session,
): Promise<SyncUserResult> {
  const response = await fetch(`${config.apiUrl}/api/auth/sync-user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const result = await readJsonResponse<SyncUserResult>(response);
  if (!response.ok) {
    throw new Error(result?.error ?? `Не удалось синхронизировать профиль (${response.status})`);
  }
  if (!result) throw new Error("Сервер вернул неполный ответ. Повторите попытку.");
  return result;
}
