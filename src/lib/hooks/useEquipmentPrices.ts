import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../api/warera";

export interface EquipmentPrice {
  code: string;
  avgPrice: number;
}

export function useEquipmentPrices(itemCodes: string[]) {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (itemCodes.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchPrices() {
      try {
        const batchParams: Record<string, { itemCode: string }> = {};
        itemCodes.forEach((code, index) => {
          batchParams[index.toString()] = { itemCode: code };
        });

        const url = `${API_BASE}/` + `gameStat.getEquipmentAvgByCode,`.repeat(itemCodes.length).slice(0, -1) + "?batch=1";
        const res = await fetch(url, {
          method: "POST", // The batch API usually uses GET or POST, but based on sketch.md it's a batch=1 query. However, TRPC batch usually sends parameters.
          // Re-reading sketch.md: it uses a query string with batch=1 but the data is in the body or params?
          // Sketch says: --data-raw '{"0":{"itemCode":"tank"},...}' which implies POST.
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batchParams),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();

        const priceMap: Record<string, number> = {};
        itemCodes.forEach((code, index) => {
          // Response structure from sketch: [{"result":{"data":54.78}}, ...]
          const result = json[index];
          if (result?.result?.data) {
            priceMap[code] = result.result.data;
          } else {
            priceMap[code] = 0;
          }
        });

        if (mountedRef.current) {
          setData(priceMap);
        }
      } catch (e) {
        console.error("Failed to fetch equipment prices:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchPrices();
    return () => {
      mountedRef.current = false;
    };
  }, [itemCodes.join(",")]);

  return { data, loading };
}
