import { readFileSync } from "node:fs";
import { normalizeMigrationSource } from "./migration-checksum.mjs";

const source = () => normalizeMigrationSource(readFileSync(new URL("../drizzle/93-style-profile-card-write-boundary.sql", import.meta.url), "utf8"));
export function profileCardValidationSql() {
  const sql = source();
  const start = sql.indexOf("-- BEGIN PROFILE CARD READ-ONLY VALIDATION");
  const end = sql.indexOf("-- END PROFILE CARD READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Profile card validation missing");
  return sql.slice(start, end);
}

export async function assertProfileCardReadiness(sql) {
  const bodies = [...source().matchAll(/AS \$\$([\s\S]*?)\$\$;/g)].map(match => match[1]);
  return sql.begin("read only", async tx => {
    await tx.unsafe(profileCardValidationSql());
    const rows = await tx`select proname, prosrc from pg_proc where oid in (
      'public.guard_profile_card_browser_write()'::regprocedure)`;
    for (const [index, name] of ["guard_profile_card_browser_write"].entries()) {
      if (normalizeMigrationSource(rows.find(row => row.proname === name)?.prosrc ?? "") !== bodies[index]) {
        throw new Error(`Profile card ${name} body differs from the release contract`);
      }
    }
  });
}
