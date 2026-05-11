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
        const priceMap: Record<string, number> = {};
        const chunkSize = 50;

        for (let i = 0; i < itemCodes.length; i += chunkSize) {
          const chunk = itemCodes.slice(i, i + chunkSize);
          const batchParams: Record<string, { itemCode: string }> = {};
          chunk.forEach((code, index) => {
            batchParams[index.toString()] = { itemCode: code };
          });

          const url = `${API_BASE}/` + `gameStat.getEquipmentAvgByCode,`.repeat(chunk.length).slice(0, -1) + "?batch=1";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batchParams),
          });

          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const json = await res.json();

          chunk.forEach((code, index) => {
            const result = json[index];
            if (result?.result?.data) {
              priceMap[code] = result.result.data;
            } else {
              priceMap[code] = 0;
            }
          });
        }

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
