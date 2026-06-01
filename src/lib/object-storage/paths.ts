import type { UploadPurpose } from "./types";

export function buildUploadKey(purpose: UploadPurpose, userId: string, extension: string) {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "webp";
  return `uploads/${purpose}/${userId}/${crypto.randomUUID()}.${safeExt}`;
}

export function assertOwnedUploadKey(key: string, userId: string, purpose: UploadPurpose) {
  const prefix = `uploads/${purpose}/${userId}/`;
  if (!key.startsWith(prefix) || key.includes("..")) {
    throw new Error("Недопустимый файл");
  }
}
