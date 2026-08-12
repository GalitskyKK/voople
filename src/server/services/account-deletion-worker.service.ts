import { createHmac } from "node:crypto";

import {
  ACCOUNT_DELETION_POLICY,
  ACCOUNT_DELETION_PUBLIC_UPLOAD_PURPOSES,
} from "@/lib/account/retention-policy";
import { deleteObjectPrefix } from "@/lib/object-storage/client";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  beginDeletionAuditRest,
  buildDeletionRetentionSnapshotRest,
  claimDeletionJobsRest,
  completeDeletionAuditRest,
  deletePublicUserRest,
  failDeletionJobRest,
  fetchStaleDeletionAuditsRest,
  purgeExpiredDeletionAuditsRest,
  type ClaimedDeletionJob,
} from "@/server/data/account-deletion-worker-rest";

type WorkerErrorCode =
  | "retention_snapshot_failed"
  | "storage_cleanup_failed"
  | "public_data_delete_failed"
  | "auth_delete_failed"
  | "audit_finalize_failed"
  | "unknown_failure";

class DeletionStageError extends Error {
  constructor(public readonly errorCode: WorkerErrorCode) {
    super(errorCode);
  }
}

async function stage<T>(errorCode: WorkerErrorCode, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch {
    throw new DeletionStageError(errorCode);
  }
}

function subjectHash(userId: string) {
  const secret = process.env.ACCOUNT_DELETION_AUDIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("Account deletion audit secret is not configured");
  }
  return createHmac("sha256", secret).update(userId).digest("hex");
}

async function authUserExists(userId: string) {
  const { data, error } = await getAdminClient().auth.admin.getUserById(userId);
  if (!error) return Boolean(data.user);
  const message = error.message.toLocaleLowerCase("en");
  if (message.includes("not found") || message.includes("does not exist")) return false;
  throw error;
}

async function cleanupOwnedStorage(userId: string) {
  let deleted = 0;
  for (const purpose of ACCOUNT_DELETION_PUBLIC_UPLOAD_PURPOSES) {
    deleted += await deleteObjectPrefix({
      bucket: "public",
      prefix: `uploads/${purpose}/${userId}/`,
    });
  }
  deleted += await deleteObjectPrefix({
    bucket: "private",
    prefix: `uploads/chat/${userId}/`,
  });
  return deleted;
}

async function deleteAuthIdentity(userId: string) {
  const { error } = await getAdminClient().auth.admin.deleteUser(userId, false);
  if (!error) return;
  if (!(await authUserExists(userId))) return;
  throw error;
}

async function processDeletionJob(job: ClaimedDeletionJob, workerId: string) {
  try {
    const snapshot = await stage("retention_snapshot_failed", () =>
      buildDeletionRetentionSnapshotRest(job.userId));
    const retainedUntil = new Date(
      Date.now() + ACCOUNT_DELETION_POLICY.retainedEvidenceDays * 86_400_000,
    ).toISOString();
    await stage("retention_snapshot_failed", () => beginDeletionAuditRest({
      jobId: job.jobId,
      userId: job.userId,
      subjectHash: subjectHash(job.userId),
      policyVersion: ACCOUNT_DELETION_POLICY.version,
      retainedUntil,
      retentionSnapshot: snapshot,
    }));
    const deletedObjects = await stage("storage_cleanup_failed", () =>
      cleanupOwnedStorage(job.userId));
    await stage("public_data_delete_failed", () => deletePublicUserRest(job.userId));
    await stage("auth_delete_failed", () => deleteAuthIdentity(job.userId));
    await stage("audit_finalize_failed", () => completeDeletionAuditRest(job.jobId));
    return { completed: true as const, deletedObjects };
  } catch (error) {
    try {
      if (!(await authUserExists(job.userId))) {
        try {
          await completeDeletionAuditRest(job.jobId);
        } catch {
          // A later reconciliation pass finalizes this already-deleted account.
        }
        return { completed: true as const, deletedObjects: 0 };
      }
    } catch {
      // The normal retry path below preserves the request and its audit error code.
    }
    const errorCode = error instanceof DeletionStageError
      ? error.errorCode
      : "unknown_failure";
    await failDeletionJobRest({ job, workerId, errorCode });
    return { completed: false as const, deletedObjects: 0 };
  }
}

async function reconcileInterruptedAudits() {
  const cutoff = new Date(
    Date.now() - ACCOUNT_DELETION_POLICY.workerLeaseSeconds * 2 * 1_000,
  ).toISOString();
  const audits = await fetchStaleDeletionAuditsRest(cutoff);
  let reconciled = 0;
  for (const audit of audits) {
    if (!(await authUserExists(audit.userId))) {
      await completeDeletionAuditRest(audit.jobId);
      reconciled += 1;
    }
  }
  return reconciled;
}

export async function runAccountDeletionWorker(limit: number) {
  const workerId = crypto.randomUUID();
  const purgedAudits = await purgeExpiredDeletionAuditsRest();
  const reconciled = await reconcileInterruptedAudits();
  const jobs = await claimDeletionJobsRest({
    workerId,
    limit,
    leaseSeconds: ACCOUNT_DELETION_POLICY.workerLeaseSeconds,
  });
  let completed = 0;
  let failed = 0;
  let deletedObjects = 0;

  for (const job of jobs) {
    const result = await processDeletionJob(job, workerId);
    if (result.completed) completed += 1;
    else failed += 1;
    deletedObjects += result.deletedObjects;
  }

  return { claimed: jobs.length, completed, failed, reconciled, purgedAudits, deletedObjects };
}
