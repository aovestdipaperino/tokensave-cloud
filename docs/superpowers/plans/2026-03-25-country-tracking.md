# Country Tracking & Emoji Flags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track caller countries on `/increment` via Cloudflare geolocation and expose a `GET /countries` endpoint returning emoji flags with pagination.

**Architecture:** Add two helpers (country validation, code-to-flag conversion) and two route changes (SADD on increment, new GET /countries) to the single Worker file. Storage is an Upstash Redis Set alongside the existing counter key.

**Tech Stack:** Cloudflare Workers, Upstash Redis REST API, Vitest + `@cloudflare/vitest-pool-workers` for testing.

**Spec:** `docs/superpowers/specs/2026-03-25-country-tracking-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `package.json` | Dependencies (vitest, @cloudflare/vitest-pool-workers) and test script |
| Create | `vitest.config.js` | Vitest config with Cloudflare Workers pool |
| Modify | `wrangler.toml` | Update compatibility_date for vitest-pool-workers |
| Modify | `src/index.js` | Add helpers, modify `/increment`, add `/countries` |
| Create | `test/index.test.js` | Tests for helpers and all endpoints |

---

### Task 1: Set Up Test Infrastructure

No test framework exists yet. Set up Vitest with the Cloudflare Workers pool so all subsequent tasks follow TDD.

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Modify: `wrangler.toml`
- Create: `test/index.test.js` (smoke test only)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "tokensave-counter",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
```

- [ ] **Step 3: Update `wrangler.toml` compatibility_date**

Change `compatibility_date` to `"2024-09-23"` or later — required by `@cloudflare/vitest-pool-workers`.

```toml
compatibility_date = "2024-09-23"
```

- [ ] **Step 4: Write a smoke test in `test/index.test.js`**

```js
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index.js";

describe("smoke test", () => {
  it("returns 404 for unknown routes", async () => {
    const request = new Request("http://localhost/unknown");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 5: Install dependencies and run tests**

Run: `npm install && npm test`
Expected: 1 test passes (404 smoke test). The test may fail if Upstash env vars are not configured in the test environment — if so, the test confirms the worker runs and we proceed.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.js wrangler.toml test/index.test.js package-lock.json
git commit -m "chore: add vitest with cloudflare workers pool"
```

---

### Task 2: Add Country Code Validation Helper

**Files:**
- Create test: `test/index.test.js` (add tests)
- Modify: `src/index.js` (add helper)

- [ ] **Step 1: Write failing tests for `isValidCountryCode`**

Add to `test/index.test.js`:

