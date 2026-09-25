import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCurrentVisualCss } from "./lib/load-current-visual-css.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-settings-visual-"));
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const entry = `import {createRoot} from 'react-dom/client';
  import {TRPCReactProvider} from '@/lib/trpc/client';
  import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
  import {AppPreferencesProvider} from '@/components/settings/AppPreferencesProvider';
  import {AppSettingsView} from '@/components/settings/AppSettingsView';
  import {AppShellFrame} from '@/components/layout/AppShellFrame';
  const renderDestination=({href,className,children})=><a href={href} className={className}>{children}</a>;
  function Demo(){return <AppShellFrame routeKind="standard" navigationKind="messenger" sidebar={<aside className="flex h-full flex-col border-r border-[var(--app-border)] p-4 text-sm">VOOPLE</aside>}><main className="voople-scroll h-full overflow-y-auto px-4 sm:px-6"><AppSettingsView renderDestination={renderDestination} privacySettings={<section className="settings-section"><h2>Приватность и активность</h2></section>} subscriptionActive={false}/></main></AppShellFrame>}
  createRoot(document.getElementById('root')).render(<TRPCReactProvider><AppThemeProvider><AppPreferencesProvider><Demo/></AppPreferencesProvider></AppThemeProvider></TRPCReactProvider>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: repo, loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env": '{"NODE_ENV":"development"}' },
});
const css = await loadCurrentVisualCss(repo, { host: "web" });
const server = createServer((request, response) => {
  if (request.url === "/app.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); return; }
  if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end('<!doctype html><html data-app-theme="void"><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const { width, height, theme } of [
    { width: 1440, height: 800, theme: "void" },
    { width: 960, height: 800, theme: "void" },
    { width: 390, height: 844, theme: "void" },
    { width: 360, height: 800, theme: "void" },
    { width: 390, height: 844, theme: "light" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    try {
      await page.getByRole("heading", { name: "Настройки", exact: true }).waitFor({ timeout: 5000 });
    } catch {
      throw new Error(`Settings fixture did not render: ${errors.join(" | ") || await page.locator("body").innerText()}`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole("button", { name: "Приватность" }).click();
    assert.equal(await page.getByRole("button", { name: "Сбросить настройки этого устройства" }).count(), 0);
    await page.getByRole("button", { name: "Внешний вид" }).click();
    assert.equal(await page.getByRole("button", { name: "Сбросить настройки этого устройства" }).count(), 1);
    if (theme === "light") {
      await page.evaluate(() => { localStorage.setItem("voople:app-theme", "light"); });
      await page.reload();
      await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--foreground") === "#191921");
      await page.getByRole("button", { name: "Внешний вид" }).click();
    }
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(artifacts, `settings-${width}-${theme}.png`) });
    await page.close();
    console.log(`PASS settings ${width}px ${theme}: navigation, reset scope and no overflow`);
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
console.log(`Screenshots: ${artifacts}`);
