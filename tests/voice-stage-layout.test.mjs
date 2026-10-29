import assert from "node:assert/strict";
import test from "node:test";
import { resolveVoiceStageLayout } from "../src/lib/livekit/voice-stage-layout.ts";
test("a new screen starts in focus for its owner and viewers", () => {
 assert.deepEqual(resolveVoiceStageLayout("track:owner","Owner",new Set(),null),{focusedMediaId:"screen",layout:"focus"});
 assert.equal(resolveVoiceStageLayout("track:owner","Owner",new Set(["camera"]),{screenKey:"",focusedMediaId:"camera",layout:"grid"}).layout,"focus");
});
test("an explicit grid choice persists for the same screen", () => {
 const choice={screenKey:"track:owner",focusedMediaId:"screen",layout:"grid"};
 assert.deepEqual(resolveVoiceStageLayout("track:owner","Owner",new Set(["camera"]),choice),{focusedMediaId:"screen",layout:"grid"});
});
test("cameras start in the grid and can be focused explicitly", () => {
 assert.deepEqual(resolveVoiceStageLayout(":",null,new Set(["camera"]),null),{focusedMediaId:"camera",layout:"grid"});
 assert.equal(resolveVoiceStageLayout(":",null,new Set(["camera"]),{screenKey:":",focusedMediaId:"camera",layout:"focus"}).layout,"focus");
});
test("removed focus falls back without reordering remaining cameras", () => {
 assert.equal(resolveVoiceStageLayout(":",null,new Set(["first","second"]),{screenKey:":",focusedMediaId:"gone",layout:"focus"}).focusedMediaId,"first");
 assert.equal(resolveVoiceStageLayout(":",null,new Set(),null).focusedMediaId,null);
});
