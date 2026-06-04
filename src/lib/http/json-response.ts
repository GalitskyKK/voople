/** Ответ HTML (login, 404, 500) вместо JSON — типичный источник Unexpected token '<'. */
export function responseLooksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("<!") || trimmed.startsWith("<html");
}

export async function assertJsonResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    return response;
  }

  const sample = await response.clone().text();
  if (!responseLooksLikeHtml(sample)) {
    return response;
  }

  throw new Error(
    response.redirected
      ? "Сессия истекла — обновите страницу"
      : `Сервер вернул страницу вместо данных (${response.status})`,
  );
}

export async function readJsonResponse<T extends object>(
  response: Response,
): Promise<T | null> {
  await assertJsonResponse(response);
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
