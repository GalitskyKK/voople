import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
