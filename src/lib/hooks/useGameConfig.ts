import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../api/warera";

const GAME_CONFIG_URL = API_BASE + "/gameConfig.getGameConfig";

export interface GameData {
  prices: Record<string, number>;
  rawPP: Record<string, number>;
  recipes: Record<string, { pp: number; inputs: Record<string, number> }>;
  /** deposit type → best bonus percent (e.g. 35 means +35% PP) */
  locationBonus?: Record<string, number>;
  equipments: EquipmentData[];
}

export interface ProfitRow {
  item: string;
  type: "Raw" | "Processed";
  sell: number;
  cost: number;
  profit: number;
  bonusAmount: number;
  pp: number;
  basePP: number;
  bonusPct: number;
  profitPP: number;
  inputs?: Record<string, number>;
}

export type StaticGameData = {
  rawPP: Record<string, number>;
  recipes: Record<string, { pp: number; inputs: Record<string, number> }>;
};

export type EquipmentData = {
  type: "equipment" | "weapon";
  code: string;
  usage: string;
  skinSlot: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  iconImg: string;
  dynamicStats: {
    armor?: [number, number];
    criticalDamages?: [number, number];
    dodge?: [number, number];
    precision?: [number, number];
    attack?: [number, number];
    criticalChance?: [number, number];
  };
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

function parseEquipments(items: Record<string, any>): EquipmentData[] {
  const equipments: EquipmentData[] = [];
  for (const [code, item] of Object.entries(items)) {
    if (item.type === "equipment" || item.type === "weapon") {
      equipments.push(item)
    }
  }
  return equipments;
}

function toGameData(staticData: StaticGameData, equipments: EquipmentData[]): GameData {
  const prices: Record<string, number> = {};
  for (const code of Object.keys(staticData.rawPP)) prices[code] = 0;
  for (const code of Object.keys(staticData.recipes)) prices[code] = 0;
  return { prices, ...staticData, equipments };
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
        const equipments = parseEquipments(items);
        if (mountedRef.current) {
          setData(toGameData(staticData, equipments));
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
