import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { VendelClient } from "../dist/client.js";
import { VendelAPIError, VendelQuotaError } from "../dist/errors.js";

let fetchCalls = [];
const originalFetch = globalThis.fetch;

function mockFetch(status, body) {
  globalThis.fetch = async (url, opts) => {
    fetchCalls.push({ url, opts });
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: "Mock",
      json: async () => body,
    };
  };
}

beforeEach(() => { fetchCalls = []; });
afterEach(() => { globalThis.fetch = originalFetch; });

function newClient() {
  return new VendelClient({ baseUrl: "https://api.test.com", apiKey: "vk_test" });
}

describe("VendelClient constructor", () => {
  it("strips trailing slash from baseUrl", () => {
    mockFetch(200, {});
    const client = new VendelClient({ baseUrl: "https://api.test.com///", apiKey: "k" });
    client.getQuota();
    assert.ok(fetchCalls[0].url.startsWith("https://api.test.com/api/"));
  });
});

describe("sendSms", () => {
  it("sends correct payload", async () => {
    mockFetch(200, { batch_id: "b1", message_ids: ["m1"], recipients_count: 1, status: "accepted" });
    const client = newClient();
    const resp = await client.sendSms(["+1234567890"], "Hello");
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.deepEqual(body.recipients, ["+1234567890"]);
    assert.equal(body.body, "Hello");
    assert.equal(resp.status, "accepted");
  });

  it("includes group_ids when provided", async () => {
    mockFetch(200, { message_ids: ["m1"], recipients_count: 3, status: "accepted" });
    const client = newClient();
    await client.sendSms(["+1"], "Hi", { groupIds: ["g1", "g2"] });
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.deepEqual(body.group_ids, ["g1", "g2"]);
  });

  it("includes device_id when provided", async () => {
    mockFetch(200, { message_ids: ["m1"], recipients_count: 1, status: "accepted" });
    const client = newClient();
    await client.sendSms(["+1"], "Hi", { deviceId: "dev1" });
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.equal(body.device_id, "dev1");
  });

  it("sets X-API-Key header", async () => {
    mockFetch(200, { message_ids: [], recipients_count: 0, status: "accepted" });
    const client = newClient();
    await client.sendSms(["+1"], "Hi");
    assert.equal(fetchCalls[0].opts.headers["X-API-Key"], "vk_test");
  });
});

describe("sendSmsTemplate", () => {
  it("sends template_id and variables", async () => {
    mockFetch(200, { batch_id: "b1", message_ids: ["m1"], recipients_count: 1, status: "accepted" });
    const client = newClient();
    await client.sendSmsTemplate(["+1"], "tmpl_1", { variables: { code: "1234" } });
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.equal(body.template_id, "tmpl_1");
    assert.equal(body.variables.code, "1234");
    assert.ok(fetchCalls[0].url.endsWith("/api/sms/send-template"));
  });

  it("includes group_ids", async () => {
    mockFetch(200, { message_ids: ["m1"], recipients_count: 5, status: "accepted" });
    const client = newClient();
    await client.sendSmsTemplate([], "tmpl_1", { groupIds: ["g1"] });
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.deepEqual(body.group_ids, ["g1"]);
  });
});

describe("getQuota", () => {
  it("calls correct endpoint with GET", async () => {
    mockFetch(200, { plan: "Pro", sms_sent_this_month: 50, max_sms_per_month: 1000, devices_registered: 2, max_devices: 5, reset_date: "2026-05" });
    const client = newClient();
    const quota = await client.getQuota();
    assert.ok(fetchCalls[0].url.endsWith("/api/plans/quota"));
    assert.equal(quota.plan, "Pro");
  });
});

describe("error handling", () => {
  it("throws VendelAPIError on 400", async () => {
    mockFetch(400, { message: "Bad request" });
    const client = newClient();
    await assert.rejects(() => client.sendSms(["+1"], "Hi"), (err) => {
      assert.ok(err instanceof VendelAPIError);
      assert.equal(err.statusCode, 400);
      return true;
    });
  });

  it("throws VendelQuotaError on 429", async () => {
    mockFetch(429, { detail: "Quota exceeded", limit: 100, used: 100, available: 0 });
    const client = newClient();
    await assert.rejects(() => client.sendSms(["+1"], "Hi"), (err) => {
      assert.ok(err instanceof VendelQuotaError);
      assert.equal(err.limit, 100);
      assert.equal(err.available, 0);
      return true;
    });
  });
});
