import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { testFile } from "./test-helpers.js";
import { formatBytes, validateFile } from "./validate.js";

describe("validateFile", () => {
  it("rejects empty files", () => {
    const file = testFile("", "empty.txt", "text/plain");
    const result = validateFile(file);
    assert.equal(result.ok, false);
  });

  it("enforces max size and mime", () => {
    const file = testFile("xx", "photo.png", "image/png");
    assert.equal(validateFile(file, { maxBytes: 1 }).ok, false);
    assert.equal(validateFile(file, { accept: ["image/*"] }).ok, true);
    assert.equal(validateFile(file, { accept: ["video/*"] }).ok, false);
  });
});

describe("formatBytes", () => {
  it("formats human-readable sizes", () => {
    assert.equal(formatBytes(500), "500 B");
    assert.match(formatBytes(2048), /KB/);
  });
});
