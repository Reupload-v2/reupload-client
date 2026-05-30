import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_FILE_ROUTER_ROUTES, resolveRoutes } from "./routes.js";

describe("resolveRoutes", () => {
  it("uses doc defaults and encodes path params", () => {
    const routes = resolveRoutes();
    assert.equal(routes.prepare, "/uploads/prepare");
    assert.equal(
      routes.status("id/with space"),
      "/uploads/id%2Fwith%20space/status",
    );
    assert.equal(routes.fileAccess("file-1"), "/files/file-1/access");
  });

  it("merges overrides", () => {
    const routes = resolveRoutes({
      prepare: "/api/uploads/prepare",
    });
    assert.equal(routes.prepare, "/api/uploads/prepare");
    assert.equal(routes.complete, DEFAULT_FILE_ROUTER_ROUTES.complete);
  });
});
