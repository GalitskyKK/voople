import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { ACCOUNT_DELETION_POLICY } from "@/lib/account/retention-policy";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  fetchAccountDeletionRequestRest,
  fetchAccountDeletionVerificationRest,
  markAccountDeletionVerifiedRest,
  prepareAccountDeletionVerificationRest,
  recordFailedVerificationAttemptRest,
} from "@/server/data/account-lifecycle-rest";
import { sendTransactionalEmail } from "@/server/integrations/unisender-go-client";

export type AccountDeletionErrorCode =
  | "EMAIL_NOT_CONFIRMED"
  | "EMAIL_DELIVERY_FAILED"
  | "INVALID_CODE"
  | "EXPIRED_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "NOT_PENDING"
  | "CONFIGURATION_ERROR";

export class AccountDeletionError extends Error {
  constructor(public readonly reason: AccountDeletionErrorCode) {
    super(reason);
    this.name = "AccountDeletionError";
  }
}

function getVerificationSecret() {
  const secret = process.env.ACCOUNT_DELETION_VERIFICATION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new AccountDeletionError("CONFIGURATION_ERROR");
  }
  return secret;
}

function digestCode(userId: string, challengeId: string, code: string) {
  return createHmac("sha256", getVerificationSecret())
    .update(`${userId}:${challengeId}:${code}`)
    .digest("hex");
}

function equalDigest(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

async function getConfirmedEmail(userId: string) {
  const { data, error } = await getAdminClient().auth.admin.getUserById(userId);
  const user = data.user;
  if (error || !user?.email || !user.email_confirmed_at) {
    throw new AccountDeletionError("EMAIL_NOT_CONFIRMED");
  }
  return user.email;
}

async function sendVerificationCode(input: {
  email: string;
  challengeId: string;
  code: string;
}) {
  const minutes = ACCOUNT_DELETION_POLICY.verificationTtlMinutes;
  try {
    await sendTransactionalEmail({
      to: input.email,
      subject: "Подтвердите удаление аккаунта Voople",
      plaintext: [
        `Код подтверждения: ${input.code}`,
        `Он действует ${minutes} минут.`,
        "Если вы не создавали заявку, ничего не вводите и смените пароль аккаунта.",
      ].join("\n\n"),
      html: `<p>Код подтверждения удаления аккаунта Voople:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${input.code}</p><p>Код действует ${minutes} минут.</p><p>Если вы не создавали заявку, ничего не вводите и смените пароль аккаунта.</p>`,
      idempotenceKey: input.challengeId,
    });
  } catch {
    throw new AccountDeletionError("EMAIL_DELIVERY_FAILED");
  }
}

export async function getAccountDeletionStatus(userId: string) {
  const request = await fetchAccountDeletionRequestRest(userId);
  if (!request) return null;
  if (request.status !== "pending_verification") {
    return { ...request, emailHint: null };
  }
  const email = await getConfirmedEmail(userId);
  return { ...request, emailHint: maskEmail(email) };
}

export async function requestAccountDeletionVerification(userId: string) {
  const current = await fetchAccountDeletionRequestRest(userId);
  if (current?.status === "verified" || current?.status === "processing") {
    return { ...current, emailHint: null };
  }

  const email = await getConfirmedEmail(userId);
  const challengeId = crypto.randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const digest = digestCode(userId, challengeId, code);
  const expiresAt = new Date(
    Date.now() + ACCOUNT_DELETION_POLICY.verificationTtlMinutes * 60_000,
  ).toISOString();

  const request = await prepareAccountDeletionVerificationRest({
    userId,
    challengeId,
    digest,
    expiresAt,
  });
  await sendVerificationCode({ email, challengeId, code });
  return request ? { ...request, emailHint: maskEmail(email) } : null;
}

export async function verifyAccountDeletionCode(userId: string, code: string) {
  const verification = await fetchAccountDeletionVerificationRest(userId);
  if (!verification?.challengeId || !verification.digest || !verification.expiresAt) {
    throw new AccountDeletionError("NOT_PENDING");
  }
  if (verification.attempts >= ACCOUNT_DELETION_POLICY.maxVerificationAttempts) {
    throw new AccountDeletionError("TOO_MANY_ATTEMPTS");
  }
  if (new Date(verification.expiresAt).getTime() <= Date.now()) {
    throw new AccountDeletionError("EXPIRED_CODE");
  }

  const candidateDigest = digestCode(userId, verification.challengeId, code);
  if (!equalDigest(candidateDigest, verification.digest)) {
    await recordFailedVerificationAttemptRest({
      userId,
      challengeId: verification.challengeId,
      expectedAttempts: verification.attempts,
    });
    throw new AccountDeletionError(
      verification.attempts + 1 >= ACCOUNT_DELETION_POLICY.maxVerificationAttempts
        ? "TOO_MANY_ATTEMPTS"
        : "INVALID_CODE",
    );
  }

  const verified = await markAccountDeletionVerifiedRest({
    userId,
    challengeId: verification.challengeId,
    digest: verification.digest,
  });
  if (!verified) throw new AccountDeletionError("NOT_PENDING");
  return { ...verified, emailHint: null };
}
