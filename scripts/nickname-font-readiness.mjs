import { readFileSync } from "node:fs";

const source = () => readFileSync(new URL("../drizzle/90-style-nickname-font-write-boundary.sql", import.meta.url), "utf8");
export function nicknameFontValidationSql() {
  const sql = source();
  const start = sql.indexOf("-- BEGIN NICKNAME FONT READ-ONLY VALIDATION");
  const end = sql.indexOf("-- END NICKNAME FONT READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Nickname font validation missing");
  return sql.slice(start, end);
}

export async function assertNicknameFontReadiness(sql) {
  const bodies = [...source().matchAll(/AS \$\$([\s\S]*?)\$\$;/g)].map(match => match[1]);
  return sql.begin("read only", async tx => {
    await tx.unsafe(nicknameFontValidationSql());
    const rows = await tx`select proname, prosrc from pg_proc where oid in (
      'public.guard_nickname_font_browser_write()'::regprocedure,
      'public.load_active_style_subjects(uuid[],timestamptz)'::regprocedure)`;
    for (const [index, name] of ["guard_nickname_font_browser_write", "load_active_style_subjects"].entries()) {
      if (rows.find(row => row.proname === name)?.prosrc !== bodies[index]) {
        throw new Error(`Nickname font ${name} body differs from the release contract`);
      }
    }
  });
}
