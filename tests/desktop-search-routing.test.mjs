import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { desktopSearchDestination } from "../desktop/src/navigation/desktop-search-route.ts";

test("desktop search navigation separates route identity from q", () => {
  assert.deepEqual(desktopSearchDestination("/search?q=%D0%B0%D1%83%D1%86%D0%B0%D1%83%D1%86"), {
    pathname: "/search",
    query: "ауцауц",
  });
  assert.deepEqual(desktopSearchDestination("/explore?q=groups"), {
    pathname: "/search",
    query: "groups",
  });
  assert.deepEqual(desktopSearchDestination("/search"), {
    pathname: "/search",
    query: "",
  });
  assert.equal(desktopSearchDestination("/messages?surface=now"), null);
});

test("desktop shell passes the parsed query into Explore without making it part of pathname", () => {
  const shell = readFileSync(new URL("../desktop/src/shell/DesktopShell.tsx", import.meta.url), "utf8");
  const explore = readFileSync(new URL("../desktop/src/adapters/DesktopExploreAdapter.tsx", import.meta.url), "utf8");

  assert.match(shell, /desktopSearchDestination\(href\)/);
  assert.match(shell, /initialQuery=\{searchQuery\}/);
  assert.match(shell, /key=\{\`search:\$\{searchQuery\}\`\}/);
  assert.match(explore, /useDebouncedSearchQuery\(300, initialQuery\)/);
});
