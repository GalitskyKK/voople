import assert from "node:assert/strict";
import test from "node:test";

import {
  FEATURE_AVAILABILITY,
  PRODUCT_FEATURES,
  resolveFeatureAvailability,
} from "../src/lib/product/feature-availability.ts";

test("every product feature has one availability rule", () => {
  assert.deepEqual(Object.keys(FEATURE_AVAILABILITY).sort(), [...PRODUCT_FEATURES].sort());
});

test("stable messenger core stays available on current platforms", () => {
  for (const platform of ["web", "windows"]) {
    assert.deepEqual(resolveFeatureAvailability("direct_messages", {
      platform,
      channel: "stable",
    }), {
      enabled: true,
      exposure: "primary",
      fallbackHref: "/messages",
      reason: "available",
    });
  }
});

test("unreleased platform apps stay disabled until their vertical slice ships", () => {
  for (const platform of ["macos", "linux", "android", "ios"]) {
    const availability = resolveFeatureAvailability("direct_messages", {
      platform,
      channel: "stable",
    });
    assert.equal(availability.enabled, false);
    assert.equal(availability.reason, "platform");
  }
});

test("core rework surfaces require both internal channel and server capability", () => {
  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "web",
    channel: "stable",
    serverCapabilities: new Set(["core_rework_shell"]),
  }).reason, "channel");

  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "web",
    channel: "internal",
  }).reason, "server");

  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "web",
    channel: "internal",
    serverCapabilities: new Set(["core_rework_shell"]),
  }).enabled, true);
});

test("web beta surfaces stay hidden on unsupported platforms and stable", () => {
  assert.equal(resolveFeatureAvailability("feed_recommendations", {
    platform: "web",
    channel: "beta",
  }).enabled, true);

  const desktopStable = resolveFeatureAvailability("feed_recommendations", {
    platform: "windows",
    channel: "stable",
  });
  assert.equal(desktopStable.enabled, false);
  assert.equal(desktopStable.exposure, "hidden");
  assert.equal(desktopStable.reason, "platform");
});
