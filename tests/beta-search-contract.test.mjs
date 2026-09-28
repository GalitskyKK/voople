import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("beta search has a dedicated people endpoint without deferred content queries", () => {
  const router = read("src/server/trpc/routers/search.ts");
  const service = read("src/server/services/search.service.ts");
  const web = read("src/components/explore/UserSearch.tsx");
  const desktop = read("desktop/src/explore/useDesktopExplore.ts");
  assert.match(router, /beta: protectedProcedure[\s\S]*searchBetaPeople/);
  const beta = service.slice(service.indexOf("export async function searchBetaPeople"), service.indexOf("export async function getExploreHighlights"));
  assert.match(beta, /filterUnblockedUserIdsRest/);
  assert.match(beta, /if \(!query\.trim\(\)\.replace\(/);
  assert.match(beta, /listVisibleOnlineUserIdsRest/);
  assert.match(beta, /getProfileCommonGroupsRest/);
  assert.match(beta, /assertCanOpenDirectChatRest/);
  assert.doesNotMatch(beta, /searchPostsRest|searchHashtagsRest/);
  assert.match(web, /search\.beta\.useQuery/);
  assert.match(desktop, /client\.query\("search\.beta"/);
});

test("public group search excludes private and unlisted groups at the data boundary", () => {
  const data = read("src/server/data/chat-discovery-rest.ts");
  const scoped = data.slice(data.indexOf("export async function listPublicGroupsRest"), data.indexOf("export async function listTopPublicGroupsRest"));
  assert.equal((scoped.match(/\.eq\("group_visibility", "public"\)/g) ?? []).length, 2);
  assert.match(scoped, /description/);
  const results = read("src/components/explore/BetaSearchResults.tsx");
  assert.match(results, /ProfileFriendAction/);
  assert.match(results, /person\.canMessage \?/);
  assert.match(results, /chat\.joinPublicGroup/);
});
