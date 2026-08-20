import assert from "node:assert/strict";
import test from "node:test";

import { isTrustedVoopleUrl, normalizeExternalUrl } from "../src/lib/links/normalize-url.ts";

test("normalizes public http links and strips fragments", () => {
  assert.equal(
    normalizeExternalUrl("https://пример.рф/path?q=1#private-fragment"),
    "https://xn--e1afmkfd.xn--p1ai/path?q=1",
  );
  assert.equal(normalizeExternalUrl("www.example.com/docs"), "https://www.example.com/docs");
});

test("rejects active schemes, credentials and local destinations", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///c:/secret.txt",
    "https://user:pass@example.com/",
    "http://localhost:3000/",
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://192.168.1.10/",
    "http://100.64.0.1/",
    "http://224.0.0.1/",
    "http://[::1]/",
  ]) assert.equal(normalizeExternalUrl(value), null, value);
});

test("only HTTPS Voople domains bypass the external interstitial", () => {
  assert.equal(isTrustedVoopleUrl("https://voople.ru/feed"), true);
  assert.equal(isTrustedVoopleUrl("https://auth.voople.ru/callback"), true);
  assert.equal(isTrustedVoopleUrl("http://voople.ru/feed"), false);
  assert.equal(isTrustedVoopleUrl("https://voople.ru.example.com/"), false);
});
