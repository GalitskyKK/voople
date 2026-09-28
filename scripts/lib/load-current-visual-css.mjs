import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Compile the current shared Tailwind surface and append the desktop host CSS.
 *
 * Visual harnesses used to read desktop/dist, which can silently be older than
 * the source under test. Compiling just CSS is substantially lighter than a
 * renderer build and keeps screenshots tied to the current checkout.
 */
export async function loadCurrentVisualCss(repo, { host = "web" } = {}) {
  const require = createRequire(path.join(repo, "package.json"));
  const postcss = require("postcss");
  const tailwindcss = require("@tailwindcss/postcss");
  const globalsPath = path.join(repo, "src/app/globals.css");
  const messengerPath = path.join(repo, "src/app/styles/messenger-glass.css");
  const desktopPath = path.join(repo, "desktop/src/styles.css");
  const [globals, messenger, desktop] = await Promise.all([
    readFile(globalsPath, "utf8"),
    readFile(messengerPath, "utf8"),
    readFile(desktopPath, "utf8"),
  ]);
  const compiled = await postcss([
    tailwindcss({ base: repo, optimize: false }),
  ]).process(globals, { from: globalsPath });

  const fontPrelude = `
@font-face { font-family: "Geist Voople"; src: url("/fonts/geist-sans.woff2") format("woff2"); font-style: normal; font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Geist Mono Voople"; src: url("/fonts/geist-mono.woff2") format("woff2"); font-style: normal; font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Geist Pixel Square Voople"; src: url("/fonts/geist-pixel-square.woff2") format("woff2"); font-style: normal; font-weight: 400; font-display: swap; }
:root { --font-geist-sans: "Geist Voople"; --font-geist-mono: "Geist Mono Voople"; --font-geist-pixel-square: "Geist Pixel Square Voople"; }
body { font-family: var(--font-geist-sans), system-ui, sans-serif; }
`;
  const desktopCss = desktop
    .replaceAll("../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", "/fonts/geist-sans.woff2")
    .replaceAll("../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2", "/fonts/geist-mono.woff2")
    .replaceAll("../../node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2", "/fonts/geist-pixel-square.woff2");

  return `${compiled.css}\n${messenger}\n${fontPrelude}\n${host === "desktop" ? desktopCss : ""}`;
}
