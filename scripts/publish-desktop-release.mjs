import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const [installerArgument, versionArgument] = process.argv.slice(2);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function validatedHttpsUrl(value, name) {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }
  return url;
}

if (!installerArgument || !versionArgument) {
  throw new Error(
    "Usage: node scripts/publish-desktop-release.mjs <installer.exe> <version>",
  );
}

if (!/^[0-9A-Za-z][0-9A-Za-z.-]*$/.test(versionArgument)) {
  throw new Error("The desktop version contains unsupported characters.");
}

const installerPath = resolve(installerArgument);
if (basename(installerPath).toLowerCase() !== "voople-setup-x64.exe") {
  throw new Error("Publish the normalized Voople-Setup-x64.exe artifact.");
}

const endpoint = validatedHttpsUrl(
  requiredEnvironment("DESKTOP_RELEASE_S3_ENDPOINT"),
  "DESKTOP_RELEASE_S3_ENDPOINT",
);
const publicBaseUrl = validatedHttpsUrl(
  requiredEnvironment("DESKTOP_RELEASE_PUBLIC_BASE_URL"),
  "DESKTOP_RELEASE_PUBLIC_BASE_URL",
);
const region = requiredEnvironment("DESKTOP_RELEASE_S3_REGION");
const bucket = requiredEnvironment("DESKTOP_RELEASE_S3_BUCKET");
const accessKeyId = requiredEnvironment("DESKTOP_RELEASE_S3_ACCESS_KEY_ID");
const secretAccessKey = requiredEnvironment("DESKTOP_RELEASE_S3_SECRET_ACCESS_KEY");

const installer = await readFile(installerPath);
const installerStats = await stat(installerPath);
const sha256 = createHash("sha256").update(installer).digest("hex");
const signed = process.env.DESKTOP_RELEASE_SIGNED === "true";
const checksum = Buffer.from(`${sha256}  Voople-Setup-x64.exe\n`, "utf8");
const publishedAt = new Date().toISOString();
const stableKey = "desktop/Voople-Setup-x64.exe";
const versionedKey = `desktop/releases/${versionArgument}/Voople-Setup-x64.exe`;
const publicInstallerUrl = new URL(stableKey, `${publicBaseUrl.toString().replace(/\/+$/, "")}/`);
const latestManifest = Buffer.from(
  `${JSON.stringify(
    {
      version: versionArgument,
      url: publicInstallerUrl.toString(),
      sha256,
      size: installerStats.size,
      signed,
      publishedAt,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const client = new S3Client({
  endpoint: endpoint.toString(),
  region,
  forcePathStyle: process.env.DESKTOP_RELEASE_S3_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId, secretAccessKey },
});

async function upload(key, body, options) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ...options,
    }),
  );
}

const installerHeaders = {
  ContentType: "application/vnd.microsoft.portable-executable",
  ContentDisposition: 'attachment; filename="Voople-Setup-x64.exe"',
};

await upload(versionedKey, installer, {
  ...installerHeaders,
  CacheControl: "public, max-age=31536000, immutable",
});
await upload(`${versionedKey}.sha256`, checksum, {
  ContentType: "text/plain; charset=utf-8",
  CacheControl: "public, max-age=31536000, immutable",
});
await upload(stableKey, installer, {
  ...installerHeaders,
  CacheControl: "public, max-age=300, must-revalidate",
});
await upload(`${stableKey}.sha256`, checksum, {
  ContentType: "text/plain; charset=utf-8",
  CacheControl: "public, max-age=300, must-revalidate",
});
await upload("desktop/latest.json", latestManifest, {
  ContentType: "application/json; charset=utf-8",
  CacheControl: "public, max-age=300, must-revalidate",
});

console.log(
  `Published Voople Desktop ${versionArgument} (${installerStats.size} bytes, sha256 ${sha256}).`,
);
