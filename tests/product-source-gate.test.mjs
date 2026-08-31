import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const finalPlanPath = new URL(
  "../temp_info_for_redesign_and_improvement/VOOPLE_FINAL_PRODUCT_SOCIAL_UX_IMPLEMENTATION_PLAN.md",
  import.meta.url,
);
const coreReworkPlanPath = new URL(
  "../rework_plan/VOOPLE_CORE_REWORK_PLAN.md",
  import.meta.url,
);
const coreArchitecturePath = new URL(
  "../docs/core-rework-architecture.md",
  import.meta.url,
);
const matrixPath = new URL("../docs/product-delivery-matrix.md", import.meta.url);
const agentsPath = new URL("../AGENTS.md", import.meta.url);

const p0Requirements = [
  "Group visibility",
  "Join policy",
  "Interests/topics",
  "«Сейчас»",
  "«Продолжить»",
  "Relationship score",
  "Presence privacy",
  "Group Info",
  "Room activity",
  "Room CTA",
];

test("canonical product sources and every P0 result remain release-tracked", async () => {
  const [corePlan, finalPlan, coreArchitecture, matrix, agents] = await Promise.all([
    readFile(coreReworkPlanPath, "utf8"),
    readFile(finalPlanPath, "utf8"),
    readFile(coreArchitecturePath, "utf8"),
    readFile(matrixPath, "utf8"),
    readFile(agentsPath, "utf8"),
  ]);

  assert.match(corePlan, /## 29\. Порядок реализации/);
  assert.match(corePlan, /## 30\. Definition of Done/);
  assert.match(finalPlan, /# 37\. Порядок реализации/);
  assert.match(finalPlan, /^# \d+\. Acceptance criteria$/m);
  assert.match(coreArchitecture, /## Compatibility and rollout/);
  assert.match(matrix, /## Reference boards/);
  assert.match(matrix, /## P0 — core social/);
  assert.match(matrix, /## Cross-platform architecture gate/);
  assert.match(agents, /## Product source gate/);
  assert.match(agents, /VOOPLE_CORE_REWORK_PLAN\.md/);

  for (const requirement of p0Requirements) {
    assert.ok(matrix.includes(requirement), `delivery matrix is missing P0: ${requirement}`);
  }
});
