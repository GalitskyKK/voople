import assert from "node:assert/strict";
import test from "node:test";

import {
  getOrCreateTrustedDeviceId,
  startTrustedPasswordLogin,
  TrustedDeviceSaveError,
  trustCurrentDeviceWithRetry,
} from "../src/lib/auth/trusted-device-client.ts";

const STORAGE_KEY = "voople.auth.device.v1";
const sampleId = "cb956acf-332c-4d8e-9d33-ff93449f9eb3";
const input = { accessToken: "test-token", platform: "web" };

function installBrowser() {
  const store = new Map();
  const previous = { window: globalThis.window, fetch: globalThis.fetch, crypto: globalThis.crypto };
  let generated = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    } },
  });
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID: () => { generated += 1; return sampleId; } },
  });
  return {
    store,
    generated: () => generated,
    restore: () => {
      Object.defineProperty(globalThis, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: previous.crypto });
      globalThis.fetch = previous.fetch;
    },
  };
}

test("same persisted device: OTP, trust save, then password login without OTP; revocation requires OTP", async () => {
  const browser = installBrowser();
  const trusted = new Set();
  let otpConfirmed = false;
  try {
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith("/password-login")) {
        return Response.json(trusted.has(body.deviceId)
          ? { accessToken: "test-token", refreshToken: "test-refresh" }
          : { verificationRequired: true }, { status: trusted.has(body.deviceId) ? 200 : 202 });
      }
      assert.equal(otpConfirmed, true);
      trusted.add(body.deviceId);
      return Response.json({ ok: true });
    };
    const password = { email: "a@example.com", password: "test-password" };
    assert.equal((await startTrustedPasswordLogin(password)).verificationRequired, true);
    otpConfirmed = true;
    await trustCurrentDeviceWithRetry(input);
    const again = await startTrustedPasswordLogin(password);
    assert.equal(again.verificationRequired, undefined);
    assert.equal(again.accessToken, "test-token");
    assert.equal(browser.generated(), 1);
    trusted.clear();
    assert.equal((await startTrustedPasswordLogin(password)).verificationRequired, true);
  } finally { browser.restore(); }
});

test("transient trust failure retries a bounded number of times and succeeds", async () => {
  const browser = installBrowser();
  let attempts = 0;
  try {
    globalThis.fetch = async () => {
      attempts += 1;
      return Response.json(attempts < 3 ? { error: "temporary" } : { ok: true }, { status: attempts < 3 ? 503 : 200 });
    };
    await trustCurrentDeviceWithRetry(input);
    assert.equal(attempts, 3);
  } finally { browser.restore(); }
});

test("transport failure retries, but auth rejection never retries", async () => {
  const browser = installBrowser();
  let attempts = 0;
  const previousWarn = console.warn;
  try {
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("network unavailable");
      return Response.json({ ok: true });
    };
    await trustCurrentDeviceWithRetry(input);
    assert.equal(attempts, 2);
    console.warn = () => undefined;
    globalThis.fetch = async () => {
      attempts += 1;
      return Response.json({ error: "unauthorized" }, { status: 401 });
    };
    await assert.rejects(trustCurrentDeviceWithRetry(input), (error) =>
      error instanceof TrustedDeviceSaveError && error.category === "auth");
    assert.equal(attempts, 3);
  } finally { console.warn = previousWarn; browser.restore(); }
});

test("permanent trust failure stays observable and is not retried", async () => {
  const browser = installBrowser();
  let attempts = 0;
  const previousWarn = console.warn;
  const diagnostics = [];
  try {
    console.warn = (...args) => diagnostics.push(args);
    globalThis.fetch = async () => {
      attempts += 1;
      return Response.json({ error: "invalid device" }, { status: 400 });
    };
    await assert.rejects(trustCurrentDeviceWithRetry(input), (error) =>
      error instanceof TrustedDeviceSaveError && error.category === "request" && error.status === 400);
    assert.equal(attempts, 1);
    assert.deepEqual(diagnostics[0][1], { platform: "web", phase: "save", status: 400, category: "request" });
  } finally { console.warn = previousWarn; browser.restore(); }
});

test("storage retains a valid UUID and replaces a corrupt value exactly once", () => {
  const browser = installBrowser();
  try {
    browser.store.set(STORAGE_KEY, "not-a-uuid");
    assert.equal(getOrCreateTrustedDeviceId(), sampleId);
    assert.equal(getOrCreateTrustedDeviceId(), sampleId);
    assert.equal(browser.generated(), 1);
    browser.store.delete(STORAGE_KEY);
    assert.equal(getOrCreateTrustedDeviceId(), sampleId);
    assert.equal(browser.generated(), 2);
  } finally { browser.restore(); }
});

test("web and desktop expose authenticated recovery instead of requesting OTP twice", async () => {
  const { readFileSync } = await import("node:fs");
  const web = readFileSync("src/app/(auth)/login/page.tsx", "utf8");
  const desktop = readFileSync("desktop/src/auth/DesktopLogin.tsx", "utf8");
  const router = readFileSync("desktop/src/DesktopConfiguredApp.tsx", "utf8");
  for (const source of [web, desktop]) {
    assert.match(source, /trustCurrentDeviceWithRetry/);
    assert.match(source, /Не удалось запомнить это устройство/);
    assert.match(source, /Продолжить без запоминания/);
    assert.doesNotMatch(source, /trustCurrentDevice\([\s\S]*?\.catch\(\(\) => undefined\)/);
  }
  assert.match(router, /!session \|\| deviceTrustPending/);
});
