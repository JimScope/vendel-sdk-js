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

describe("listDevices", () => {
  it("calls /api/devices with no query when no opts", async () => {
    mockFetch(200, { items: [], page: 1, per_page: 50, total_items: 0, total_pages: 0 });
    const client = newClient();
    await client.listDevices();
    assert.equal(fetchCalls[0].url, "https://api.test.com/api/devices");
    assert.equal(fetchCalls[0].opts.headers["X-API-Key"], "vk_test");
  });

  it("maps camelCase opts to snake_case query params", async () => {
    mockFetch(200, { items: [], page: 2, per_page: 10, total_items: 0, total_pages: 0 });
    const client = newClient();
    await client.listDevices({ page: 2, perPage: 10, deviceType: "android" });
    const url = new URL(fetchCalls[0].url);
    assert.equal(url.pathname, "/api/devices");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("per_page"), "10");
    assert.equal(url.searchParams.get("device_type"), "android");
    assert.equal(url.searchParams.get("perPage"), null);
    assert.equal(url.searchParams.get("deviceType"), null);
  });

  it("drops undefined params", async () => {
    mockFetch(200, { items: [], page: 1, per_page: 50, total_items: 0, total_pages: 0 });
    const client = newClient();
    await client.listDevices({ page: 1, perPage: undefined, deviceType: undefined });
    const url = new URL(fetchCalls[0].url);
    assert.equal(url.searchParams.get("page"), "1");
    assert.equal(url.searchParams.has("per_page"), false);
    assert.equal(url.searchParams.has("device_type"), false);
  });

  it("returns paginated devices", async () => {
    mockFetch(200, {
      items: [
        { id: "d1", name: "Pixel", device_type: "android", phone_number: "+1", created: "c", updated: "u" },
      ],
      page: 1,
      per_page: 50,
      total_items: 1,
      total_pages: 1,
    });
    const client = newClient();
    const resp = await client.listDevices();
    assert.equal(resp.items.length, 1);
    assert.equal(resp.items[0].device_type, "android");
    assert.equal(resp.total_items, 1);
  });
});

describe("listMessages", () => {
  it("calls /api/sms/messages with no query when no opts", async () => {
    mockFetch(200, { items: [], page: 1, per_page: 50, total_items: 0, total_pages: 0 });
    const client = newClient();
    await client.listMessages();
    assert.equal(fetchCalls[0].url, "https://api.test.com/api/sms/messages");
  });

  it("maps camelCase opts to snake_case query params", async () => {
    mockFetch(200, { items: [], page: 1, per_page: 25, total_items: 0, total_pages: 0 });
    const client = newClient();
    await client.listMessages({
      page: 3,
      perPage: 25,
      status: "delivered",
      deviceId: "dev_1",
      batchId: "b_1",
      recipient: "+15550000",
      from: "2026-04-01T00:00:00Z",
      to: "2026-04-29T23:59:59Z",
    });
    const url = new URL(fetchCalls[0].url);
    assert.equal(url.pathname, "/api/sms/messages");
    assert.equal(url.searchParams.get("page"), "3");
    assert.equal(url.searchParams.get("per_page"), "25");
    assert.equal(url.searchParams.get("status"), "delivered");
    assert.equal(url.searchParams.get("device_id"), "dev_1");
    assert.equal(url.searchParams.get("batch_id"), "b_1");
    assert.equal(url.searchParams.get("recipient"), "+15550000");
    assert.equal(url.searchParams.get("from"), "2026-04-01T00:00:00Z");
    assert.equal(url.searchParams.get("to"), "2026-04-29T23:59:59Z");
    assert.equal(url.searchParams.get("perPage"), null);
    assert.equal(url.searchParams.get("deviceId"), null);
    assert.equal(url.searchParams.get("batchId"), null);
  });

  it("drops undefined params", async () => {
    mockFetch(200, { items: [], page: 1, per_page: 50, total_items: 0, total_pages: 0 });
    const client = newClient();
    await client.listMessages({ status: "queued", deviceId: undefined, batchId: undefined });
    const url = new URL(fetchCalls[0].url);
    assert.equal(url.searchParams.get("status"), "queued");
    assert.equal(url.searchParams.has("device_id"), false);
    assert.equal(url.searchParams.has("batch_id"), false);
    assert.equal(url.searchParams.has("recipient"), false);
    assert.equal(url.searchParams.has("from"), false);
    assert.equal(url.searchParams.has("to"), false);
  });

  it("returns paginated messages with new fields", async () => {
    mockFetch(200, {
      items: [
        {
          id: "m1",
          batch_id: "b1",
          recipient: "+1",
          from_number: "+9",
          body: "hi",
          status: "delivered",
          message_type: "sms",
          error_message: "",
          device_id: "d1",
          sent_at: "2026-04-29T10:00:00Z",
          delivered_at: "2026-04-29T10:00:01Z",
          created: "c",
          updated: "u",
        },
      ],
      page: 1,
      per_page: 50,
      total_items: 1,
      total_pages: 1,
    });
    const client = newClient();
    const resp = await client.listMessages();
    assert.equal(resp.items[0].from_number, "+9");
    assert.equal(resp.items[0].message_type, "sms");
    assert.equal(resp.items[0].sent_at, "2026-04-29T10:00:00Z");
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
