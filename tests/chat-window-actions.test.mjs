import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("ChatWindow delegates secondary message actions to one domain hook", () => {
  const window = read("src/components/chat/ChatWindow.tsx");
  const actions = read("src/hooks/useChatMessageActions.ts");
  const baseline = read(".architecture-baseline.json");

  assert.match(window, /useChatMessageActions\(chatId\)/);
  assert.doesNotMatch(window, /trpc\.chat\.(deleteMessage|toggleReaction)\.useMutation/);
  assert.doesNotMatch(window, /trpc\.playlist\.addFromChatMessage\.useMutation/);

  assert.match(actions, /trpc\.chat\.deleteMessage\.useMutation/);
  assert.match(actions, /trpc\.chat\.toggleReaction\.useMutation/);
  assert.match(actions, /trpc\.playlist\.addFromChatMessage\.useMutation/);
  assert.match(actions, /window\.clearTimeout/);
  assert.doesNotMatch(baseline, /src\/components\/chat\/ChatWindow\.tsx/);
});
