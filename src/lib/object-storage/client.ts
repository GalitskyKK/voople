import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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

export async function deleteObject(input: { key: string; bucket: StorageBucketKind }) {
  const { client, config } = getS3Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: resolveBucketName(config, input.bucket), Key: input.key }),
  );
}

export async function deleteObjectPrefix(input: {
  prefix: string;
  bucket: StorageBucketKind;
}) {
  if (!input.prefix || input.prefix.includes("..")) {
    throw new Error("Invalid object prefix");
  }
  const { client: s3, config } = getS3Client();
  const bucketName = resolveBucketName(config, input.bucket);
  let continuationToken: string | undefined;
  let deleted = 0;

  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: input.prefix,
      ContinuationToken: continuationToken,
    }));
    const objects = (page.Contents ?? [])
      .flatMap((object) => object.Key ? [{ Key: object.Key }] : []);
    if (objects.length > 0) {
      const result = await s3.send(new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: objects, Quiet: true },
      }));
      if ((result.Errors?.length ?? 0) > 0) {
        throw new Error("Object storage prefix cleanup failed");
      }
      deleted += objects.length;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
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

/**
 * Метаданные загруженного объекта. `null`, если объект не найден.
 * Используется для серверной верификации размера после presigned PUT
 * (presigned PUT не умеет ограничивать размер на стороне S3).
 */
export async function headObject(input: {
  key: string;
  bucket: StorageBucketKind;
}): Promise<{ contentLength: number; contentType: string | null } | null> {
  const { client: s3, config } = getS3Client();
  const bucketName = resolveBucketName(config, input.bucket);

  try {
    const result = await s3.send(
      new HeadObjectCommand({ Bucket: bucketName, Key: input.key }),
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
    };
  } catch (e) {
    if (e instanceof Error && (e.name === "NotFound" || e.name === "NoSuchKey")) {
      return null;
    }
    throw e;
  }
}

export async function readObjectPrefix(input: {
  key: string;
  bucket: StorageBucketKind;
  bytes?: number;
}): Promise<Uint8Array | null> {
  const { client: s3, config } = getS3Client();
  const bucketName = resolveBucketName(config, input.bucket);
  const bytes = Math.max(16, Math.min(input.bytes ?? 64, 4096));

  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: input.key,
      Range: `bytes=0-${bytes - 1}`,
    }));
    return result.Body ? await result.Body.transformToByteArray() : null;
  } catch (error) {
    if (error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey")) {
      return null;
    }
    throw error;
  }
}

export async function readObjectBytes(input: {
  key: string;
  bucket: StorageBucketKind;
}): Promise<Uint8Array | null> {
  const { client: s3, config } = getS3Client();
  const bucketName = resolveBucketName(config, input.bucket);
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: input.key }));
    return result.Body ? await result.Body.transformToByteArray() : null;
  } catch (error) {
    if (error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey")) return null;
    throw error;
  }
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
