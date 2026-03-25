# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cloudflare Worker that powers the worldwide token-saved counter for the [tokensave](https://github.com/aovestdipaperino/tokensave) CLI. A single worker (`src/index.js`) proxies REST endpoints to an Upstash Redis instance.

## Commands

```bash
# Local development
wrangler dev

# Deploy to Cloudflare
wrangler deploy

# Manage secrets (UPSTASH_URL, UPSTASH_TOKEN)
wrangler secret put <NAME>

# Run tests
npm test
```

No build step. Tests run via `npm test` (Vitest + Cloudflare Workers pool).

## Architecture

```
tokensave CLI  →  Cloudflare Worker (src/index.js)  →  Upstash Redis REST API
```

- **GET /total** — reads `total_tokens_saved` key from Redis
- **POST /increment** — `INCRBY total_tokens_saved <amount>` (1–10,000,000); also tracks caller country via `SADD`
- **GET /countries** — returns emoji flags of all countries that have called `/increment`, with optional `?limit=N&offset=N` pagination
- All other routes return 404

Upstash credentials (`UPSTASH_URL`, `UPSTASH_TOKEN`) are Cloudflare Worker secrets, never committed to code. The `wrangler.toml` `[vars]` section holds test-only placeholders; real values are set via `wrangler secret put`.
