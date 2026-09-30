import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

import { parseDatabaseDate } from "../src/lib/format/database-date.ts";
import { summarizeGroupRoomActivity } from "../src/lib/chat/room-activity.ts";
import { messageRoomContextKey } from "../src/lib/chat/message-room-context.ts";

const transpile = async (path) => ts.transpileModule(
  await readFile(new URL(`../${path}`, import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;

globalThis.__timelineDate = parseDatabaseDate;
const timeCode = (await transpile("src/lib/format/message-time.ts"))
  .replace('import { parseDatabaseDate } from "./database-date";',
    "const parseDatabaseDate = globalThis.__timelineDate;");
const { dayKeyFromIso, formatMessageDateLabel } =
  await import(`data:text/javascript,${encodeURIComponent(timeCode)}`);
globalThis.__timelineDeps = { dayKeyFromIso, formatMessageDateLabel,
  summarizeGroupRoomActivity, messageRoomContextKey, parseDatabaseDate };
const timelineCode = (await transpile("src/lib/chat/group-messages.ts"))
  .replace(/import \{[^}]+\} from "@\/lib\/format\/message-time";/,
    "const { dayKeyFromIso, formatMessageDateLabel } = globalThis.__timelineDeps;")
  .replace(/import \{[^}]+\} from "@\/lib\/format\/database-date";/,
    "const { parseDatabaseDate } = globalThis.__timelineDeps;")
  .replace(/import \{[^}]+\} from "@\/lib\/chat\/message-room-context";/,
    "const { messageRoomContextKey } = globalThis.__timelineDeps;")
  .replace(/import \{[^}]+\} from "@\/lib\/chat\/room-activity";/,
    "const { summarizeGroupRoomActivity } = globalThis.__timelineDeps;");
const { buildChatTimeline } = await import(`data:text/javascript,${encodeURIComponent(timelineCode)}`);
delete globalThis.__timelineDate;
delete globalThis.__timelineDeps;

const localIso = (year, month, day, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString();
const message = (id, createdAt, senderId = "alice") =>
  ({ id, createdAt, senderId, content: [{ type: "text", text: id }] });
const ended = (id, createdAt) => ({ id, createdAt, senderId: "system",
  content: [{ type: "roomEvent", roomKind: "group", event: "ended", durationSeconds: 60 }] });
const shape = (items) => items.map((item) => item.type === "message"
  ? `message:${item.message.id}` : `${item.type}:${item.key}`);

test("historical room-only days precede today's newest message with one header each", () => {
  const now = new Date();
  const today = localIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const items = buildChatTimeline([
    message("new", today), ended("sep", localIso(2026, 9, 15)),
    ended("aug2", localIso(2026, 8, 26)), ended("aug1", localIso(2026, 8, 25)),
  ]);
  assert.deepEqual(shape(items), [
    "date:date-2026-7-25", "roomSummary:room-summary-2026-7-25",
    "date:date-2026-7-26", "roomSummary:room-summary-2026-7-26",
    "date:date-2026-8-15", "roomSummary:room-summary-2026-8-15",
    `date:date-${dayKeyFromIso(today)}`, "message:new",
  ]);
  assert.equal(items.at(-1).message.id, "new");
  assert.equal(items.at(-2).label, "Сегодня");
});

test("same-day summaries collapse ahead of messages without duplicate dates", () => {
  const day = localIso(2026, 8, 25);
  const items = buildChatTimeline([
    message("later", localIso(2026, 8, 25, 14)), ended("end2", localIso(2026, 8, 25, 13)),
    message("early", localIso(2026, 8, 25, 11)), ended("end1", day),
  ]);
  assert.deepEqual(shape(items), [
    "date:date-2026-7-25", "roomSummary:room-summary-2026-7-25",
    "message:early", "message:later",
  ]);
  assert.equal(items[1].sessions, 2);
  assert.equal(items.filter((item) => item.type === "date").length, 1);
});

test("optimistic newest messages stay at the bottom and equal timestamps are stable", () => {
  const day = localIso(2026, 9, 15);
  const later = localIso(2026, 9, 16);
  const items = buildChatTimeline([
    message("optimistic", later), message("second", day),
    message("first", day), ended("old", localIso(2026, 8, 25)),
  ]);
  assert.deepEqual(items.filter((item) => item.type === "message").map((item) => item.message.id),
    ["second", "first", "optimistic"]);
  assert.equal(items.at(-1).message.id, "optimistic");
  assert.equal(items.filter((item) => item.type === "date").length, 3);
});

test("chronological sorting preserves message grouping and reply boundaries", () => {
  const earlier = message("earlier", localIso(2026, 9, 15, 12));
  const later = message("later", new Date(parseDatabaseDate(earlier.createdAt).getTime() + 60_000).toISOString());
  const reply = { ...message("reply", new Date(parseDatabaseDate(later.createdAt).getTime() + 60_000).toISOString()), replyTo: { id: "other" } };
  const items = buildChatTimeline([reply, later, earlier]).filter((item) => item.type === "message");
  assert.deepEqual(items.map((item) => [item.message.id, item.groupPosition]),
    [["earlier", "start"], ["later", "end"], ["reply", "only"]]);
});

test("web and Desktop streams retain bottom alignment after message insertion", async () => {
  const [web, desktop, scroll] = await Promise.all([
    readFile(new URL("../src/components/chat/ChatWindow.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopChatThreadAdapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useChatAutoScroll.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [web, desktop]) {
    assert.match(source, /buildChatTimeline\(data(?:\?)?\.messages/);
    assert.match(source, /useChatAutoScroll\(chatId, data\?\.messages\.length \?\? 0\)/);
  }
  assert.match(scroll, /\[attachmentVersion, conversationKey, itemCount\]/);
  assert.match(scroll, /container\.scrollTop = container\.scrollHeight/);
});
