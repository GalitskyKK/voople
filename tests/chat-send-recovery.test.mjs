import assert from "node:assert/strict";
import test from "node:test";

import {
  recoverFailedSendText,
  recoverFailedSendValue,
} from "../src/lib/chat/send-draft-recovery.ts";

test("failed sends restore the submitted draft without overwriting newer input", () => {
  assert.equal(recoverFailedSendText("", "неотправленный текст"), "неотправленный текст");
  assert.equal(recoverFailedSendText("новый текст", "старый текст"), "новый текст");
  assert.deepEqual(recoverFailedSendValue(null, { id: "reply" }), { id: "reply" });
  assert.deepEqual(
    recoverFailedSendValue({ id: "new-upload" }, { id: "failed-upload" }),
    { id: "new-upload" },
  );
});
