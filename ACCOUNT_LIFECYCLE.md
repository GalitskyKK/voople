# Account lifecycle

This document is the engineering contract for consent, export and account
deletion. Data classes and durations are defined in [DATA_RETENTION.md](./DATA_RETENTION.md).

## Boundaries

- Shared web/Tauri UI: `src/components/legal/LegalConsentGate.tsx` and
  `src/components/settings/AccountDataControls.tsx`.
- User orchestration: `src/server/trpc/routers/user.ts` and
  `src/server/services/account-deletion.service.ts`.
- Worker orchestration: `src/app/api/internal/account-deletion/route.ts` and
  `src/server/services/account-deletion-worker.service.ts`.
- Persistence: `src/server/data/account-lifecycle-rest.ts` and
  `src/server/data/account-deletion-worker-rest.ts`.
- External email: `src/server/integrations/unisender-go-client.ts`.

Client code never sees the email API key, verification digest, worker secret,
lease identifiers or the retention snapshot.

## Versioned consent and export

`PRIVACY_VERSION` and `TERMS_VERSION` in `src/lib/constants/legal.ts` are the
only accepted versions. Never accept versions from the client or backfill a
consent timestamp. After a material document change, publish the documents,
change the constants, deploy the API and both clients, and verify the consent
gate before enabling the rest of the app.

`GET /api/account/export` accepts a verified web session or desktop Bearer
token, is limited to three exports per account per day and returns `no-store`
JSON. It excludes passwords, tokens, payment-provider external identifiers,
other members' messages, anonymous author identity and binary media copies.
Whenever a user-owned table is added, update the exporter in the same change.

## Deletion state machine

```text
none/cancelled
      |
      v
pending_verification -- valid email code --> verified
      |                                      |
      +--------------- cancelled <----------+
                                             |
                                  execute_after reached
                                             v
                                         processing
                                          |       |
                              retry/lease |       | auth identity removed
                                          v       v
                                       verified  completed audit
```

The user must enter the exact username. The server then checks that Supabase
Auth has a confirmed email and sends a six-digit code through UniSender Go.
Only an HMAC digest of the code is stored. A code expires after 15 minutes and
is locked after five failed attempts. Resending rotates both the challenge ID
and digest without moving an existing seven-day execution date forward.

Cancellation is allowed only in `pending_verification` or `verified`. Once a
worker owns `processing`, destructive work has started and cancellation is no
longer safe.

## Worker guarantees

Migration `34-account-deletion-worker.sql` provides a service-role-only
`SKIP LOCKED` claim with a five-minute lease. A crashed worker is retried after
the lease expires with the same `worker_job_id`.

For every claimed request the worker:

1. creates a pseudonymous audit row and minimal approved retention snapshot;
2. removes owned public and private S3 prefixes (group avatars are group-owned);
3. deletes `public.users`, allowing owned relational data to cascade;
4. deletes Supabase Auth last, revoking the identity and sessions;
5. clears the audit's raw user ID and marks it complete.

Every step is idempotent. If Auth deletion succeeds but the final audit update
is interrupted, the next run reconciles the stale audit by checking that the
identity no longer exists. Expired audit evidence is purged in bounded batches.
Failures store a stable stage code, never an email, token, message body, media
URL or provider response.

## Deployment and secrets

Apply migrations 32, 33 and 34 in that order before deploying the new API.
Configure these server-only Vercel values:

- `UNISENDER_GO_API_KEY`, `UNISENDER_GO_FROM_EMAIL`, `UNISENDER_GO_FROM_NAME`;
- `ACCOUNT_DELETION_VERIFICATION_SECRET`;
- `ACCOUNT_DELETION_AUDIT_SECRET`;
- `ACCOUNT_DELETION_WORKER_SECRET`.

GitHub Actions needs `ACCOUNT_DELETION_WORKER_URL` (for example
`https://voople.ru`) and the same `ACCOUNT_DELETION_WORKER_SECRET`. The hourly
workflow is serialized and can also be started manually.

Use three independent random secrets of at least 32 characters. Rotation of a
verification secret invalidates outstanding codes. Rotation of an audit secret
changes future subject hashes, so document it as a policy-version change.

## Release verification

Use disposable test accounts only.

1. Request deletion and confirm that logs and the API never return the code or
   full email.
2. Verify wrong, expired and sixth attempts fail; a new code invalidates the old.
3. Verify a correct code changes the status to `verified` and cancellation works.
4. Move a fixture's `execute_after` into the past and manually run the GitHub
   workflow with `limit=1`.
5. Confirm owned S3 prefixes, `public.users` and Auth are gone, while shared
   group assets remain.
6. Confirm the audit is `completed`, `user_id` is null and the snapshot contains
   no email, message body, external payment ID, token or media URL.
7. Simulate a worker interruption; after lease expiry the same job is reclaimed
   and no duplicate audit row is created.

There is deliberately no client-callable `delete auth.users` shortcut and no
destructive SQL trigger.
