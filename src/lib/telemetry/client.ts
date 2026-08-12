import type {
  ClientErrorSource,
  ClientTelemetryEvent,
  TelemetryPlatform,
} from "./types";

type TelemetryConfig = {
  enabled: boolean;
  endpoint: string;
  platform: TelemetryPlatform;
  release?: string;
};

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: false,
  endpoint: "/api/telemetry",
  platform: "web",
};

let config = DEFAULT_CONFIG;
let initialized = false;
let errorCount = 0;
let metricCount = 0;
const recentErrors = new Map<string, number>();

export function initializeClientTelemetry(nextConfig: TelemetryConfig) {
  config = {
    ...nextConfig,
    endpoint: nextConfig.endpoint.replace(/\/+$/, "") || "/api/telemetry",
  };
  if (!config.enabled || initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("error", (event) => {
    reportClientError(event.error ?? new Error(event.message), "window-error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, "unhandled-rejection");
  });
}

export function reportClientError(
  reason: unknown,
  source: ClientErrorSource = "react-boundary",
) {
  if (!config.enabled || errorCount >= 30) return;
  const error = normalizeError(reason);
  const fingerprint = `${source}:${error.name}:${error.message}:${currentRoute()}`;
  const now = Date.now();
  if (now - (recentErrors.get(fingerprint) ?? 0) < 30_000) return;
  recentErrors.set(fingerprint, now);
  errorCount += 1;

  sendTelemetry({
    ...baseEvent("error"),
    source,
    ...error,
  });
}

export function reportClientMetric(input: {
  name: string;
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
}) {
  if (!config.enabled || metricCount >= 100 || !Number.isFinite(input.value)) return;
  metricCount += 1;
  sendTelemetry({
    ...baseEvent("metric"),
    name: sanitizeText(input.name, 80),
    value: Math.max(0, input.value),
    rating: input.rating,
    navigationType: input.navigationType
      ? sanitizeText(input.navigationType, 40)
      : undefined,
  });
}

function baseEvent<K extends ClientTelemetryEvent["kind"]>(kind: K) {
  return {
    version: 1 as const,
    kind,
    platform: config.platform,
    route: currentRoute(),
    occurredAt: new Date().toISOString(),
    release: config.release ? sanitizeText(config.release, 40) : undefined,
  };
}

function sendTelemetry(event: ClientTelemetryEvent) {
  const body = JSON.stringify(event);
  void fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    credentials: "omit",
    keepalive: body.length < 8_000,
  }).catch(() => undefined);
}

function normalizeError(reason: unknown) {
  if (reason instanceof Error) {
    return {
      name: sanitizeText(reason.name || "Error", 80),
      message: sanitizeText(reason.message || "Unknown error", 500),
      stack: reason.stack ? sanitizeStack(reason.stack) : undefined,
    };
  }
  return {
    name: "NonErrorRejection",
    message: sanitizeText(typeof reason === "string" ? reason : "Unknown rejection", 500),
  };
}

function currentRoute() {
  if (typeof window === "undefined") return "/";
  return routeTemplate(window.location.pathname);
}

function routeTemplate(pathname: string) {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""));
  if (segments.length === 0) return "/";

  const root = segments[0].toLowerCase();
  if (["messages", "post"].includes(root) && segments.length > 1) {
    return `/${root}/_id`;
  }
  if (root === "invite" && segments.length > 1) return "/invite/_token";
  if (root === "hashtag" && segments.length > 1) return "/hashtag/_tag";

  const staticRoots = new Set([
    "admin",
    "events",
    "explore",
    "feed",
    "help",
    "legal",
    "login",
    "me",
    "messages",
    "notifications",
    "onboarding",
    "register",
    "settings",
    "shop",
  ]);
  if (!staticRoots.has(root)) return "/_profile";
  return `/${segments.slice(0, 4).join("/")}`.slice(0, 160);
}

function sanitizeStack(stack: string) {
  return stack
    .split("\n")
    .slice(0, 8)
    .map((line) => sanitizeText(line, 240))
    .join("\n")
    .slice(0, 1_800);
}

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/https?:\/\/[^\s)]+/g, (url) => stripUrlDetails(url))
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[id]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]+){1,2}\b/g, "[token]")
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, "[secret]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function stripUrlDetails(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[url]";
  }
}
