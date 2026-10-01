const roles = [
  { name: "anon", bypassRls: false },
  { name: "authenticated", bypassRls: false },
  { name: "service_role", bypassRls: true },
];

/** Call on the shared VOOPLE_TEST_DATABASE_URL admin DB, before DB isolation. */
export async function ensureTestRoles(admin) {
  // Advisory locks are database-scoped. Both harnesses must use the same admin
  // database, never their generated databases, for this cluster-global bootstrap.
  await admin.begin("isolation level read committed", async tx => {
    await tx`select pg_advisory_xact_lock(8675309, 0)`;
    for (const { name, bypassRls } of roles) {
      const [existing] = await tx`select rolcanlogin, rolbypassrls, rolsuper,
        rolcreatedb, rolcreaterole, rolreplication from pg_roles where rolname = ${name}`;
      if (!existing) {
        // Names/options are fixed test constants, never external input.
        await tx.unsafe(`CREATE ROLE ${name} NOLOGIN ${bypassRls ? "BYPASSRLS" : "NOBYPASSRLS"}`);
      } else if (existing.rolcanlogin || existing.rolbypassrls !== bypassRls
        || existing.rolsuper || existing.rolcreatedb || existing.rolcreaterole || existing.rolreplication) {
        throw new Error(`Incompatible shared test role: ${name}; expected NOLOGIN ${bypassRls ? "BYPASSRLS" : "NOBYPASSRLS"} without administrative privileges`);
      }
    }
  });
}
