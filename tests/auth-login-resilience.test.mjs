import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isFutureJwtResponse } from "../src/lib/supabase/fetch-retry.ts";
import {
  isTemporaryAuthError,
  resolveAuthSessionBootstrap,
} from "../src/lib/supabase/session-bootstrap.ts";

const read = (path) => readFileSync(path, "utf8");

test("Supabase proxy lets the runtime calculate the decoded response length", () => {
  const proxy = read("src/app/api/supabase/[...path]/route.ts");
  const responseHeaders = proxy.match(/const FORWARDED_RESPONSE_HEADERS = \[([\s\S]*?)\] as const;/)?.[1] ?? "";

  assert.doesNotMatch(responseHeaders, /content-length/);
  assert.match(responseHeaders, /content-type/);
});

test("OTP login trusts the device before idempotent profile synchronization", () => {
  const login = read("src/app/(auth)/login/page.tsx");
  const finishLogin = login.match(/const finishLogin = async[\s\S]*?\n  };/)?.[0] ?? "";
  const sync = read("src/lib/auth/sync-public-user.ts");

  assert.ok(finishLogin.indexOf("trustCurrentDevice") < finishLogin.indexOf("syncPublicUser"));
  assert.match(sync, /const SYNC_ATTEMPTS = 2/);
  assert.match(sync, /readJsonResponse<SyncPublicUserResult>/);
  assert.doesNotMatch(sync, /await res\.json\(\)/);
});

test("small auth clock skew is treated as temporary instead of logging the user out", () => {
  assert.equal(isTemporaryAuthError({ message: "JWT issued at future" }), true);
  assert.equal(isTemporaryAuthError({ message: "invalid JWT signature", status: 401 }), false);
});

test("desktop-safe shared tRPC code never dereferences a Node process global", () => {
  const client = read("src/lib/trpc/client.tsx");
  assert.doesNotMatch(client, /\bprocess\.env/);
  assert.match(client, /runtimeProcess\?\.env/);
});

test("only the exact transient Supabase clock-skew response is retried", async () => {
  assert.equal(await isFutureJwtResponse(new Response(
    JSON.stringify({ message: "JWT issued at future" }),
    { status: 401 },
  )), true);
  assert.equal(await isFutureJwtResponse(new Response(
    JSON.stringify({ message: "invalid JWT signature" }),
    { status: 401 },
  )), false);
  assert.equal(await isFutureJwtResponse(new Response("JWT issued at future", { status: 403 })), false);
});

test("password login retries bounded Supabase transport failures", () => {
  const route = read("src/app/api/auth/password-login/route.ts");
  assert.match(route, /createFetchWithRetry\(2, 10_000\)/);
});

test("session bootstrap preserves transient failures without masking expired credentials", async () => {
  const ready = await resolveAuthSessionBootstrap(async () => ({
    value: { id: "viewer" },
    error: null,
  }));
  assert.deepEqual(ready, { status: "ready", value: { id: "viewer" } });

  const temporary = await resolveAuthSessionBootstrap(async () => ({
    value: null,
    error: { message: "JWT issued at future", status: 401 },
  }));
  assert.equal(temporary.status, "error");
  assert.equal(temporary.reason, "temporary");

  const expired = await resolveAuthSessionBootstrap(async () => ({
    value: null,
    error: { message: "invalid JWT signature", status: 401 },
  }));
  assert.deepEqual(expired, { status: "ready", value: null });

  const unexpected = await resolveAuthSessionBootstrap(async () => {
    throw new Error("storage adapter failed");
  });
  assert.equal(unexpected.status, "error");
  assert.equal(unexpected.reason, "unexpected");
});

test("session bootstrap has a bounded timeout state", async () => {
  const result = await resolveAuthSessionBootstrap(
    () => new Promise(() => undefined),
    5,
  );
  assert.equal(result.status, "error");
  assert.equal(result.reason, "timeout");
});

test("web and desktop expose one recoverable bootstrap contract", () => {
  const webLayout = read("src/app/(main)/layout.tsx");
  const webRecovery = read("src/components/auth/WebSessionBootstrapRecovery.tsx");
  const desktopProvider = read("desktop/src/auth/AuthProvider.tsx");
  const desktopSupabase = read("desktop/src/auth/supabase.ts");

  assert.match(webLayout, /getServerAuthBootstrap/);
  assert.match(webLayout, /WebSessionBootstrapRecovery/);
  assert.ok(
    webLayout.indexOf('bootstrap.status === "error"') <
      webLayout.indexOf("const authenticated = Boolean(user)"),
  );
  assert.match(webRecovery, /window\.addEventListener\("online", retry\)/);
  assert.match(desktopProvider, /event === "INITIAL_SESSION"/);
  assert.match(desktopProvider, /getUser\(data\.session\.access_token\)/);
  assert.match(desktopProvider, /window\.addEventListener\("online", retry/);
  assert.match(desktopSupabase, /createFetchWithRetry\(2, 8_000\)/);
});

test("Server Components share one request-scoped optional viewer result", () => {
  const service = read("src/server/services/auth-session.service.ts");
  const surfaces = [
    "src/app/(main)/layout.tsx",
    "src/app/(main)/[username]/page.tsx",
    "src/app/(main)/feed/page.tsx",
    "src/app/(main)/group/[slug]/page.tsx",
    "src/app/(main)/hashtag/[tag]/page.tsx",
    "src/app/(main)/me/page.tsx",
    "src/app/(main)/post/[postId]/page.tsx",
    "src/app/onboarding/page.tsx",
  ];

  assert.match(service, /cache\(async \(\) =>/);
  assert.match(service, /resolveAuthSessionBootstrap<User>/);
  for (const path of surfaces) {
    const source = read(path);
    assert.match(source, /getServerAuthBootstrap\(\)/, path);
    assert.doesNotMatch(source, /auth\.getUser\(/, path);
    assert.doesNotMatch(source, /createClient\(/, path);
  }
});
