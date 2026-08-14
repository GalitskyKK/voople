import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPostMediaCount,
  assertPostMediaSizes,
  normalizePostMedia,
  POST_MEDIA_LIMITS,
} from "../src/lib/post-media.ts";
import {
  assertAllowedPostMediaMime,
  postMediaTypeForMime,
} from "../src/lib/object-storage/mime.ts";
import { sniffUploadKind } from "../src/lib/object-storage/sniff.ts";

const mb = 1024 * 1024;

test("post media count and free/Plus limits match the product contract", () => {
  assert.doesNotThrow(() => assertPostMediaCount(POST_MEDIA_LIMITS.maxItems));
  assert.throws(() => assertPostMediaCount(POST_MEDIA_LIMITS.maxItems + 1), /до 10/);
  assert.doesNotThrow(() => assertPostMediaSizes([15 * mb, 15 * mb], false));
  assert.throws(() => assertPostMediaSizes([15 * mb + 1], false), /15 МБ/);
  assert.doesNotThrow(() => assertPostMediaSizes([100 * mb, 100 * mb], true));
  assert.throws(() => assertPostMediaSizes([100 * mb + 1], true), /100 МБ/);
  assert.throws(() => assertPostMediaSizes(Array(7).fill(15 * mb), false), /100 МБ/);
  assert.doesNotThrow(() => assertPostMediaSizes(Array(5).fill(100 * mb), true));
});

test("gallery dual-read prefers ordered post_media and falls back to legacy fields", () => {
  const media = [
    { id: "second", position: 2, url: "https://cdn.voople.ru/2.webp", type: "image" },
    { id: "first", position: 0, url: "https://cdn.voople.ru/1.webp", type: "image" },
  ];
  assert.deepEqual(
    normalizePostMedia({ id: "post", media, mediaUrl: "legacy", mediaType: "image" }).map((item) => item.id),
    ["first", "second"],
  );
  assert.deepEqual(
    normalizePostMedia({ id: "post", media: undefined, mediaUrl: "legacy", mediaType: "gif" }),
    [{ id: "post:legacy", position: 0, url: "legacy", type: "gif" }],
  );
  assert.deepEqual(
    normalizePostMedia({ id: "post", media: undefined, mediaUrl: "circle", mediaType: "circle" }),
    [],
  );
});

test("post MIME and magic-byte checks reject disguised files", () => {
  assert.equal(assertAllowedPostMediaMime("IMAGE/PNG; charset=binary"), "image/png");
  assert.equal(postMediaTypeForMime("video/webm"), "video");
  assert.throws(() => assertAllowedPostMediaMime("text/html"), /JPEG/);
  assert.equal(
    sniffUploadKind(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image",
  );
  assert.equal(sniffUploadKind(new TextEncoder().encode("<script>alert(1)</script>")), null);
});
