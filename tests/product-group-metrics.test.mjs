import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Group metrics use privacy-safe subjects and server milestones", async () => {
  const [migration, manifest, telemetry, data, router, groupRouter] = await Promise.all([
    read("drizzle/71-product-group-metrics.sql"),
    read("scripts/migration-manifest.mjs"),
    read("src/server/services/client-telemetry.service.ts"),
    read("src/server/data/product-analytics-rest.ts"),
    read("src/server/trpc/routers/chat-core-rework.ts"),
    read("src/server/trpc/routers/chat.ts"),
  ]);

  assert.equal(manifest.match(/71-product-group-metrics\.sql/g)?.length, 2);
  assert.match(migration, /subject_kind varchar\(16\)/);
  assert.match(migration, /subject_key varchar\(64\)/);
  assert.match(migration, /product_group_weekly_metrics/);
  assert.match(migration, /product_group_activation_metrics/);
  assert.match(migration, /product_group_retention_metrics/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.product_group_weekly_metrics/);
  assert.doesNotMatch(migration, /group_id|room_id|invite_id|user_id/i);

  assert.match(telemetry, /actorKey\(`subject:\$\{kind\}:\$\{id\}`\)/);
  assert.match(data, /subject_kind: input\.subjectKind \?\? null/);
  assert.match(data, /subject_key: input\.subjectKey \?\? null/);
  assert.match(router, /transition: joined\.result\.switched \? "switch" : "join"/);
  assert.match(router, /dedupeId: `session:\$\{joined\.result\.sessionId\}`/);
  assert.match(router, /subject: \{ kind: "group", id: input\.groupId \}/);
  assert.match(groupRouter, /subject: \{ kind: "group", id: result \}/);
});

test("metrics spec measures Group value instead of UI clicks", async () => {
  const spec = await read("docs/product-metrics.md");

  assert.match(spec, /Weekly recurring voice Groups/);
  assert.match(spec, /Group voice activation/);
  assert.match(spec, /W1 Group retention/);
  assert.match(spec, /Split \/ Switch \/ Voop/);
  assert.match(spec, /Detection alone\s+is not success and never creates a Group/);
});
