import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Saved Messages has a dedicated owner-only persistence boundary", () => {
  const migration = read("drizzle/67-saved-messages.sql");
  const schema = read("src/server/db/schema.ts");
  const manifest = read("scripts/migration-manifest.mjs");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.saved_messages/);
  assert.match(migration, /owner_id uuid NOT NULL REFERENCES public\.users/);
  assert.match(migration, /saved_messages_owner_time_idx/);
  assert.match(migration, /USING gin \(to_tsvector\('simple'/);
  assert.match(migration, /v_reply_owner_id <> NEW\.owner_id/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.saved_messages FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /CREATE POLICY/);
  assert.match(schema, /export const savedMessages = pgTable/);
  assert.match(manifest, /"67-saved-messages\.sql"/);
});

test("Saved Messages foundation is not disguised as a chat participant", () => {
  const migration = read("drizzle/67-saved-messages.sql");
  const design = read("docs/saved-messages.md");

  assert.doesNotMatch(migration, /INSERT INTO public\.(chats|chat_members|direct_chat_pairs)/);
  assert.match(design, /not a direct[\s\S]*synthetic account/);
  assert.match(design, /does not create `chats`, `chat_members`, unread state/);
  assert.match(design, /route and sidebar entry stay hidden/);
});
