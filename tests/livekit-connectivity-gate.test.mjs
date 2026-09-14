import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("LiveKit connectivity gate is bounded and never publishes user media", async () => {
  const [script, manifest] = await Promise.all([
    readFile(new URL("../scripts/verify-livekit-connect.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(script, /45_000/);
  assert.match(script, /health-\$\{randomUUID\(\)\}/);
  assert.match(script, /health:\$\{randomUUID\(\)\}/);
  assert.match(script, /canPublish:\s*false/);
  assert.match(script, /canSubscribe:\s*false/);
  assert.match(script, /await room\.connect/);
  assert.match(script, /\[redacted-token\]/);
  assert.doesNotMatch(script, /console\.(?:log|info|error)\([^\n]*(?:apiKey|apiSecret|jwt|token)/);
  assert.match(manifest, /"check:livekit":\s*"node scripts\/verify-livekit-connect\.mjs"/);
});
