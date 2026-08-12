export const ACCOUNT_DELETION_POLICY = {
  version: "2026-08-12-v1",
  coolingOffDays: 7,
  verificationTtlMinutes: 15,
  maxVerificationAttempts: 5,
  workerLeaseSeconds: 300,
  retainedEvidenceDays: 1_825,
} as const;

export const ACCOUNT_DELETION_PUBLIC_UPLOAD_PURPOSES = [
  "post",
  "comment",
  "avatar",
  "banner",
  "track",
] as const;
