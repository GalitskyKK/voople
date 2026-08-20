const MAX_URL_LENGTH = 2_048;

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
    || parts[0] >= 224
    || parts[0] === 0;
}

export function normalizeExternalUrl(source: string) {
  const value = source.trim();
  if (!value || value.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(/^www\./i.test(value) ? `https://${value}` : value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) return null;
    if (hostname === "[::1]" || hostname.startsWith("[fc") || hostname.startsWith("[fd") || hostname.startsWith("[fe80")) return null;
    if (isPrivateIpv4(hostname)) return null;
    url.hostname = hostname;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function isTrustedVoopleUrl(source: string) {
  const normalized = normalizeExternalUrl(source);
  if (!normalized) return false;
  const url = new URL(normalized);
  return url.protocol === "https:"
    && (url.hostname === "voople.ru" || url.hostname.endsWith(".voople.ru"));
}
