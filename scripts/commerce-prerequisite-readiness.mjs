import { readFileSync } from "node:fs";

/** Reuse the migration's catalog-only contract, never its creation block. */
export function commercePrerequisiteValidationSql() {
  const source = readFileSync(new URL("../drizzle/83-commerce-prerequisite-compatibility.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN COMMERCE PREREQUISITE READ-ONLY VALIDATION");
  const end = source.indexOf("-- END COMMERCE PREREQUISITE READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Commerce prerequisite validation block is missing");
  const validation = source.slice(start, end);
  if (/\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|EXECUTE)\s+(TABLE|TYPE|FUNCTION|POLICY|PUBLICATION|EXTENSION|INTO|FROM|ON)\b/i.test(validation)) {
    throw new Error("Commerce prerequisite validation block must remain catalog-only");
  }
  return validation;
}

export async function assertCommercePrerequisiteReadiness(sql) {
  return sql.begin("read only", tx => tx.unsafe(commercePrerequisiteValidationSql()));
}
