# Country Tracking & Emoji Flags API

## Summary

Track which countries invoke `POST /increment` using Cloudflare's built-in geolocation (`request.cf.country`) and store country codes in an Upstash Redis Set. Expose a new `GET /countries` endpoint that returns emoji flags with pagination support.

## Storage

- Redis key: `countries` (Set)
- On every `POST /increment`, run `SADD countries <country_code>` alongside the existing `INCRBY`
- Country codes are ISO 3166-1 alpha-2 (e.g. "US", "DE"), provided by `request.cf.country` at no extra cost

## New Endpoint: `GET /countries`

**Query params:** `?limit=N&offset=N` (both optional; omitting returns all results)

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

`total` is always the full count regardless of pagination.

**Errors:**
- Invalid `limit` or `offset` (non-integer, negative) returns 400

## Changes to `POST /increment`

- One additional `SADD` call per request
- If `request.cf.country` is absent (e.g. non-standard requests), skip the `SADD` silently — never fail the increment over a missing country

## Approach Rationale

- Redis Set chosen over Sorted Set because max ~195 countries makes in-memory sort/slice trivial
- `SADD` is idempotent — no duplicates, no extra bookkeeping
- Cloudflare geolocation is free and automatic — no external service needed
