import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const desktopSourceRoot = path.join(root, "desktop", "src");
const baseline = JSON.parse(
  await readFile(path.join(root, ".architecture-baseline.json"), "utf8"),
);

const errors = [];
const notices = [];
const sourceFiles = [];
const desktopFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      sourceFiles.push(absolute);
    }
  }
}

async function walkDesktop(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkDesktop(absolute);
    else if (/\.(ts|tsx)$/.test(entry.name)) desktopFiles.push(absolute);
  }
}

function relative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function limitFor(file) {
  if (file.endsWith(".tsx") && file.startsWith("src/components/")) return 400;
  if (file.startsWith("src/server/")) return 600;
  if (file.startsWith("src/app/")) return 400;
  return 500;
}

await walk(sourceRoot);
await walkDesktop(desktopSourceRoot);

for (const absolute of sourceFiles) {
  const file = relative(absolute);
  const content = await readFile(absolute, "utf8");
  const lines = content.split(/\r?\n/).length;
  const exception = baseline.exceptions[file];
  const hardLimit = exception?.maxLines ?? limitFor(file);

  if (lines > hardLimit) {
    errors.push(
      `${file}: ${lines} lines exceeds ${hardLimit}` +
        (exception ? " (baseline files may not grow)" : ""),
    );
  } else if (
    file.endsWith(".tsx") &&
    file.startsWith("src/components/") &&
    lines > 250
  ) {
    notices.push(`${file}: ${lines} lines; refactor before adding more`);
  }

  if (
    /^\s*["']use client["'];/m.test(content) &&
    (file.startsWith("src/components/") || file.startsWith("src/hooks/")) &&
    /from\s+["']@\/server(?:\/|["'])/.test(content)
  ) {
    errors.push(`${file}: client-facing code must not import @/server`);
  }

  if (
    file.startsWith("src/server/") &&
    /from\s+["']@\/components(?:\/|["'])/.test(content)
  ) {
    errors.push(`${file}: server code must not import UI components`);
  }
}

for (const file of Object.keys(baseline.exceptions)) {
  if (!sourceFiles.some((candidate) => relative(candidate) === file)) {
    errors.push(`${file}: stale architecture exception; remove it`);
  }
}

const portableDesktopDomains = new Set(["chat", "composer", "events", "explore", "feed", "post", "profile", "shop"]);
const portableDesktopBaseline = new Set(baseline.desktopPortableUi ?? []);
if (portableDesktopBaseline.size > 0) {
  errors.push(
    "desktopPortableUi must remain empty; move presentation to root src/components instead of adding an exception",
  );
}
for (const absolute of desktopFiles) {
  const file = relative(absolute);
  const domain = file.split("/")[2];
  if (!portableDesktopDomains.has(domain) || !file.endsWith(".tsx")) continue;
  if (!portableDesktopBaseline.has(file)) {
    errors.push(`${file}: new portable desktop UI must be implemented in root src/components`);
  }
}

for (const file of portableDesktopBaseline) {
  if (!desktopFiles.some((candidate) => relative(candidate) === file)) {
    notices.push(`${file}: portable desktop baseline entry can now be removed`);
  }
}

if (notices.length > 0) {
  console.log("Architecture review notices:");
  for (const notice of notices) console.log(`- ${notice}`);
}

if (errors.length > 0) {
  console.error("Architecture check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Architecture check passed (${sourceFiles.length} source files).`);
