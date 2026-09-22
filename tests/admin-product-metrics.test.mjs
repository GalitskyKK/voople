import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("admin overview reads only privacy-safe Group metric views", () => {
  const data = read("src/server/data/admin-observability-rest.ts");
  const view = read("src/components/admin/AdminOverviewPage.tsx");

  assert.match(data, /product_group_weekly_metrics/);
  assert.match(data, /product_group_activation_metrics/);
  assert.match(data, /product_group_retention_metrics/);
  assert.doesNotMatch(data, /select\([^)]*subject_key/);
  assert.match(view, /Групповой продукт/);
  assert.match(view, /Повторяющийся войс/);
  assert.match(view, /Switch rate/);
  assert.match(view, /Активация за 24 часа/);
  assert.match(view, /W1 retention/);
});
