import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index.js";
import { isValidCountryCode } from "../src/index.js";

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
