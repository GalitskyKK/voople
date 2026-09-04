export type ShareLinkRequest = {
  url: string;
  title?: string;
  text?: string;
  mode?: "share" | "copy";
};

type ShareEnvironment = {
  origin: string;
  share?: (data: { url: string; title?: string; text?: string }) => Promise<void>;
  copy?: (url: string) => Promise<void>;
};

export async function shareLink(request: ShareLinkRequest, environment: ShareEnvironment) {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    url = new URL(request.url, environment.origin);
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Недоступная ссылка");
  }
  if (request.mode !== "copy" && environment.share) {
    try {
      await environment.share({ url: url.href, title: request.title, text: request.text });
      return "shared" as const;
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
        return "cancelled" as const;
      }
    }
  }
  if (!environment.copy) throw new Error("Буфер обмена недоступен");
  await environment.copy(url.href);
  return "copied" as const;
}
