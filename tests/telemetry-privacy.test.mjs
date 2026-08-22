import assert from "node:assert/strict";
import test from "node:test";

import { telemetryRouteTemplate } from "../src/lib/telemetry/privacy.ts";

test("telemetry routes remove profile names and private entity identifiers", () => {
  assert.equal(telemetryRouteTemplate("/alice"), "/_profile");
  assert.equal(telemetryRouteTemplate("/messages/52b3dd34-2b91-4ac2-a7e2-f3ab8cce12ba"), "/messages/_id");
  assert.equal(telemetryRouteTemplate("/invite/private-token?source=chat"), "/invite/_token");
  assert.equal(telemetryRouteTemplate("/group/my-friends"), "/group/_slug");
});

test("telemetry retains only known product surfaces", () => {
  assert.equal(telemetryRouteTemplate("/shop/payment/return"), "/shop/payment/return");
  assert.equal(telemetryRouteTemplate("/feed"), "/feed");
});
