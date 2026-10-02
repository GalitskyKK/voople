import { readFileSync } from "node:fs";

/** Reuse the migration's catalog-only contract, never its creation block. */
export function paymentFulfillmentValidationSql() {
  const source = readFileSync(new URL("../drizzle/86-payment-fulfillment-compatibility.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN PAYMENT FULFILLMENT READ-ONLY VALIDATION");
  const end = source.indexOf("-- END PAYMENT FULFILLMENT READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Payment fulfillment validation block is missing");
  const validation = source.slice(start, end);
  if (/\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|EXECUTE)\s+(TABLE|TYPE|FUNCTION|POLICY|PUBLICATION|EXTENSION|INTO|FROM|ON)\b/i.test(validation)) {
    throw new Error("Payment fulfillment validation block must remain catalog-only");
  }
  return validation;
}

export async function assertPaymentFulfillmentReadiness(sql) {
  return sql.begin("read only", tx => tx.unsafe(paymentFulfillmentValidationSql()));
}
