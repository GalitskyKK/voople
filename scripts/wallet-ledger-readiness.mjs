import { readFileSync } from "node:fs";

/** Reuse the migration's catalog-only contract, never its creation block. */
export function walletLedgerValidationSql() {
  const source = readFileSync(new URL("../drizzle/85-wallet-ledger-compatibility.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN WALLET LEDGER READ-ONLY VALIDATION");
  const end = source.indexOf("-- END WALLET LEDGER READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Wallet ledger validation block is missing");
  const validation = source.slice(start, end);
  if (/\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|EXECUTE)\s+(TABLE|TYPE|FUNCTION|POLICY|PUBLICATION|EXTENSION|INTO|FROM|ON)\b/i.test(validation)) {
    throw new Error("Wallet ledger validation block must remain catalog-only");
  }
  return validation;
}

export async function assertWalletLedgerReadiness(sql) {
  return sql.begin("read only", tx => tx.unsafe(walletLedgerValidationSql()));
}
