import { readFileSync } from "node:fs";

/** Reuse the migration's catalog-only contract, never its creation block. */
export function groupRuntimeRpcValidationSql() {
  const source = readFileSync(new URL("../drizzle/88-group-runtime-rpc-compatibility.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN GROUP RUNTIME RPC READ-ONLY VALIDATION");
  const end = source.indexOf("-- END GROUP RUNTIME RPC READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Group runtime RPC validation block is missing");
  const validation = source.slice(start, end);
  if (/\b(CREATE|ALTER|DROP|GRANT|REVOKE|INSERT|UPDATE|DELETE|EXECUTE)\s+(TABLE|TYPE|FUNCTION|POLICY|PUBLICATION|EXTENSION|INTO|FROM|ON)\b/i.test(validation)) {
    throw new Error("Group runtime RPC validation block must remain catalog-only");
  }
  return validation;
}

export async function assertGroupRuntimeRpcReadiness(sql) {
  return sql.begin("read only", tx => tx.unsafe(groupRuntimeRpcValidationSql()));
}
