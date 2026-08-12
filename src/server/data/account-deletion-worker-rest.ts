import { getAdminClient } from "@/lib/supabase/admin";

export type ClaimedDeletionJob = {
  userId: string;
  jobId: string;
};

export type ReconciliationAudit = ClaimedDeletionJob;

type ClaimRow = { user_id: string; job_id: string };
type AuditRow = { user_id: string; job_id: string };

export async function claimDeletionJobsRest(input: {
  workerId: string;
  limit: number;
  leaseSeconds: number;
}) {
  const { data, error } = await getAdminClient().rpc("claim_account_deletion_requests", {
    p_worker_id: input.workerId,
    p_limit: input.limit,
    p_lease_seconds: input.leaseSeconds,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ClaimRow[]).map((row) => ({
    userId: row.user_id,
    jobId: row.job_id,
  }));
}

export async function buildDeletionRetentionSnapshotRest(userId: string) {
  const admin = getAdminClient();
  const [payments, wallet, consents] = await Promise.all([
    admin
      .from("payment_intents")
      .select("id, kind, amount_rub, status, provider, created_at, updated_at")
      .eq("user_id", userId),
    admin
      .from("wallet_transactions")
      .select("id, amount, balance_after, kind, created_at")
      .eq("user_id", userId),
    admin
      .from("user_legal_consents")
      .select("privacy_version, terms_version, source, recorded_at")
      .eq("user_id", userId),
  ]);
  const failure = [payments, wallet, consents].find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  return {
    paymentIntents: payments.data ?? [],
    walletTransactions: wallet.data ?? [],
    legalConsents: consents.data ?? [],
  };
}

export async function beginDeletionAuditRest(input: {
  jobId: string;
  userId: string;
  subjectHash: string;
  policyVersion: string;
  retainedUntil: string;
  retentionSnapshot: Record<string, unknown>;
}) {
  const admin = getAdminClient();
  const { error: insertError } = await admin.from("account_deletion_audit").upsert({
    job_id: input.jobId,
    user_id: input.userId,
    subject_hash: input.subjectHash,
    status: "processing",
    policy_version: input.policyVersion,
    retained_until: input.retainedUntil,
    retention_snapshot: input.retentionSnapshot,
    updated_at: new Date().toISOString(),
  }, { onConflict: "job_id", ignoreDuplicates: true });
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await admin
    .from("account_deletion_audit")
    .update({ status: "processing", last_error_code: null, updated_at: new Date().toISOString() })
    .eq("job_id", input.jobId);
  if (updateError) throw new Error(updateError.message);
}

export async function completeDeletionAuditRest(jobId: string) {
  const now = new Date().toISOString();
  const { error } = await getAdminClient()
    .from("account_deletion_audit")
    .update({
      user_id: null,
      status: "completed",
      completed_at: now,
      updated_at: now,
      last_error_code: null,
    })
    .eq("job_id", jobId);
  if (error) throw new Error(error.message);
}

export async function failDeletionJobRest(input: {
  job: ClaimedDeletionJob;
  workerId: string;
  errorCode: string;
}) {
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const [request, audit] = await Promise.all([
    admin
      .from("account_deletion_requests")
      .update({
        status: "verified",
        worker_lease_id: null,
        worker_lease_expires_at: null,
        last_error_code: input.errorCode,
      })
      .eq("user_id", input.job.userId)
      .eq("worker_job_id", input.job.jobId)
      .eq("worker_lease_id", input.workerId)
      .eq("status", "processing"),
    admin
      .from("account_deletion_audit")
      .update({ status: "failed", last_error_code: input.errorCode, updated_at: now })
      .eq("job_id", input.job.jobId),
  ]);
  if (request.error) throw new Error(request.error.message);
  if (audit.error) throw new Error(audit.error.message);
}

export async function deletePublicUserRest(userId: string) {
  const { error } = await getAdminClient().from("users").delete().eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchStaleDeletionAuditsRest(cutoff: string) {
  const { data, error } = await getAdminClient()
    .from("account_deletion_audit")
    .select("job_id, user_id")
    .eq("status", "processing")
    .not("user_id", "is", null)
    .lt("updated_at", cutoff)
    .limit(10);
  if (error) throw new Error(error.message);
  return ((data ?? []) as AuditRow[]).map((row) => ({
    userId: row.user_id,
    jobId: row.job_id,
  }));
}

export async function purgeExpiredDeletionAuditsRest(limit = 100) {
  const { data, error } = await getAdminClient().rpc(
    "purge_expired_account_deletion_audits",
    { p_limit: limit },
  );
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : Number(data ?? 0);
}
