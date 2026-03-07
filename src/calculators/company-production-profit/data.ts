import { useState, useEffect, useRef } from "react";
import type { GameData } from "./calculator";
import { API_BASE } from "../../lib/wareraApi";

const GAME_CONFIG_URL = API_BASE + "/gameConfig.getGameConfig";

export type StaticGameData = {
  rawPP: Record<string, number>;
  recipes: Record<string, { pp: number; inputs: Record<string, number> }>;
};

interface ApiItem {
  type: string;
  code: string;
  productionPoints?: number;
  productionNeeds?: Record<string, number>;
  isTradable?: boolean;
}

function parseItems(items: Record<string, ApiItem>): StaticGameData {
  const rawPP: Record<string, number> = {};
  const recipes: Record<string, { pp: number; inputs: Record<string, number> }> = {};

  for (const [code, item] of Object.entries(items)) {
    if (item.type === "raw" && item.productionPoints != null) {
      rawPP[code] = item.productionPoints;
    } else if (
      item.type === "product" &&
      item.productionPoints != null &&
      item.productionNeeds
    ) {
      recipes[code] = {
        pp: item.productionPoints,
        inputs: { ...item.productionNeeds },
      };
    }
  }

  return { rawPP, recipes };
}

function toGameData(staticData: StaticGameData): GameData {
  const prices: Record<string, number> = {};
  for (const code of Object.keys(staticData.rawPP)) prices[code] = 0;
  for (const code of Object.keys(staticData.recipes)) prices[code] = 0;
  return { prices, ...staticData };
}

export function useGameConfig() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchConfig() {
      try {
        const res = await fetch(GAME_CONFIG_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        const items: Record<string, ApiItem> = json?.result?.data?.items ?? {};
        const staticData = parseItems(items);
        if (mountedRef.current) {
          setData(toGameData(staticData));
        }
      } catch (e) {
        console.error("Failed to fetch game config:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchConfig();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading };
}
