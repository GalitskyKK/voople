import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authEntryHref, onboardingHref, safeAuthContinuation } from "../src/lib/auth/continuation.ts";

const invite = "/room-invites/11111111-1111-4111-8111-111111111111";
const target = (href) => new URL(href, "https://voople.example").searchParams.get("redirect");

test("auth continuation survives login/register round trips and reloads", () => {
  let href = authEntryHref("/login", invite);
  for (let index = 0; index < 10; index += 1) {
    href = authEntryHref(index % 2 ? "/login" : "/register", target(href));
    assert.equal(target(href), invite);
  }
  assert.equal(target(onboardingHref("test_user", target(href))), invite);
  assert.equal(target(authEntryHref("/login", target(href))), invite);
});

test("session loss during onboarding retains the onboarding route and invite", () => {
  const onboarding = onboardingHref("test_user", invite);
  const login = authEntryHref("/login", onboarding);
  assert.equal(target(login), onboarding);
  assert.equal(target(target(login)), invite);
});

test("auth continuation rejects external, ambiguous and malformed paths", () => {
  for (const value of [undefined, null, 1, {}, [invite], "", "profile", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", " /feed", "/\nevil", "/\tevil", "/%2fevil.example", "/%5Cevil.example", "/%252fevil.example", "/%255cevil.example", "/%00", "/%250a", "/%", "/foo/..//evil.example", "/foo%2f..%2f..%2f%2fevil.example", "/" + "a".repeat(2048)]) {
    assert.equal(safeAuthContinuation(value), null, JSON.stringify(value));
    assert.equal(authEntryHref("/login", value), "/login");
  }
});

test("ordinary internal destinations retain search and hash without external navigation", () => {
  for (const value of [invite, "/feed", "/messages?chat=abc#latest", "/group/test_group", "/hashtag/%D1%82%D0%B5%D1%81%D1%82", "/search?q=https%3A%2F%2Fexample.com"]) {
    assert.equal(safeAuthContinuation(value), value);
    assert.equal(new URL(safeAuthContinuation(value), "https://voople.example").origin, "https://voople.example");
  }
  assert.equal(onboardingHref("a&redirect=//evil.example", invite).split("&redirect=").length, 2);
  assert.equal(authEntryHref("/register", null), "/register");
});

test("web auth and onboarding use the same validator and preserve the continuation links", () => {
  const read = (path) => readFileSync(path, "utf8");
  for (const file of ["src/app/(auth)/login/page.tsx", "src/app/(auth)/register/page.tsx", "src/app/onboarding/page.tsx"]) {
    const source = read(file);
    assert.match(source, /safeAuthContinuation/);
    assert.doesNotMatch(source, /requestedRedirect\?\.startsWith/);
  }
  assert.match(read("src/app/(auth)/login/page.tsx"), /WebAuthContinuationLink entry="\/register"/);
  assert.match(read("src/app/(auth)/register/page.tsx"), /WebAuthContinuationLink entry="\/login"/);
  const link = read("src/components/auth/WebAuthContinuationLink.tsx");
  assert.match(link, /Suspense fallback/);
  assert.match(link, /authEntryHref\(entry, params.get\("redirect"\)\)/);
  assert.doesNotMatch(link, /localStorage|sessionStorage|joinRoom|acceptInvite/);
});
