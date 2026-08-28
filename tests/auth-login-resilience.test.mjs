import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isTemporaryAuthError } from "../src/lib/supabase/auth-claims.ts";
import { isFutureJwtResponse } from "../src/lib/supabase/fetch-retry.ts";

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
