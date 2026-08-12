import { ACCOUNT_DELETION_POLICY } from "@/lib/account/retention-policy";
import { getAdminClient } from "@/lib/supabase/admin";

export type AccountDeletionRequest = {
  status: "pending_verification" | "verified" | "processing" | "cancelled" | "completed";
  requestedAt: string;
  executeAfter: string;
  cancelledAt: string | null;
  verificationExpiresAt: string | null;
  verifiedAt: string | null;
  workerAttemptCount: number;
  lastErrorCode: string | null;
};

export type AccountDeletionVerification = {
  challengeId: string | null;
  digest: string | null;
  expiresAt: string | null;
  attempts: number;
};

type LegalConsentRow = {
  privacy_version: string;
  terms_version: string;
  recorded_at: string;
};

type DeletionRequestRow = {
  status: AccountDeletionRequest["status"];
  requested_at: string;
  execute_after: string;
  cancelled_at: string | null;
  verification_challenge_id: string | null;
  verification_digest: string | null;
  verification_expires_at: string | null;
  verification_attempts: number;
  verified_at: string | null;
  worker_attempt_count: number;
  last_error_code: string | null;
};

const DELETION_COLUMNS = [
  "status",
  "requested_at",
  "execute_after",
  "cancelled_at",
  "verification_challenge_id",
  "verification_digest",
  "verification_expires_at",
  "verification_attempts",
  "verified_at",
  "worker_attempt_count",
  "last_error_code",
].join(", ");

function mapDeletionRequest(row: DeletionRequestRow): AccountDeletionRequest {
  return {
    status: row.status,
    requestedAt: row.requested_at,
    executeAfter: row.execute_after,
    cancelledAt: row.cancelled_at,
    verificationExpiresAt: row.verification_expires_at,
    verifiedAt: row.verified_at,
    workerAttemptCount: row.worker_attempt_count,
    lastErrorCode: row.last_error_code,
  };
}

async function fetchDeletionRow(userId: string) {
  const { data, error } = await getAdminClient()
    .from("account_deletion_requests")
    .select(DELETION_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as DeletionRequestRow | null;
}

export async function fetchCurrentLegalConsentRest(
  userId: string,
  privacyVersion: string,
  termsVersion: string,
) {
  const { data, error } = await getAdminClient()
    .from("user_legal_consents")
    .select("privacy_version, terms_version, recorded_at")
    .eq("user_id", userId)
    .eq("privacy_version", privacyVersion)
    .eq("terms_version", termsVersion)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as LegalConsentRow | null;
  return row
    ? { accepted: true as const, recordedAt: row.recorded_at }
    : { accepted: false as const, recordedAt: null };
}

export async function recordLegalConsentRest(input: {
  userId: string;
  privacyVersion: string;
  termsVersion: string;
  source: "web_reconsent" | "desktop_reconsent";
}) {
  const { error } = await getAdminClient()
    .from("user_legal_consents")
    .upsert(
      {
        user_id: input.userId,
        privacy_version: input.privacyVersion,
        terms_version: input.termsVersion,
        source: input.source,
      },
      { onConflict: "user_id,privacy_version,terms_version", ignoreDuplicates: true },
    );

  if (error) throw new Error(error.message);
  return fetchCurrentLegalConsentRest(input.userId, input.privacyVersion, input.termsVersion);
}

export async function fetchAccountDeletionRequestRest(userId: string) {
  const row = await fetchDeletionRow(userId);
  return row ? mapDeletionRequest(row) : null;
}

export async function fetchAccountDeletionVerificationRest(
  userId: string,
): Promise<AccountDeletionVerification | null> {
  const row = await fetchDeletionRow(userId);
  return row
    ? {
        challengeId: row.verification_challenge_id,
        digest: row.verification_digest,
        expiresAt: row.verification_expires_at,
        attempts: row.verification_attempts,
      }
    : null;
}

export async function prepareAccountDeletionVerificationRest(input: {
  userId: string;
  challengeId: string;
  digest: string;
  expiresAt: string;
}) {
  const current = await fetchDeletionRow(input.userId);
  if (current?.status === "verified" || current?.status === "processing") {
    return mapDeletionRequest(current);
  }

  const resetSchedule = !current || current.status !== "pending_verification";
  const requestedAt = resetSchedule ? new Date() : new Date(current.requested_at);
  const executeAfter = resetSchedule
    ? new Date(requestedAt.getTime() + ACCOUNT_DELETION_POLICY.coolingOffDays * 86_400_000)
    : new Date(current.execute_after);
  const { error } = await getAdminClient().from("account_deletion_requests").upsert({
    user_id: input.userId,
    status: "pending_verification",
    requested_at: requestedAt.toISOString(),
    execute_after: executeAfter.toISOString(),
    cancelled_at: null,
    completed_at: null,
    verification_challenge_id: input.challengeId,
    verification_digest: input.digest,
    verification_expires_at: input.expiresAt,
    verification_attempts: 0,
    verified_at: null,
    worker_job_id: null,
    worker_lease_id: null,
    worker_lease_expires_at: null,
    worker_attempt_count: 0,
    last_error_code: null,
  }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
  return fetchAccountDeletionRequestRest(input.userId);
}

export async function recordFailedVerificationAttemptRest(input: {
  userId: string;
  challengeId: string;
  expectedAttempts: number;
}) {
  const { error } = await getAdminClient()
    .from("account_deletion_requests")
    .update({ verification_attempts: input.expectedAttempts + 1 })
    .eq("user_id", input.userId)
    .eq("status", "pending_verification")
    .eq("verification_challenge_id", input.challengeId)
    .eq("verification_attempts", input.expectedAttempts);
  if (error) throw new Error(error.message);
}

export async function markAccountDeletionVerifiedRest(input: {
  userId: string;
  challengeId: string;
  digest: string;
}) {
  const { data, error } = await getAdminClient()
    .from("account_deletion_requests")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      verification_digest: null,
      verification_expires_at: null,
      verification_attempts: 0,
      last_error_code: null,
    })
    .eq("user_id", input.userId)
    .eq("status", "pending_verification")
    .eq("verification_challenge_id", input.challengeId)
    .eq("verification_digest", input.digest)
    .select(DELETION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDeletionRequest(data as unknown as DeletionRequestRow) : null;
}

export async function cancelAccountDeletionRest(userId: string) {
  const { error } = await getAdminClient()
    .from("account_deletion_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      verification_digest: null,
      verification_expires_at: null,
    })
    .eq("user_id", userId)
    .in("status", ["pending_verification", "verified"]);

  if (error) throw new Error(error.message);
  return fetchAccountDeletionRequestRest(userId);
}
