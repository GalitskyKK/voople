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
const coreReworkAddendumPath = new URL(
  "../rework_plan/VOOPLE_CORE_REWORK_ADDENDUM.md",
  import.meta.url,
);
const coreArchitecturePath = new URL(
  "../docs/core-rework-architecture.md",
  import.meta.url,
);
const matrixPath = new URL("../docs/product-delivery-matrix.md", import.meta.url);
const agentsPath = new URL("../AGENTS.md", import.meta.url);
const productPath = new URL("../PRODUCT.md", import.meta.url);

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

test("PRODUCT.md owns the current contract while historical plans and P0 results remain tracked", async () => {
  const [corePlan, coreAddendum, finalPlan, coreArchitecture, matrix, agents, product] = await Promise.all([
    readFile(coreReworkPlanPath, "utf8"),
    readFile(coreReworkAddendumPath, "utf8"),
    readFile(finalPlanPath, "utf8"),
    readFile(coreArchitecturePath, "utf8"),
    readFile(matrixPath, "utf8"),
    readFile(agentsPath, "utf8"),
    readFile(productPath, "utf8"),
  ]);

  assert.match(corePlan, /## 29\. Порядок реализации/);
  assert.match(corePlan, /## 30\. Definition of Done/);
  assert.match(coreAddendum, /Voople остаётся \*\*ежедневным мессенджером с live-слоем/);
  assert.match(finalPlan, /# 37\. Порядок реализации/);
  assert.match(finalPlan, /^# \d+\. Acceptance criteria$/m);
  assert.match(coreArchitecture, /## Compatibility and rollout/);
  assert.match(matrix, /## Reference boards/);
  assert.match(matrix, /## P0 — core social/);
  assert.match(matrix, /## Cross-platform architecture gate/);
  assert.match(agents, /## Product source gate/);
  assert.match(agents, /`PRODUCT\.md` is the single canonical source for current product behaviour/);
  assert.match(agents, /`DESIGN_SYSTEM\.md` owns presentation/);
  assert.match(agents, /domain ADRs own their/);
  assert.match(agents, /`rework_plan\/`.*historical\/reference/);
  assert.match(coreArchitecture, /Current\s+product behaviour is owned by `PRODUCT\.md`/);
  for (const heading of ["Core entities", "Group navigation", "Core voice actions", "Guests and invitations", "Search and discovery", "Beta profile", "Group Economy"]) {
    assert.ok(product.includes(`## ${heading}`), `PRODUCT.md is missing ${heading}`);
  }
  assert.match(product, /default Group tab is \*\*Войс\*\*/);
  assert.match(product, /\*\*Войс \/ Чат \/ Люди\*\*/);
  assert.match(product, /without mandatory signup/);
  assert.match(product, /Server authorization and source-session\s+freshness are mandatory/);
  assert.doesNotMatch(product, /Opening a Group defaults to Chat/);
  assert.doesNotMatch(product, /canonical product sources remain the authority/);

  for (const requirement of p0Requirements) {
    assert.ok(matrix.includes(requirement), `delivery matrix is missing P0: ${requirement}`);
  }
});
