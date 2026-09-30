export const DESKTOP_VERSION_HEADER = "X-Voople-Desktop-Version";
export const VOICE_PROTOCOL_HEADER = "X-Voople-Voice-Protocol";
export const CORE_DIRECT_VOICE_PROTOCOL = "core-direct-v1";
export const DESKTOP_UPDATE_REQUIRED = "VOOPLE_DESKTOP_UPDATE_REQUIRED";

const productionOrigins = new Set([
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
]);

type Version = { parts: [number, number, number]; prerelease: string[] };

export function parseDesktopVersion(value: string | null | undefined): Version | null {
  if (!value) return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  if (!match) return null;
  const parts = [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number];
  if (parts.some((part) => !Number.isSafeInteger(part))) return null;
  const prerelease = match[4]?.split(".") ?? [];
  if (prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith("0"))) return null;
  return { parts, prerelease };
}

export function compareDesktopVersions(left: string, right: string): number | null {
  const a = parseDesktopVersion(left);
  const b = parseDesktopVersion(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a.parts[i] !== b.parts[i]) return Math.sign(a.parts[i] - b.parts[i]);
  }
  if (!a.prerelease.length || !b.prerelease.length) return Math.sign(b.prerelease.length - a.prerelease.length);
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i += 1) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    const aNumeric = /^\d+$/.test(a.prerelease[i]);
    const bNumeric = /^\d+$/.test(b.prerelease[i]);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    if (aNumeric) {
      const left = BigInt(a.prerelease[i]);
      const right = BigInt(b.prerelease[i]);
      if (left !== right) return left > right ? 1 : -1;
    } else {
      const difference = a.prerelease[i].localeCompare(b.prerelease[i], "en");
      if (difference) return Math.sign(difference);
    }
  }
  return 0;
}

export type DesktopRequestIdentity = {
  platform: "web" | "desktop";
  productionDesktop: boolean;
  version: string | null;
  voiceProtocol: string | null;
};

export function desktopRequestIdentity(headers: Headers, development = false): DesktopRequestIdentity {
  const origin = headers.get("origin");
  const productionDesktop = origin !== null && productionOrigins.has(origin);
  const devDesktop = development && (origin === "http://127.0.0.1:1420" || origin === "http://localhost:1420");
  if (!productionDesktop && !devDesktop) {
    return { platform: "web", productionDesktop: false, version: null, voiceProtocol: null };
  }
  return {
    platform: "desktop",
    productionDesktop,
    version: headers.get(DESKTOP_VERSION_HEADER),
    voiceProtocol: headers.get(VOICE_PROTOCOL_HEADER),
  };
}

export function desktopUpdateRequired(identity: DesktopRequestIdentity, minimum: string | undefined): boolean {
  if (!minimum || !identity.productionDesktop) return false;
  if (!parseDesktopVersion(minimum)) throw new Error("VOOPLE_MIN_DESKTOP_VERSION must be valid semver");
  return !identity.version || (compareDesktopVersions(identity.version, minimum) ?? -1) < 0;
}

export function coreDirectCallerEligible(identity: DesktopRequestIdentity): boolean {
  return identity.platform === "web" || (
    identity.voiceProtocol === CORE_DIRECT_VOICE_PROTOCOL && Boolean(parseDesktopVersion(identity.version))
  );
}
