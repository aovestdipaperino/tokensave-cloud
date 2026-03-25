# tokensave-cloud

Cloudflare Worker that powers the worldwide token-saved counter for [tokensave](https://github.com/aovestdipaperino/tokensave).

## Architecture

```
tokensave CLI  -->  Cloudflare Worker  -->  Upstash Redis
                    (this repo)             (counter storage)
```

A single Cloudflare Worker proxies requests to an Upstash Redis instance. The Upstash credentials are stored as Cloudflare Worker secrets — never in code.

## Endpoints

### `GET /total`

Returns the current worldwide token count.

```json
{"total": 2847561}
```

### `POST /increment`

Increments the counter by the given amount (1–10,000,000).

```json
// Request
{"amount": 4823}

// Response
{"total": 2852384}
```

### `GET /countries`

Returns emoji flags of all countries that have called `/increment`.

```json
{"flags": ["🇩🇪", "🇯🇵", "🇺🇸"], "total": 3}
```

Optional pagination: `?limit=10&offset=0`

## Deploying

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
- [Upstash Redis database](https://console.upstash.com) (free tier)
- Node.js and npm

### Steps

1. **Install wrangler and authenticate:**

```bash
npm install -g wrangler
wrangler login
```

2. **Deploy the worker:**

```bash
wrangler deploy
```

3. **Set the Upstash secrets:**

```bash
wrangler secret put UPSTASH_URL    # paste your Upstash REST URL
wrangler secret put UPSTASH_TOKEN  # paste your Upstash REST token
```

4. **Verify:**

```bash
curl https://tokensave-counter.<your-subdomain>.workers.dev/total
# {"total":0}

curl -X POST https://tokensave-counter.<your-subdomain>.workers.dev/increment \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
# {"total":100}
```

### Rate limiting (recommended)

In the Cloudflare dashboard, add a rate limiting rule on the worker route: 10 requests/IP/minute.

## Cost

Both Cloudflare Workers and Upstash Redis have generous free tiers:

| Service | Free Tier |
|---|---|
| Cloudflare Workers | 100k requests/day |
| Upstash Redis | 10k commands/day |
