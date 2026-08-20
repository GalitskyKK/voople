import "server-only";

type WebRiskResponse = {
  threat?: {
    threatTypes?: string[];
    expireTime?: string;
  };
};

export async function lookupGoogleWebRisk(url: string) {
  const apiKey = process.env.GOOGLE_WEB_RISK_API_KEY?.trim();
  if (!apiKey) return null;

  const query = new URLSearchParams({ uri: url, key: apiKey });
  for (const threat of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]) {
    query.append("threatTypes", threat);
  }
  const response = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`Web Risk rejected the lookup (${response.status})`);
  const payload = await response.json() as WebRiskResponse;
  return {
    threats: payload.threat?.threatTypes ?? [],
    expiresAt: payload.threat?.expireTime ?? new Date(Date.now() + 10 * 60_000).toISOString(),
  };
}
