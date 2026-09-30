import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Group Settings and both clients have no interest taxonomy surface or requests", () => {
  const shared = read("src/components/chat/GroupManagementSheetView.tsx");
  const web = read("src/components/chat/GroupInviteSheet.tsx");
  const desktop = read("desktop/src/adapters/DesktopGroupManagementAdapter.tsx");
  for (const source of [shared, web, desktop]) {
    assert.doesNotMatch(source, /GroupDiscoverySettingsPanel|loadInterestCatalog|loadDiscoveryProfile|updateDiscoveryProfile/);
  }
  assert.doesNotMatch(web, /social\.(?:interestCatalog|groupDiscoveryProfile|setGroupDiscoveryProfile)/);
  assert.doesNotMatch(desktop, /social\.(?:interestCatalog|groupDiscoveryProfile|setGroupDiscoveryProfile)/);
  assert.match(shared, /<GroupVisibilitySettings/);
  assert.match(shared, /<GroupJoinRequestsPanel/);
  assert.match(shared, /<GroupEmojiManager/);
  assert.match(shared, /<GroupSoundManager/);
});

test("social router retains privacy and friendship but exposes no taxonomy procedures", () => {
  const router = read("src/server/trpc/routers/social.ts");
  assert.doesNotMatch(router, /\b(?:interestCatalog|myInterests|setMyInterests|groupDiscoveryProfile|setGroupDiscoveryProfile)\s*:/);
  for (const procedure of ["myPrivacy", "setMyPrivacy", "friendState", "sendFriendRequest", "setUserBlock"]) {
    assert.match(router, new RegExp(`\\b${procedure}: protectedProcedure`));
  }
});

test("public Group search and page do not read taxonomy tables", () => {
  const discovery = read("src/server/data/chat-discovery-rest.ts");
  const publicGroup = discovery.slice(discovery.indexOf("export async function getPublicGroupBySlugRest"), discovery.indexOf("export async function joinPublicGroupRest"));
  assert.doesNotMatch(publicGroup, /interest_categories|\binterests\b|group_discovery_profiles|group_interests|user_interests/);
  assert.match(publicGroup, /\.ilike\("name"/);
  assert.match(publicGroup, /\.ilike\("public_slug"/);
  assert.match(publicGroup, /\.eq\("group_visibility", "public"\)/);
  assert.match(discovery, /rpc\("request_group_membership"/);
});

test("taxonomy telemetry events and profile reads are gone", () => {
  const telemetry = read("src/lib/telemetry/types.ts");
  const profile = read("src/server/data/profile-rest.ts");
  const home = read("src/server/data/home-overview-rest.ts");
  assert.doesNotMatch(telemetry, /interest_added|interest_removed|group_topics_updated|"category"/);
  assert.doesNotMatch(profile, /getPublicUserInterestsRest|user_interests/);
  assert.doesNotMatch(home, /user_interests/);
  assert.match(home, /listFriendIdsRest/);
  assert.match(home, /chat_members/);
});
