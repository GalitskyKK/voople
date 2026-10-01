import { acceptedMigrationChecksums, migrationChecksum } from "./migration-checksum.mjs";
import { REQUIRED_MIGRATIONS } from "./migration-manifest.mjs";

export const LEDGER_BOOTSTRAP = "45-app-schema-migrations.sql";

export function validateMigrationFilename(args) {
  if (args.length !== 1 || !/^[a-zA-Z0-9._-]+\.sql$/.test(args[0])) {
    throw new Error("Pass exactly one tracked release migration: npm run db:apply -- <migration-file.sql>. Directory replay is disabled.");
  }
  if (!REQUIRED_MIGRATIONS.includes(args[0])) {
    throw new Error(`Migration is not manifest-allowlisted: ${args[0]}. Historical/reset/seed SQL cannot be applied by this runner.`);
  }
  return args[0];
}

/** One transaction, including bootstrap and the append-only ledger insert. No retries. */
export async function applyMigration(sql, { file, source, releaseVersion }) {
  validateMigrationFilename([file]);
  if (!source.trim()) throw new Error(`Migration source is empty: ${file}`);
  if (!releaseVersion?.trim()) throw new Error("Migration release version is required.");
  return sql.begin(async (tx) => {
    // Database-wide transaction lock also serializes concurrent ledger bootstraps.
    await tx`select pg_advisory_xact_lock(8675309, 45)`;
    const [{ registry }] = await tx`select to_regclass('public.app_schema_migrations')::text as registry`;
    if (!registry && file !== LEDGER_BOOTSTRAP) {
      throw new Error(`Migration ledger is missing; apply ${LEDGER_BOOTSTRAP} first.`);
    }
    if (registry) {
      const [record] = await tx`select checksum from public.app_schema_migrations where id = ${file}`;
      if (record) {
        if (record.checksum === "legacy-detected") {
          throw new Error(`${file}: legacy-detected/pre-ledger record requires separately verified adoption; no replay or checksum rewrite.`);
        }
        if (!acceptedMigrationChecksums(source).has(record.checksum)) {
          throw new Error(`Migration checksum mismatch: ${file}. No SQL executed or ledger rewritten.`);
        }
        return { file, status: "already-applied" };
      }
    }
    const [{ version }] = await tx`select current_setting('server_version_num')::integer as version`;
    if (version < 120000) throw new Error("Transactional release migration execution requires PostgreSQL 12 or newer.");
    // Current release SQL is transaction-compatible on PostgreSQL 12+; see the runbook.
    // Keep breakpoints only as execution units, never as commit boundaries.
    for (const statement of source.split(/--> statement-breakpoint\r?\n?/).map((s) => s.trim()).filter(Boolean)) {
      await tx.unsafe(statement);
    }
    await tx`insert into public.app_schema_migrations (id, checksum, release_version, applied_at)
      values (${file}, ${migrationChecksum(source)}, ${releaseVersion}, now())`;
    return { file, status: "applied" };
  });
}
