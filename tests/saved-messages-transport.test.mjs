import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Saved Messages transport is protected and always scopes persistence to its owner", () => {
  const router = read("src/server/trpc/routers/saved-messages.ts");
  const data = read("src/server/data/saved-messages-rest.ts");

  assert.doesNotMatch(router, /publicProcedure/);
  assert.match(router, /assertServerFeatureAvailable\("saved_messages", userId\)/);
  assert.match(router, /getServerFeatureAccess\("saved_messages", ctx\.user\.id\)/);
  assert.match(router, /ownerId: ctx\.user\.id/);
  assert.match(router, /rateLimits\.sendMessage/);
  assert.ok((data.match(/\.eq\("owner_id", (input\.)?ownerId\)/g) ?? []).length >= 6);
  assert.match(data, /\.eq\("user_id", input\.ownerId\)/);
  assert.match(data, /created_at\.lt\.\$\{input\.cursor\.createdAt\}/);
  assert.match(data, /id\.lt\.\$\{input\.cursor\.id\}/);
});

test("Saved Messages never emits private content into product telemetry", () => {
  const router = read("src/server/trpc/routers/saved-messages.ts");
  const service = read("src/server/services/saved-messages.service.ts");
  const data = read("src/server/data/saved-messages-rest.ts");

  for (const source of [router, service, data]) {
    assert.doesNotMatch(source, /recordServerProductEvent|telemetry/i);
  }
  assert.match(service, /resolvePublicMediaKey\(input\.mediaKey, input\.ownerId, "chat"\)/);
  assert.match(data, /assertOwnedUploadKey\(row\.media_url, ownerId, "chat"\)/);
  assert.match(data, /createPresignedGetUrl/);
});

test("Saved Messages remains a separate root domain instead of extending chat membership", () => {
  const root = read("src/server/trpc/root.ts");
  const data = read("src/server/data/saved-messages-rest.ts");

  assert.match(root, /savedMessages: savedMessagesRouter/);
  assert.doesNotMatch(data, /chat_members|assertChatMember|direct_chat_pairs/);
});
