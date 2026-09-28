import { readJsonResponse } from "../http/json-response.ts";

const STORAGE_KEY = "voople.auth.device.v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TrustedDeviceSaveError extends Error {
  readonly category: "network" | "server" | "auth" | "request" | "response";
  readonly status: number | null;
  constructor(
    message: string,
    category: "network" | "server" | "auth" | "request" | "response",
    status: number | null,
  ) {
    super(message);
    this.name = "TrustedDeviceSaveError";
    this.category = category;
    this.status = status;
  }
}

export type TrustedDeviceView = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

function apiEndpoint(apiUrl: string | undefined, path: string) {
  return `${apiUrl?.replace(/\/+$/, "") ?? ""}${path}`;
}

export function getOrCreateTrustedDeviceId() {
  if (typeof window === "undefined") throw new Error("Device storage is unavailable");
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && UUID_PATTERN.test(stored)) return stored;
  const created = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
}

export function currentDeviceLabel(platform: "web" | "desktop") {
  if (platform === "desktop") return "Voople Desktop";
  if (typeof navigator === "undefined") return "Web browser";
  const agent = navigator.userAgent;
  const browser = agent.includes("Edg/") ? "Edge" : agent.includes("Firefox/") ? "Firefox" : agent.includes("Chrome/") ? "Chrome" : agent.includes("Safari/") ? "Safari" : "Browser";
  const os = agent.includes("Windows") ? "Windows" : agent.includes("Mac OS") ? "macOS" : agent.includes("Linux") ? "Linux" : "device";
  return `${browser} · ${os}`;
}

export async function startTrustedPasswordLogin(input: {
  apiUrl?: string;
  email: string;
  password: string;
  captchaToken?: string;
}) {
  const response = await fetch(apiEndpoint(input.apiUrl, "/api/auth/password-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      captchaToken: input.captchaToken,
      deviceId: getOrCreateTrustedDeviceId(),
    }),
  });
  const result = await readJsonResponse<{
    error?: string;
    verificationRequired?: boolean;
    accessToken?: string;
    refreshToken?: string;
  }>(response);
  if (!response.ok || !result) {
    throw new Error(result?.error ?? "Сервер входа вернул неполный ответ");
  }
  return result;
}

export async function trustCurrentDevice(input: {
  apiUrl?: string;
  accessToken: string;
  platform: "web" | "desktop";
}) {
  const deviceId = getOrCreateTrustedDeviceId();
  let response: Response;
  try {
    response = await fetch(apiEndpoint(input.apiUrl, "/api/auth/trusted-device"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId,
        label: currentDeviceLabel(input.platform),
      }),
    });
  } catch {
    throw new TrustedDeviceSaveError("Не удалось связаться с сервером", "network", null);
  }
  let result: { error?: string; ok?: boolean } | null;
  try {
    result = await readJsonResponse<{ error?: string; ok?: boolean }>(response);
  } catch {
    throw new TrustedDeviceSaveError("Сервер вернул неожиданный ответ", "response", response.status);
  }
  if (!response.ok || !result?.ok) {
    const category = response.status >= 500 ? "server" : response.status === 401 || response.status === 403 ? "auth" : response.ok ? "response" : "request";
    throw new TrustedDeviceSaveError(result?.error ?? "Не удалось запомнить устройство", category, response.status);
  }
}

export async function trustCurrentDeviceWithRetry(input: {
  apiUrl?: string;
  accessToken: string;
  platform: "web" | "desktop";
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await trustCurrentDevice(input);
      return;
    } catch (error) {
      const failure = error instanceof TrustedDeviceSaveError
        ? error
        : new TrustedDeviceSaveError("Не удалось прочитать устройство", "request", null);
      if (attempt < 2 && (failure.category === "network" || failure.category === "server")) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        continue;
      }
      console.warn("[voople:auth] device-trust.failed", {
        platform: input.platform,
        phase: "save",
        status: failure.status,
        category: failure.category,
      });
      throw failure;
    }
  }
}

export async function listTrustedDevices(input: { apiUrl?: string; accessToken: string }) {
  const response = await fetch(apiEndpoint(input.apiUrl, "/api/auth/trusted-device"), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "X-Voople-Device": getOrCreateTrustedDeviceId(),
    },
  });
  const result = await readJsonResponse<{ error?: string; devices?: TrustedDeviceView[] }>(response);
  if (!response.ok || !result?.devices) throw new Error(result?.error ?? "Не удалось загрузить устройства");
  return result.devices;
}

export async function revokeTrustedDevice(input: {
  apiUrl?: string;
  accessToken: string;
  deviceRecordId: string;
}) {
  const response = await fetch(apiEndpoint(input.apiUrl, "/api/auth/trusted-device"), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceRecordId: input.deviceRecordId }),
  });
  const result = await readJsonResponse<{ error?: string; ok?: boolean }>(response);
  if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Не удалось удалить устройство");
}
