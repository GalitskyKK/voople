import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { migrationChecksum } from "./migration-checksum.mjs";
import { REQUIRED_MIGRATIONS } from "./migration-manifest.mjs";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const source of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = source.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase REST credentials are not configured");

const requested = process.argv.slice(2);
if (!requested.length) throw new Error("Pass one or more applied migration filenames");
for (const file of requested) {
  if (!REQUIRED_MIGRATIONS.includes(file)) throw new Error(`Migration is not release-required: ${file}`);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const featureContracts = {
  "52-group-discovery-access.sql": {
    tables: [["chats", "group_visibility,join_policy"], ["group_join_requests", "id,chat_id,user_id,status"]],
    functions: ["request_group_membership", "resolve_group_join_request"],
  },
  "53-interests-topics.sql": {
    tables: [["interest_categories", "slug,name"], ["interests", "slug,category_slug,name"], ["user_interests", "user_id,interest_slug"], ["group_discovery_profiles", "chat_id,primary_category_slug,language,region"], ["group_interests", "chat_id,interest_slug"]],
    functions: ["set_user_interests", "set_group_discovery_profile"],
  },
  "54-presence-privacy.sql": {
    tables: [["user_privacy_settings", "user_id,online_scope,gaming_scope,music_scope,rooms_scope,invite_scope,connection_request_scope,appear_in_recommendations,show_interests"]],
    functions: ["set_user_privacy_settings", "privacy_scope_allows", "list_visible_online_user_ids"],
  },
  "55-contact-pins.sql": {
    tables: [["user_contact_pins", "user_id,pinned_user_id,position"]],
    functions: ["toggle_user_contact_pin"],
  },
};

const openApiResponse = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
if (!openApiResponse.ok) throw new Error(`Unable to load Supabase schema: ${openApiResponse.status}`);
const openApi = await openApiResponse.json();
const paths = new Set(Object.keys(openApi.paths ?? {}));

for (const file of requested) {
  const contract = featureContracts[file];
  if (!contract) throw new Error(`No safe schema contract for manual registration: ${file}`);
  for (const [table, columns] of contract.tables) {
    const { error } = await admin.from(table).select(columns, { head: true, count: "exact" });
    if (error) throw new Error(`${file}: public.${table} does not match: ${error.message}`);
  }
  for (const functionName of contract.functions) {
    if (!paths.has(`/rpc/${functionName}`)) throw new Error(`${file}: RPC ${functionName} is missing from PostgREST schema`);
  }
}

const releaseVersion = JSON.parse(readFileSync(resolve("desktop/package.json"), "utf8")).version;
for (const file of requested) {
  const source = readFileSync(resolve("drizzle", file), "utf8");
  const { error } = await admin.from("app_schema_migrations").upsert({
    id: file,
    checksum: migrationChecksum(source),
    release_version: releaseVersion,
    applied_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw new Error(`${file}: unable to register checksum: ${error.message}`);
  console.log(`Registered ${file}`);
}
