import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("desktop RC records native audio capability and preserves a visible fallback", () => {
  const workflow = read(".github/workflows/desktop-release.yml");

  assert.match(workflow, /--features process-audio-publisher/);
  assert.match(workflow, /processAudioPublisher = \$env:PROCESS_AUDIO_INCLUDED/);
  assert.match(workflow, /video-only fallback/);
  assert.match(workflow, /next-feature-release-backlog\.md/);
});

test("a video-only RC makes Windows application audio mandatory next release work", () => {
  const backlog = read("docs/next-feature-release-backlog.md");

  assert.match(backlog, /оставшиеся 23 записи/);
  assert.match(backlog, /ChatRoomControl/);
  assert.match(backlog, /processAudioPublisher: false/);
  assert.match(backlog, /следующий feature-релиз нельзя\s+продвигать в stable/);
  assert.match(backlog, /Автоматический или молчаливый перенос P0/);
});