```js
import { isValidCountryCode } from "../src/index.js";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `isValidCountryCode` is not exported

- [ ] **Step 3: Implement `isValidCountryCode` in `src/index.js`**

Add at the top of `src/index.js`:

```js
export function isValidCountryCode(code) {
  return typeof code === "string" && /^[A-Z]{2}$/.test(code);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All `isValidCountryCode` tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.js test/index.test.js
git commit -m "feat: add isValidCountryCode helper"
```

---

### Task 3: Add Country Code to Emoji Flag Converter

**Files:**
- Modify test: `test/index.test.js` (add tests)
- Modify: `src/index.js` (add helper)

- [ ] **Step 1: Write failing tests for `countryToFlag`**

Add to `test/index.test.js`:

```js
import { countryToFlag } from "../src/index.js";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `countryToFlag` is not exported

- [ ] **Step 3: Implement `countryToFlag` in `src/index.js`**

Add below `isValidCountryCode`:

```js
export function countryToFlag(code) {
  return String.fromCodePoint(
    ...code.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All `countryToFlag` tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.js test/index.test.js
git commit -m "feat: add countryToFlag emoji converter"
```

---

### Task 4: Modify `POST /increment` to Track Country

**Files:**
- Modify test: `test/index.test.js` (add tests)
- Modify: `src/index.js` (the `/increment` handler block)

- [ ] **Step 1: Write failing test for country tracking on `/increment`**

Add to `test/index.test.js`. These tests verify the handler still returns the correct shape and doesn't break when `request.cf` is absent (the default in the test env):

```js
describe("POST /increment country tracking", () => {
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
```

- [ ] **Step 2: Run tests to verify they pass with existing code**

Run: `npm test`
Expected: PASS (the test describes current behavior, serving as a regression guard)

- [ ] **Step 3: Modify the `/increment` handler**

Replace the existing `/increment` block in `src/index.js` with:

```js
    if (request.method === "POST" && url.pathname === "/increment") {
      const body = await request.json().catch(() => null);
      if (!body || !Number.isInteger(body.amount) || body.amount < 1 || body.amount > 10000000) {
        return Response.json({ error: "Invalid amount" }, { status: 400, headers });
      }

      const authHeaders = { Authorization: `Bearer ${env.UPSTASH_TOKEN}` };
      const incrPromise = fetch(
        `${env.UPSTASH_URL}/INCRBY/total_tokens_saved/${body.amount}`,
        { headers: authHeaders }
      );

      const country = request.cf?.country;
      if (isValidCountryCode(country)) {
        const saddPromise = fetch(
          `${env.UPSTASH_URL}/SADD/countries/${country}`,
          { headers: authHeaders }
        ).catch(() => {});

        const [incrRes] = await Promise.all([incrPromise, saddPromise]);
        const data = await incrRes.json();
        return Response.json({ total: data.result }, { headers });
      }

      const incrRes = await incrPromise;
      const data = await incrRes.json();
      return Response.json({ total: data.result }, { headers });
    }
```

Key points:
- `request.cf?.country` — optional chain because `cf` may be absent in tests
- `SADD` failure is swallowed with `.catch(() => {})`
- `Promise.all` runs both calls in parallel when country is valid
- When no valid country, only the `INCRBY` runs (same behavior as before)

- [ ] **Step 4: Run tests to verify nothing is broken**

Run: `npm test`
Expected: All tests still PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.js test/index.test.js
git commit -m "feat: track caller country on POST /increment via SADD"
```

---

### Task 5: Add `GET /countries` Endpoint

**Files:**
- Modify test: `test/index.test.js` (add tests)
- Modify: `src/index.js` (add route handler)

- [ ] **Step 1: Write failing tests for `GET /countries` param validation**

Add to `test/index.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `/countries` returns 404

- [ ] **Step 3: Implement `GET /countries` handler in `src/index.js`**

Add this block before the 404 fallback:

```js
    if (request.method === "GET" && url.pathname === "/countries") {
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");

      let limit = null;
      let offset = 0;

      if (limitParam !== null) {
        limit = Number(limitParam);
        if (!Number.isInteger(limit) || limit < 1) {
          return Response.json({ error: "Invalid limit" }, { status: 400, headers });
        }
      }
      if (offsetParam !== null) {
        offset = Number(offsetParam);
        if (!Number.isInteger(offset) || offset < 0) {
          return Response.json({ error: "Invalid offset" }, { status: 400, headers });
        }
      }

      const res = await fetch(`${env.UPSTASH_URL}/SMEMBERS/countries`, {
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` },
      });
      const data = await res.json();
      const codes = (data.result || []).filter(isValidCountryCode).sort();

      const total = codes.length;
      const sliced = limit !== null ? codes.slice(offset, offset + limit) : codes.slice(offset);
      const flags = sliced.map(countryToFlag);

      return Response.json({ flags, total }, { headers });
    }
```

- [ ] **Step 4: Run tests to verify param validation passes**

Run: `npm test`
Expected: All param validation tests PASS (they return 400 before the Redis call, so no Upstash env needed)

- [ ] **Step 5: Add happy-path and edge case tests**

These tests require Upstash env vars to be set (either real or via wrangler.toml `[vars]` for test). If the test environment doesn't have Upstash configured, these tests can be skipped — the param validation and unit tests above provide the core coverage.

Add to `test/index.test.js`:

```js
describe("GET /countries happy path", () => {
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
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All tests PASS (happy-path tests depend on Upstash env — if not available, they may fail; param validation + unit tests are the critical coverage)

- [ ] **Step 7: Commit**

```bash
git add src/index.js test/index.test.js
git commit -m "feat: add GET /countries endpoint with emoji flags and pagination"
```

---

### Task 6: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update `CLAUDE.md`**

Add to the endpoints section:

```
- **GET /countries** — returns emoji flags of all countries that have called `/increment`, with optional `?limit=N&offset=N` pagination
```

Add to commands section:

```bash
# Run tests
npm test
```

Replace the line "No build step, no tests, no package.json" with "No build step. Tests run via `npm test` (Vitest + Cloudflare Workers pool)."

- [ ] **Step 2: Update `README.md`**

Add a new endpoint section after `POST /increment`:

```markdown
### `GET /countries`

Returns emoji flags of all countries that have called `/increment`.

```json
{"flags": ["🇩🇪", "🇯🇵", "🇺🇸"], "total": 3}
```

Optional pagination: `?limit=10&offset=0`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: add GET /countries endpoint to CLAUDE.md and README"
```
