import { RELEASE_APPLY_ORDER } from "./migration-manifest.mjs";

/** The runner owns ledger verification/no-ops; promotion owns explicit ordering. */
export async function promoteReleaseMigrations({ apply, backfill, readiness }) {
  for (const file of RELEASE_APPLY_ORDER) await apply(file);
  await backfill();
  await readiness();
}
