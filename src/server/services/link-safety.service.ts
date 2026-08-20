import "server-only";

import { createHash } from "node:crypto";
import { domainToUnicode } from "node:url";

import { normalizeExternalUrl } from "@/lib/links/normalize-url";
import { lookupGoogleWebRisk } from "@/server/integrations/google-web-risk";
import type { LinkSafetyVerdict } from "@/types/link-safety";

type CachedVerdict = Pick<LinkSafetyVerdict, "status" | "threats" | "expiresAt" | "provider">;
const memoryCache = new Map<string, CachedVerdict>();
const MAX_CACHE_ENTRIES = 1_000;

export async function checkLinkSafety(source: string): Promise<LinkSafetyVerdict> {
  const normalizedUrl = normalizeExternalUrl(source);
  if (!normalizedUrl) throw new Error("Ссылка имеет небезопасный или неподдерживаемый адрес");
  const parsed = new URL(normalizedUrl);
  const cacheKey = createHash("sha256").update(normalizedUrl).digest("hex");
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.parse(cached.expiresAt) > Date.now()) {
    return {
      ...cached,
      normalizedUrl,
      asciiHost: parsed.hostname,
      displayHost: domainToUnicode(parsed.hostname) || parsed.hostname,
    };
  }

  let result: CachedVerdict;
  try {
    const lookup = await lookupGoogleWebRisk(normalizedUrl);
    result = lookup
      ? {
          status: lookup.threats.length ? "unsafe" : "safe",
          threats: lookup.threats,
          expiresAt: lookup.expiresAt,
          provider: "google-web-risk",
        }
      : {
          status: "unknown",
          threats: [],
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          provider: "unavailable",
        };
  } catch {
    result = {
      status: "unknown",
      threats: [],
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      provider: "unavailable",
    };
  }
  if (memoryCache.size >= MAX_CACHE_ENTRIES) memoryCache.delete(memoryCache.keys().next().value!);
  memoryCache.set(cacheKey, result);
  return {
    ...result,
    normalizedUrl,
    asciiHost: parsed.hostname,
    displayHost: domainToUnicode(parsed.hostname) || parsed.hostname,
  };
}
