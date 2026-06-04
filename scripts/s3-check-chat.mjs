/**
 * Проверка PutObject в voople-uploads (те же переменные, что в .env.local).
 * Запуск: node scripts/s3-check-chat.mjs
 */
import { readFileSync } from "fs";
import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnvLocal();
const endpoint = env.S3_ENDPOINT;
const region = env.S3_REGION ?? "ru-3";
const bucket = env.S3_BUCKET_PRIVATE ?? "voople-uploads";
const forcePathStyle =
  env.S3_FORCE_PATH_STYLE === "true" ||
  (env.S3_FORCE_PATH_STYLE !== "false" && endpoint?.includes("selcloud"));

if (!endpoint || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
  console.error("Заполните S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY в .env.local");
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle,
});

const key = `uploads/chat/_diag/${Date.now()}.txt`;

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log("HeadBucket OK:", bucket);
} catch (e) {
  console.error("HeadBucket FAIL:", e.name, e.message);
  process.exit(1);
}

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "voople diag",
      ContentType: "text/plain",
    }),
  );
  console.log("PutObject OK:", key);
} catch (e) {
  console.error("PutObject FAIL:", e.name, e.$metadata?.httpStatusCode, e.message);
  process.exit(1);
}
