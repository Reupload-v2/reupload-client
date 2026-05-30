import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ReuploadClient } from "./client.js";
import { testFile } from "./test-helpers.js";

describe("ReuploadClient.uploadFile", () => {
  it("runs prepare → cdn put → complete", async () => {
    const calls: string[] = [];

    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);

      if (url.endsWith("/uploads/prepare")) {
        return new Response(
          JSON.stringify({
            uploadUrl: "https://cdn.example/v1/upload/token",
            uploadId: "up-1",
            fileId: "file-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/uploads/complete")) {
        return new Response(
          JSON.stringify({ fileId: "file-1", status: "processing" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("cdn.example")) {
        assert.equal(init?.method, "PUT");
        return new Response(null, { status: 200 });
      }

      return new Response("not found", { status: 404 });
    };

    const client = new ReuploadClient({
      apiUrl: "http://localhost:3001",
      fetch: fetchMock,
    });

    const file = testFile("hello", "hello.txt", "text/plain");
    const result = await client.uploadFile(file);

    assert.equal(result.uploadId, "up-1");
    assert.equal(result.fileId, "file-1");
    assert.equal(calls.length, 3);
    assert.ok(calls[0]?.includes("/uploads/prepare"));
    assert.ok(calls[1]?.includes("cdn.example"));
    assert.ok(calls[2]?.includes("/uploads/complete"));
  });
});
