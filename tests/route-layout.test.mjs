import assert from "node:assert/strict";
import test from "node:test";

import {
  getAppRouteLayout,
  isAppMessagesPath,
  isAppProfilePath,
} from "../src/lib/layout/route-layout.ts";

test("wide product routes share one web and desktop geometry policy", () => {
  for (const pathname of ["/feed", "/explore", "/notifications", "/events", "/shop"]) {
    assert.equal(getAppRouteLayout(pathname).contentClassName, "max-w-[1440px]");
  }
});

test("message threads and full-page group settings keep the fixed workspace", () => {
  for (const pathname of ["/messages", "/messages/00000000-0000-4000-8000-000000000000", "/messages/00000000-0000-4000-8000-000000000000/settings"]) {
    assert.equal(isAppMessagesPath(pathname), true);
    assert.deepEqual(getAppRouteLayout(pathname), {
      routeKind: "messages",
      contentClassName: "max-w-none",
      fixedViewport: true,
    });
  }
});

test("profile slugs do not swallow reserved application routes", () => {
  assert.equal(isAppProfilePath("/nmkk"), true);
  assert.equal(isAppProfilePath("/me"), true);
  assert.equal(isAppProfilePath("/explore"), false);
  assert.equal(isAppProfilePath("/room-invites"), false);
});
