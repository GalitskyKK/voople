import { CopyObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { bucketForPurpose, getObjectStorageConfig } from "./config";
import type { StorageBucketKind, UploadPurpose } from "./types";

let client: S3Client | null = null;
let clientSignature: string | null = null;

function getS3Client() {
  const config = getObjectStorageConfig();
  if (!config) {
    throw new Error("Object storage не настроен (S3 env)");
  }

  const signature = `${config.endpoint}|${config.region}|${config.forcePathStyle}`;
  if (!client || clientSignature !== signature) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
      forcePathStyle: config.forcePathStyle,
    });
    clientSignature = signature;
  }

  return { client, config };
}

export async function copyObject(input: {
  sourceBucket: StorageBucketKind;
  sourceKey: string;
  destBucket: StorageBucketKind;
  destKey: string;
}) {
  const { client, config } = getS3Client();
  const sourceName = resolveBucketName(config, input.sourceBucket);
  const destName = resolveBucketName(config, input.destBucket);

  await client.send(
    new CopyObjectCommand({
      Bucket: destName,
      Key: input.destKey,
      CopySource: encodeURIComponent(`${sourceName}/${input.sourceKey}`),
    }),
  );

  return { bucket: destName, key: input.destKey };
}

export async function putObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
  bucket: StorageBucketKind;
}) {
  const { client, config } = getS3Client();
  const bucketName = resolveBucketName(config, input.bucket);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return { bucket: bucketName, key: input.key };
}

function resolveBucketName(config: NonNullable<ReturnType<typeof getObjectStorageConfig>>, kind: StorageBucketKind) {
  return kind === "private" ? config.privateBucket : config.publicBucket;
}

export async function createPresignedPutUrl(input: {
  key: string;
  contentType: string;
  purpose?: UploadPurpose;
  bucket?: StorageBucketKind;
  expiresIn?: number;
}) {
  const { client: s3, config } = getS3Client();
  const expiresIn = input.expiresIn ?? 900;
  const bucketKind = input.bucket ?? (input.purpose ? bucketForPurpose(input.purpose) : "public");
  const bucketName = resolveBucketName(config, bucketKind);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: input.key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl, expiresIn, bucket: bucketName, bucketKind };
}

export async function createPresignedGetUrl(input: {
  key: string;
  bucket?: StorageBucketKind;
  expiresIn?: number;
}) {
  const { client: s3, config } = getS3Client();
  const expiresIn = input.expiresIn ?? 3600;
  const bucketKind = input.bucket ?? "private";
  const bucketName = resolveBucketName(config, bucketKind);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: input.key,
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { downloadUrl, expiresIn, bucket: bucketName };
}
