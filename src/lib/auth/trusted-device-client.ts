import { readJsonResponse } from "@/lib/http/json-response";

const STORAGE_KEY = "voople.auth.device.v1";

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
  if (stored && /^[a-f0-9-]{36}$/i.test(stored)) return stored;
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
  const response = await fetch(apiEndpoint(input.apiUrl, "/api/auth/trusted-device"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId: getOrCreateTrustedDeviceId(),
      label: currentDeviceLabel(input.platform),
    }),
  });
  const result = await readJsonResponse<{ error?: string; ok?: boolean }>(response);
  if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Не удалось запомнить устройство");
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
