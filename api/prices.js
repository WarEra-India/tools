const API_URL = "https://api5.warera.io/trpc/itemTrading.getPrices";

const CACHE_TTL = 30_000; // 30 seconds

let cached = null;
let cacheTime = 0;

async function fetchPrices() {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  if (!res.ok) throw new Error(`Warera API responded with ${res.status}`);

  const json = await res.json();
  const prices = json?.result?.data;
  if (!prices || typeof prices !== "object") {
    throw new Error("Unexpected API response shape");
  }
  return prices;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  if (req.method === "OPTIONS") return res.status(200).end();

  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) {
    return res.json(cached);
  }


  try {
    const prices = await fetchPrices();
    cached = { prices, timestamp: now };
    cacheTime = now;
    return res.json(cached);
  } catch (e) {
    if (cached) return res.json(cached); // serve stale on error
    return res.status(502).json({ error: e.message });
  }
}
