# Country Tracking & Emoji Flags API

## Summary

Track which countries invoke `POST /increment` using Cloudflare's built-in geolocation (`request.cf.country`) and store country codes in an Upstash Redis Set. Expose a new `GET /countries` endpoint that returns emoji flags with pagination support.

## Storage

- Redis key: `countries` (Set)
- On every `POST /increment`, run `SADD countries <country_code>` via `${env.UPSTASH_URL}/SADD/countries/${countryCode}` alongside the existing `INCRBY`
- Country codes are ISO 3166-1 alpha-2 (e.g. "US", "DE"), provided by `request.cf.country` at no extra cost
- Non-standard codes (e.g. "T1" for Tor exit nodes) are filtered out — only 2-letter codes where both characters are A-Z are stored

## New Endpoint: `GET /countries`

**Query params:**
- `limit` — optional, positive integer (>= 1). Omit to return all results.
- `offset` — optional, non-negative integer (>= 0). Defaults to `0`.

**Behavior:**
1. Fetch `SMEMBERS countries` from Redis
2. Sort codes alphabetically for stable pagination
3. Convert each code to an emoji flag via regional indicator symbol math: each letter maps to `0x1F1E6 + charCode - 65`
4. Slice by offset/limit
5. Return response

**Response:**
```json
{"flags": ["🇩🇪", "🇯🇵", "🇺🇸"], "total": 3}
```

`total` is always the full count regardless of pagination. If `offset >= total`, return `{"flags": [], "total": N}`.

**Errors:**
- `limit` or `offset` that is not a valid integer, is negative, or is zero (for `limit` only) → 400

## Changes to `POST /increment`

- One additional `SADD` call per request, run in parallel with `INCRBY` via `Promise.all`
- If `request.cf.country` is absent or not a valid A-Z two-letter code, skip the `SADD` silently
- If the `SADD` call itself fails, swallow the error — the increment response still succeeds (best-effort tracking)

## Auth & CORS

All endpoints are public, matching the existing design. No authentication or CORS changes.

## Approach Rationale

- Redis Set chosen over Sorted Set because max ~195 countries makes in-memory sort/slice trivial
- `SADD` is idempotent — no duplicates, no extra bookkeeping
- Cloudflare geolocation is free and automatic — no external service needed
- `Promise.all` for the two Redis calls minimizes added latency
