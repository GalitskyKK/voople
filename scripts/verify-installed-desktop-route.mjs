import assert from "node:assert/strict";

import { chromium } from "playwright";

const [endpointArgument, expectedPath] = process.argv.slice(2);
const invitePathPattern = /^\/room-invites\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!endpointArgument || !expectedPath || !invitePathPattern.test(expectedPath)) {
  throw new Error(
    "Usage: node scripts/verify-installed-desktop-route.mjs <local-cdp-endpoint> </room-invites/uuid>",
  );
}

const endpoint = new URL(endpointArgument);
if (endpoint.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(endpoint.hostname)) {
  throw new Error("The WebView2 debugging endpoint must be local HTTP.");
}

const deadline = Date.now() + 45_000;
let browser;
let lastError;

while (!browser && Date.now() < deadline) {
  try {
    browser = await chromium.connectOverCDP(endpoint.toString(), { timeout: 2_500 });
  } catch (error) {
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

if (!browser) {
  throw new Error(`Could not connect to the installed WebView2 app: ${lastError}`);
}

let observedPath = null;
let observedCopy = null;
while (Date.now() < deadline) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      const notice = page.locator("[data-voople-continuation-path]");
      if ((await notice.count()) === 0) continue;
      observedPath = await notice.first().getAttribute("data-voople-continuation-path");
      observedCopy = (await notice.first().textContent())?.replace(/\s+/g, " ").trim() ?? null;
      if (observedPath === expectedPath) break;
    }
    if (observedPath === expectedPath) break;
  }
  if (observedPath === expectedPath) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}

assert.equal(observedPath, expectedPath, "The installed renderer did not consume the expected deep link.");
assert.match(observedCopy ?? "", /Приглашение сохранено/);
assert.match(observedCopy ?? "", /После входа откроем комнату/);
console.log(`PASS installed renderer path: ${expectedPath}`);

// Do not call browser.close(): this is an attached WebView2 host and the caller
// intentionally keeps it alive for the warm-link half of the smoke test.
