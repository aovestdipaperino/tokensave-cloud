export function isValidCountryCode(code) {
  return typeof code === "string" && /^[A-Z]{2}$/.test(code);
}

export function countryToFlag(code) {
  return String.fromCodePoint(
    ...code.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = { "Content-Type": "application/json" };

    if (request.method === "GET" && url.pathname === "/total") {
      const res = await fetch(`${env.UPSTASH_URL}/GET/total_tokens_saved`, {
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` },
      });
      const data = await res.json();
      return Response.json({ total: parseInt(data.result || "0", 10) }, { headers });
    }

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

    if (request.method === "GET" && url.pathname === "/countries") {
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");

      let limit = null;
      let offset = 0;

      if (limitParam !== null) {
        if (!/^\d+$/.test(limitParam)) {
          return Response.json({ error: "Invalid limit" }, { status: 400, headers });
        }
        limit = Number(limitParam);
        if (limit < 1) {
          return Response.json({ error: "Invalid limit" }, { status: 400, headers });
        }
      }
      if (offsetParam !== null) {
        if (!/^\d+$/.test(offsetParam)) {
          return Response.json({ error: "Invalid offset" }, { status: 400, headers });
        }
        offset = Number(offsetParam);
      }

      const res = await fetch(`${env.UPSTASH_URL}/SMEMBERS/countries`, {
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}` },
      });
      const data = await res.json();
      const codes = (Array.isArray(data.result) ? data.result : []).filter(isValidCountryCode).sort();

      const total = codes.length;
      const sliced = limit !== null ? codes.slice(offset, offset + limit) : codes.slice(offset);
      const flags = sliced.map(countryToFlag);

      return Response.json({ flags, total }, { headers });
    }

    return Response.json({ error: "Not found" }, { status: 404, headers });
  },
};
