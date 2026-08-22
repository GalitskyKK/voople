import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("online presence is filtered by the server instead of a global client channel", () => {
  const web = read("src/providers/OnlinePresenceProvider.tsx");
  const desktop = read("desktop/src/providers/DesktopPresenceProvider.tsx");
  assert.doesNotMatch(web, /presence:global/);
  assert.doesNotMatch(desktop, /presence:global/);
  assert.match(web, /social\.visiblePresence/);
  assert.match(desktop, /social\.visiblePresence/);
});

test("web and desktop compose the same privacy settings view", () => {
  const web = read("src/components/settings/WebInterestSettings.tsx");
  const desktop = read("desktop/src/settings/DesktopInterestSettings.tsx");
  assert.match(web, /UserPrivacySettingsPanel/);
  assert.match(desktop, /UserPrivacySettingsPanel/);
});

test("privacy migration contains every product scope and server filter", () => {
  const migration = read("drizzle/54-presence-privacy.sql");
  for (const scope of ["everyone", "contacts_and_groups", "contacts", "nobody"]) {
    assert.match(migration, new RegExp(`'${scope}'`));
  }
  assert.match(migration, /list_visible_online_user_ids/);
  assert.match(migration, /show_interests/);
});
