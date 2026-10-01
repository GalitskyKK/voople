import { readFileSync } from "node:fs";

// The migration owns the contract. Reuse only its catalog-only validation block,
// under an enforced READ ONLY transaction; never execute its creation statements.
export function coreBaselineValidationSql({ current = true } = {}) {
  const source = readFileSync(new URL("../drizzle/82-core-baseline-compatibility.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN CORE BASELINE READ-ONLY VALIDATION");
  const end = source.indexOf("-- END CORE BASELINE READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Core baseline validation block is missing");
  const validation = source.slice(start, end);
  if (/\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|EXECUTE)\s+(TABLE|TYPE|FUNCTION|POLICY|PUBLICATION|EXTENSION|INTO|FROM|ON)\b/i.test(validation)) {
    throw new Error("Core baseline validation block must remain catalog-only");
  }
  return current ? validation.replace("require_current boolean := false;", "require_current boolean := true;") : validation;
}

export async function assertCoreBaselineReadiness(sql) {
  return sql.begin("read only", async (tx) => {
    await tx.unsafe(coreBaselineValidationSql());
  });
}
