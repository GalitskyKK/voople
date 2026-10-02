import { readFileSync } from "node:fs";

/** Reuse the migration's catalog-only contract, never its creation block. */
export function promoValidationSql() {
  const source = readFileSync(new URL("../drizzle/87-promo-compatibility.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN PROMO READ-ONLY VALIDATION");
  const end = source.indexOf("-- END PROMO READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Promo validation block is missing");
  const validation = source.slice(start, end);
  if (/\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|EXECUTE)\s+(TABLE|TYPE|FUNCTION|POLICY|PUBLICATION|EXTENSION|INTO|FROM|ON)\b/i.test(validation)) {
    throw new Error("Promo validation block must remain catalog-only");
  }
  return validation;
}

export async function assertPromoReadiness(sql) {
  return sql.begin("read only", tx => tx.unsafe(promoValidationSql()));
}
