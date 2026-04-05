import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../dist/webhook.js";

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("returns true for valid signature", () => {
    const payload = '{"event":"sms.sent"}';
    const sig = sign(payload, "secret123");
    assert.ok(verifyWebhookSignature(payload, sig, "secret123"));
  });

  it("returns false for invalid signature", () => {
    assert.ok(!verifyWebhookSignature("payload", "invalid", "secret"));
  });

  it("returns false for wrong secret", () => {
    const payload = '{"event":"test"}';
    const sig = sign(payload, "correct");
    assert.ok(!verifyWebhookSignature(payload, sig, "wrong"));
  });

  it("accepts object payload with sorted keys", () => {
    const obj = { z_key: "last", a_key: "first" };
    const serialized = JSON.stringify(obj, Object.keys(obj).sort());
    const sig = sign(serialized, "secret");
    assert.ok(verifyWebhookSignature(obj, sig, "secret"));
  });

  it("handles empty string payload", () => {
    const sig = sign("", "secret");
    assert.ok(verifyWebhookSignature("", sig, "secret"));
  });
});
