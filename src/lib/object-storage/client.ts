import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getObjectStorageConfig } from "./config";

let client: S3Client | null = null;

function getS3Client() {
  const config = getObjectStorageConfig();
  if (!config) {
    throw new Error("Object storage не настроен (S3 env)");
  }

  client ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
    forcePathStyle: false,
  });

  return { client, config };
}

export async function createPresignedPutUrl(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const { client: s3, config } = getS3Client();
  const expiresIn = input.expiresIn ?? 900;

  const command = new PutObjectCommand({
    Bucket: config.publicBucket,
    Key: input.key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  return { uploadUrl, expiresIn, bucket: config.publicBucket };
}
