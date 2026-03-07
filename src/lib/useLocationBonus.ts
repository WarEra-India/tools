import { useState, useEffect, useRef } from "react";

const COUNTRIES_URL = "https://api5.warera.io/trpc/country.getAllCountries";
const REGIONS_URL = "https://api5.warera.io/trpc/region.getRegionsObject";

export interface BestLocation {
  bonus: number;
  regionName: string;
  countryName: string;
}

export interface RegionInfo {
  name: string;
  countryName: string;
  depositType: string | null;
  bonus: number;
}

export interface LocationBonus {
  /** deposit type (raw material) → best total bonus percent */
  bonusByType: Record<string, number>;
  /** deposit type → best region/country info */
  bestByType: Record<string, BestLocation>;
  /** region ID → region info (for looking up a company's current region) */
  regionById: Record<string, RegionInfo>;
}

interface CountryData {
  _id: string;
  name: string;
  strategicResources?: {
    bonuses?: {
      productionPercent?: number;
    };
  };
}

interface RegionData {
  _id: string;
  name: string;
  country: string;
  deposit?: {
    type: string;
    bonusPercent: number;
  } | null;
}

export function useLocationBonus() {
  const [data, setData] = useState<LocationBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchData() {
      try {
        const [countriesRes, regionsRes] = await Promise.all([
          fetch(COUNTRIES_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
          fetch(REGIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
        ]);

        if (!countriesRes.ok || !regionsRes.ok) throw new Error("API error");

        const countriesJson = await countriesRes.json();
        const regionsJson = await regionsRes.json();

        const countries: CountryData[] = countriesJson?.result?.data ?? [];
        const regionsObj: Record<string, RegionData> =
          regionsJson?.result?.data ?? {};

        // Build country ID → strategic production bonus & name
        const countryBonus: Record<string, number> = {};
        const countryName: Record<string, string> = {};
        for (const c of countries) {
          countryBonus[c._id] =
            c.strategicResources?.bonuses?.productionPercent ?? 0;
          countryName[c._id] = c.name;
        }

        // Build region lookup and find best per deposit type
        const bonusByType: Record<string, number> = {};
        const bestByType: Record<string, BestLocation> = {};
        const regionById: Record<string, RegionInfo> = {};
        for (const r of Object.values(regionsObj)) {
          const depositType = r.deposit?.type ?? null;
          const regionBonus = r.deposit?.bonusPercent ?? 0;
          const stratBonus = countryBonus[r.country] ?? 0;
          const total = regionBonus + stratBonus;

          regionById[r._id] = {
            name: r.name,
            countryName: countryName[r.country] ?? "Unknown",
            depositType,
            bonus: total,
          };

          if (!depositType) continue;
          if (total > (bonusByType[depositType] ?? 0)) {
            bonusByType[depositType] = total;
            bestByType[depositType] = {
              bonus: total,
              regionName: r.name,
              countryName: countryName[r.country] ?? "Unknown",
            };
          }
        }

        if (mountedRef.current) {
          setData({ bonusByType, bestByType, regionById });
        }
      } catch (e) {
        console.error("Failed to fetch location bonus data:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading };
}
