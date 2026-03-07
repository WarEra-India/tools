import { useState, useEffect, useRef } from "react";

const API_URL = "https://api5.warera.io/trpc/itemTrading.getPrices";

export interface LivePrices {
  prices: Record<string, number>;
  timestamp: number;
}

export function useLivePrices(intervalMs = 30_000) {
  const [data, setData] = useState<LivePrices | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchPrices() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) throw new Error("Failed to fetch prices");
        const json = (await res.json()) as { result?: { data?: Record<string, number> } };
        const prices = json?.result?.data;
        if (!prices || typeof prices !== "object") throw new Error("Unexpected API shape");
        if (mountedRef.current) {
          setData({ prices, timestamp: Date.now() });
        }
      } catch (e) {
        console.error("Failed to fetch live prices:", e);
      } finally {
        fetchingRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    fetchPrices();
    const id = setInterval(fetchPrices, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { data, loading };
}
