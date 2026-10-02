import { readFileSync } from "node:fs";

export function appThemeValidationSql() {
  const source = readFileSync(new URL("../drizzle/89-style-app-theme-write-boundary.sql", import.meta.url), "utf8");
  const start = source.indexOf("-- BEGIN APP THEME READ-ONLY VALIDATION");
  const end = source.indexOf("-- END APP THEME READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("App theme validation missing");
  return source.slice(start, end);
}

export async function assertAppThemeReadiness(sql) {
  const source = readFileSync(new URL("../drizzle/89-style-app-theme-write-boundary.sql", import.meta.url), "utf8");
  const expected = source.match(/AS \$\$([\s\S]*?)\$\$;/)?.[1];
  return sql.begin("read only", async tx => {
    await tx.unsafe(appThemeValidationSql());
    const [fn] = await tx`select prosrc from pg_proc where oid = 'public.guard_app_theme_browser_write()'::regprocedure`;
    if (!expected || fn.prosrc !== expected) throw new Error("App theme guard body differs from the release contract");
  });
}
