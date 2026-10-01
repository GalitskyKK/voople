export const LEGACY_COMMERCE_RPC_SIGNATURES = Object.freeze([
  "public.ensure_user_wallet(uuid)",
  "public.adjust_wallet(uuid,integer,varchar,varchar,varchar,varchar,varchar)",
  "public.purchase_shop_item_with_coins(uuid,varchar)",
  "public.extend_voople_plus_once(uuid,varchar,integer,varchar)",
  "public.claim_promo_redemption(uuid,uuid,varchar,varchar)",
  "public.accept_group_vanity_invite(varchar,uuid)",
]);

/** Read-only effective privilege checks; absent legacy definitions are optional. */
export async function assertLegacyCommerceRpcPrivileges(sql, {
  signatures = LEGACY_COMMERCE_RPC_SIGNATURES,
  roles = { anon: "anon", authenticated: "authenticated", service: "service_role" },
} = {}) {
  const rows = await sql`
    with targets as (
      select signature, pg_catalog.to_regprocedure(signature) as function_oid
      from unnest(${signatures}::text[]) as requested(signature)
    )
    select signature,
      pg_catalog.has_function_privilege(${roles.anon}, function_oid, 'EXECUTE') as anon_execute,
      pg_catalog.has_function_privilege(${roles.authenticated}, function_oid, 'EXECUTE') as authenticated_execute,
      pg_catalog.has_function_privilege(${roles.service}, function_oid, 'EXECUTE') as service_execute,
      exists (
        select 1 from pg_catalog.pg_proc p,
          lateral pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
        where p.oid = function_oid and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      ) as public_execute
    from targets where function_oid is not null
  `;
  const unsafe = rows.filter((row) => row.anon_execute !== false
    || row.authenticated_execute !== false || row.public_execute !== false
    || row.service_execute !== true);
  if (unsafe.length) {
    throw new Error(`Legacy commerce RPC execution privileges are unsafe: ${unsafe.map((row) => row.signature).join(", ")}; apply 81-legacy-commerce-rpc-privileges.sql or investigate inherited grants.`);
  }
  return rows;
}
