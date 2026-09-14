import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

import { AccessToken } from "livekit-server-sdk";

const deadline = setTimeout(() => {
  console.error("LiveKit connectivity check exceeded the 45 second safety deadline.");
  process.exit(1);
}, 45_000);

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const source of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = source.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function safeError(error) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : String(error);
  return `${name}: ${message}`
    .replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, "[redacted-token]")
    .slice(0, 500);
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const livekitUrl = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;
const apiKey = process.env.LIVEKIT_API_KEY?.trim();
const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
if (!livekitUrl || !apiKey || !apiSecret) {
  console.error("LiveKit connectivity check requires LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.");
  process.exit(1);
}

const endpoint = new URL(livekitUrl);
if (endpoint.protocol !== "wss:" && endpoint.protocol !== "ws:") {
  console.error("LiveKit endpoint must use wss:// or ws://.");
  process.exit(1);
}

const roomName = `health-${randomUUID()}`;
const identity = `health:${randomUUID()}`;
const token = new AccessToken(apiKey, apiSecret, { identity, ttl: "2m" });
token.addGrant({
  roomJoin: true,
  room: roomName,
  canPublish: false,
  canSubscribe: false,
  canPublishData: false,
});
const jwt = await token.toJwt();

const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const { chromium } = require("playwright");
const bundle = await build({
  stdin: {
    contents: `import { Room } from "livekit-client";
      window.verifyLiveKit = async ({ url, token }) => {
        const room = new Room({ adaptiveStream: true, dynacast: true });
        try {
          await room.connect(url, token, {
            autoSubscribe: false,
            maxRetries: 1,
            websocketTimeout: 12000,
            peerConnectionTimeout: 15000,
          });
          return { state: room.state };
        } finally {
          await room.disconnect();
        }
      };`,
    resolveDir: process.cwd(),
    loader: "js",
  },
  bundle: true,
  write: false,
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
});

const server = createServer((request, response) => {
  if (request.url === "/app.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(bundle.outputFiles[0].text);
    return;
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html><body><script src="/app.js"></script></body></html>');
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(
    (input) => window.verifyLiveKit(input),
    { url: endpoint.toString(), token: jwt },
  );
  if (result.state !== "connected") {
    throw new Error(`Unexpected LiveKit state: ${result.state}`);
  }
  console.log(`LiveKit connectivity passed (${endpoint.hostname}).`);
} catch (error) {
  console.error(`LiveKit connectivity failed (${endpoint.hostname}): ${safeError(error)}`);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
