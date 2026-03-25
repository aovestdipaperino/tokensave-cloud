import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker from "../src/index.js";
import { isValidCountryCode, countryToFlag } from "../src/index.js";

describe("smoke test", () => {
  it("returns 404 for unknown routes", async () => {
    const request = new Request("http://localhost/unknown");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });
});

describe("isValidCountryCode", () => {
  it("accepts valid 2-letter uppercase codes", () => {
    expect(isValidCountryCode("US")).toBe(true);
    expect(isValidCountryCode("DE")).toBe(true);
    expect(isValidCountryCode("JP")).toBe(true);
  });

  it("rejects Tor exit node code", () => {
    expect(isValidCountryCode("T1")).toBe(false);
  });

  it("rejects lowercase, empty, and wrong-length strings", () => {
    expect(isValidCountryCode("us")).toBe(false);
    expect(isValidCountryCode("")).toBe(false);
    expect(isValidCountryCode("USA")).toBe(false);
    expect(isValidCountryCode("A")).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isValidCountryCode(null)).toBe(false);
    expect(isValidCountryCode(undefined)).toBe(false);
  });
});

describe("countryToFlag", () => {
  it("converts US to flag emoji", () => {
    expect(countryToFlag("US")).toBe("🇺🇸");
  });

  it("converts DE to flag emoji", () => {
    expect(countryToFlag("DE")).toBe("🇩🇪");
  });

  it("converts JP to flag emoji", () => {
    expect(countryToFlag("JP")).toBe("🇯🇵");
  });
});

describe("GET /countries", () => {
  it("returns 400 for non-integer limit", async () => {
    const request = new Request("http://localhost/countries?limit=abc");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });

  it("returns 400 for negative offset", async () => {
    const request = new Request("http://localhost/countries?offset=-1");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });

  it("returns 400 for limit=0", async () => {
    const request = new Request("http://localhost/countries?limit=0");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });
});

describe("GET /countries happy path", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ result: 42 }), { status: 200 }))
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns flags array and total", async () => {
    const request = new Request("http://localhost/countries");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("flags");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.flags)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  it("returns empty flags when offset exceeds total", async () => {
    const request = new Request("http://localhost/countries?offset=9999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.flags).toEqual([]);
    expect(typeof data.total).toBe("number");
  });
});

describe("POST /increment country tracking", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ result: 42 }), { status: 200 }))
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("still returns total when cf.country is absent", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1 }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("total");
  });
});
