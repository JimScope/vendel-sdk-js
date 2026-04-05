import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VendelError, VendelAPIError, VendelQuotaError } from "../dist/errors.js";

describe("VendelAPIError", () => {
  it("has statusCode and detail", () => {
    const err = new VendelAPIError(400, "Bad request", { field: "body" });
    assert.equal(err.statusCode, 400);
    assert.deepEqual(err.detail, { field: "body" });
  });

  it("message format is [statusCode] message", () => {
    const err = new VendelAPIError(422, "Validation failed");
    assert.equal(err.message, "[422] Validation failed");
  });

  it("is instance of VendelError", () => {
    const err = new VendelAPIError(500, "Internal error");
    assert.ok(err instanceof VendelError);
    assert.ok(err instanceof Error);
  });

  it("defaults detail to empty object", () => {
    const err = new VendelAPIError(400, "Bad");
    assert.deepEqual(err.detail, {});
  });
});

describe("VendelQuotaError", () => {
  it("has limit, used, available from detail", () => {
    const err = new VendelQuotaError("Quota exceeded", {
      limit: 100, used: 100, available: 0,
    });
    assert.equal(err.limit, 100);
    assert.equal(err.used, 100);
    assert.equal(err.available, 0);
  });

  it("is instance of VendelAPIError", () => {
    const err = new VendelQuotaError("Exceeded", {});
    assert.ok(err instanceof VendelAPIError);
    assert.equal(err.statusCode, 429);
  });

  it("defaults quota fields to 0", () => {
    const err = new VendelQuotaError("Exceeded", {});
    assert.equal(err.limit, 0);
    assert.equal(err.used, 0);
    assert.equal(err.available, 0);
  });
});
