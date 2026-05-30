import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ReuploadClientError } from "./errors.js";
import { BackendHttp } from "./http.js";

describe("BackendHttp", () => {
  it("calls backend routes and parses JSON", async () => {
    const fetchMock: typeof fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:3001/uploads/prepare");
      assert.equal(init?.method, "POST");

      return new Response(
        JSON.stringify({
          uploadUrl: "https://cdn.example/upload",
          uploadId: "up-1",
          fileId: "file-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const http = new BackendHttp({
      apiUrl: "http://localhost:3001",
      fetch: fetchMock,
    });

    const data = await http.request<{ uploadId: string }>("POST", "/uploads/prepare", {
      body: JSON.stringify({ filename: "a.txt", contentType: "text/plain", size: 1 }),
      headers: { "Content-Type": "application/json" },
    });

    assert.equal(data.uploadId, "up-1");
  });

  it("throws ReuploadClientError on failure", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ message: "Bad request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });

    const http = new BackendHttp({
      apiUrl: "http://localhost:3001",
      fetch: fetchMock,
    });

    await assert.rejects(
      () => http.request("POST", "/uploads/prepare"),
      (error: unknown) => {
        assert.ok(error instanceof ReuploadClientError);
        assert.equal(error.status, 400);
        assert.equal(error.phase, "backend");
        return true;
      },
    );
  });
});
